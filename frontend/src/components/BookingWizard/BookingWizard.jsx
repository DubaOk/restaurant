import { useState, useEffect, useCallback, useMemo } from 'react';
import { reservationsApi } from '../../api/reservations.api';
import { tablesApi } from '../../api/tables.api';
import TableFloorPlan, { pickStatus, canPreselectBookingTable } from '../TableFloorPlan/TableFloorPlan';
import DatePicker from '../DatePicker/DatePicker';
import TimePicker from '../TimePicker/TimePicker';
import styles from './BookingWizard.module.css';

const STEP_LABELS = ['Дата и время', 'Выбор столика', 'Подтверждение'];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function pluralGuests(n) {
  if (n === 1) return 'гость';
  if (n >= 2 && n <= 4) return 'гостя';
  return 'гостей';
}

function toMins(timeStr) {
  const [h, m] = (timeStr || '').split(':').map(Number);
  return h * 60 + (m || 0);
}

function validateSlot(date, time, openTime, closeTime) {
  if (!date || !time) return 'Выберите дату и время';
  const selected = new Date(`${date}T${time}`);
  if (isNaN(selected.getTime())) return 'Некорректная дата или время';
  if (selected <= new Date()) return 'Выберите будущее время';
  if (openTime && closeTime) {
    const sel = toMins(time);
    if (sel < toMins(openTime) || sel > toMins(closeTime)) {
      return `Ресторан работает с ${openTime} до ${closeTime}`;
    }
  }
  return null;
}

const unique = (arr) => [...new Set(arr)];

const listMergedCapacity = (tables) => {
  const joinsCount = Math.max(0, tables.length - 1);
  return tables.reduce((sum, t) => sum + (Number(t.capacity) || 0), 0) - (joinsCount * 2);
};

const listMergedMax = (tables) => {
  const joinsCount = Math.max(0, tables.length - 1);
  return tables.reduce((sum, t) => sum + (Number(t.maxCapacity) || Number(t.capacity) || 0), 0) - (joinsCount * 2);
};

const buildConnectedMergeCandidates = (tables) => {
  const byId = new Map(tables.map((t) => [t.id, t]));
  const candidates = [];
  const seen = new Set();

  const freeIds = tables
    .filter((t) => t.isAvailable && t.slotKnown && !t.occupiedForSlot)
    .map((t) => t.id);

  const expand = (seedId) => {
    const stack = [[seedId]];
    while (stack.length) {
      const group = stack.pop();
      const key = unique(group).sort((a, b) => a - b).join('-');
      if (seen.has(key)) continue;
      seen.add(key);

      if (group.length >= 2) {
        const groupTables = group.map((id) => byId.get(id)).filter(Boolean);
        candidates.push({
          tableIds: group,
          combinedCapacity: listMergedCapacity(groupTables),
          combinedMax: listMergedMax(groupTables),
        });
      }

      for (const id of group) {
        const table = byId.get(id);
        const neigh = Array.isArray(table?.adjacentTableIds) ? table.adjacentTableIds : [];
        for (const nId of neigh) {
          if (!freeIds.includes(nId)) continue;
          if (group.includes(nId)) continue;
          const next = unique([...group, nId]);
          // prevent huge combinations
          if (next.length <= 5) stack.push(next);
        }
      }
    }
  };

  for (const id of freeIds) expand(id);
  return candidates;
};

/** Priority algorithm: ideal → overflow → merge (supports 2+ tables) */
function findBestOption(tables, guests) {
  // 1) Ideal: free, capacity >= guests
  const ideal = tables
    .filter((t) => t.isAvailable && !t.occupiedForSlot && t.slotKnown && t.capacity >= guests)
    .sort((a, b) => a.capacity - b.capacity);
  if (ideal.length > 0) return { type: 'single', table: ideal[0] };

  // 2) Overflow: maxCapacity >= guests but capacity < guests
  const overflow = tables
    .filter(
      (t) =>
        t.isAvailable &&
        !t.occupiedForSlot &&
        t.slotKnown &&
        t.capacity < guests &&
        (t.maxCapacity || t.capacity) >= guests,
    )
    .sort((a, b) => (a.maxCapacity || a.capacity) - (b.maxCapacity || b.capacity));
  if (overflow.length > 0) return { type: 'overflow', table: overflow[0] };

  const mergeCandidates = buildConnectedMergeCandidates(tables);
  const merged = mergeCandidates
    .filter((c) => c.combinedCapacity >= guests)
    .sort((a, b) => a.combinedCapacity - b.combinedCapacity || a.tableIds.length - b.tableIds.length)[0];
  if (merged) return { type: 'merged', pair: merged };

  const mergedOverflow = mergeCandidates
    .filter((c) => (c.combinedMax || c.combinedCapacity) >= guests)
    .sort((a, b) => (a.combinedMax || a.combinedCapacity) - (b.combinedMax || b.combinedCapacity))[0];
  if (mergedOverflow) return { type: 'merged', pair: mergedOverflow };

  return null;
}

const BookingWizard = ({
  restaurantId,
  restaurantName,
  openTime,
  closeTime,
  hallSchema,
}) => {
  const [step, setStep] = useState(0);

  const [date, setDate]             = useState('');
  const [time, setTime]             = useState('19:00');
  const [guestsCount, setGuestsCount] = useState(2);

  const [tables, setTables]         = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [selectedMergedPair, setSelectedMergedPair] = useState(null); // {tableIds, combinedCapacity}
  const [suggestion, setSuggestion] = useState(null); // {type, table?} | {type:'merged', pair}

  const [comment, setComment]       = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState(false);

  const dateTimeStr = date && time ? `${date}T${time}` : '';

  const selectedTable = useMemo(
    () => tables.find((t) => t.id === selectedTableId) || null,
    [tables, selectedTableId],
  );

  const isOverflow = useMemo(
    () =>
      selectedTable &&
      !selectedMergedPair &&
      selectedTable.capacity < guestsCount &&
      (selectedTable.maxCapacity || selectedTable.capacity) >= guestsCount,
    [selectedTable, selectedMergedPair, guestsCount],
  );

  const mergedDisplayCapacity = useMemo(() => {
    if (!selectedMergedPair) return null;
    const base = Number(selectedMergedPair.combinedCapacity) || 0;
    const max = Number(selectedMergedPair.combinedMax) || base;
    // If current guests only fit with overflow buffer, show effective max.
    if (guestsCount > base && guestsCount <= max) return max;
    return base;
  }, [selectedMergedPair, guestsCount]);

  const mergedNeedsOverflow = useMemo(() => {
    if (!selectedMergedPair) return false;
    return guestsCount > (Number(selectedMergedPair.combinedCapacity) || 0);
  }, [selectedMergedPair, guestsCount]);

  // Re-run algorithm when tables / guests change
  useEffect(() => {
    if (tables.length === 0) return;
    const best = findBestOption(tables, guestsCount);
    setSuggestion(best);
    if (best?.type === 'single' || best?.type === 'overflow') {
      setSelectedTableId(best.table.id);
      setSelectedMergedPair(null);
    } else {
      // merged or null — clear single selection, show pair suggestion
      setSelectedTableId(null);
      setSelectedMergedPair(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables, guestsCount]);

  const step1Error = validateSlot(date, time, openTime, closeTime);
  const step1Valid = !step1Error && Boolean(date && time);

  const goToStep2 = useCallback(async () => {
    if (!step1Valid) return;
    setLoadingTables(true);
    setError('');
    try {
      const { data } = await tablesApi.getByRestaurant(restaurantId, {
        at: new Date(dateTimeStr).toISOString(),
      });
      setTables(data.data || []);
      setSelectedTableId(null);
      setSelectedMergedPair(null);
      setSuggestion(null);
      setStep(1);
    } catch {
      setTables([]);
      setStep(1);
    } finally {
      setLoadingTables(false);
    }
  }, [step1Valid, dateTimeStr, restaurantId]);

  const goToStep3 = () => {
    if (!selectedTableId && !selectedMergedPair) return;
    setStep(2);
    setError('');
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const tableId = selectedMergedPair
        ? selectedMergedPair.tableIds[0]
        : selectedTableId;
      const combinedWithTableId = selectedMergedPair
        ? selectedMergedPair.tableIds[1]
        : undefined;
      const combinedWithTableIds = selectedMergedPair
        ? selectedMergedPair.tableIds.slice(1)
        : undefined;
      await reservationsApi.create({
        restaurantId: parseInt(restaurantId, 10),
        tableId,
        ...(combinedWithTableId ? { combinedWithTableId } : {}),
        ...(combinedWithTableIds?.length ? { combinedWithTableIds } : {}),
        date: new Date(dateTimeStr).toISOString(),
        guestsCount,
        comment,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка бронирования');
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(0);
    setDate('');
    setTime('19:00');
    setGuestsCount(2);
    setTables([]);
    setSelectedTableId(null);
    setSelectedMergedPair(null);
    setSuggestion(null);
    setComment('');
    setError('');
    setSuccess(false);
    setLoading(false);
  };

  /* ── Success screen ──────────────────────────────────────────── */
  if (success) {
    return (
      <div className={styles.successScreen}>
        <div className={styles.successIcon}>✓</div>
        <h3 className={styles.successTitle}>Заявка отправлена!</h3>
        <p className={styles.successText}>
          Ресторан подтвердит бронирование в ближайшее время. Следите за статусом в разделе
          «Мои бронирования».
        </p>
        <button className={styles.btnOutline} onClick={reset}>Забронировать ещё</button>
      </div>
    );
  }

  /* ── Step bar ─────────────────────────────────────────────────── */
  return (
    <div className={styles.wizard}>
      <div className={styles.stepBar}>
        {STEP_LABELS.map((label, i) => (
          <div key={i} className={styles.stepItem}>
            <span className={`${styles.stepNum} ${i === step ? styles.stepNumActive : ''} ${i < step ? styles.stepNumDone : ''}`}>
              {i < step ? '✓' : i + 1}
            </span>
            <span className={`${styles.stepLabel} ${i === step ? styles.stepLabelActive : ''} ${i < step ? styles.stepLabelDone : ''}`}>
              {label}
            </span>
            {i < STEP_LABELS.length - 1 && <span className={styles.stepConnector} />}
          </div>
        ))}
      </div>

      {/* ── Step 0: date, time, guests ─────────────────────────── */}
      {step === 0 && (
        <div className={styles.stepContent}>
          <h3 className={styles.stepTitle}>Когда вас ждать?</h3>

          <div className={styles.dateTimeRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Дата</label>
              <DatePicker
                value={date}
                min={todayISO()}
                onChange={(iso) => { setDate(iso); setError(''); }}
                placeholder="Выберите дату"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Время</label>
              <TimePicker
                value={time}
                onChange={(t) => { setTime(t); setError(''); }}
                openTime={openTime}
                closeTime={closeTime}
                placeholder="Выберите время"
                popupAlign="end"
              />
              {openTime && closeTime && (
                <span className={styles.timeHint}>Работает: {openTime} – {closeTime}</span>
              )}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Количество гостей</label>
            <div className={styles.guestCounter}>
              <button type="button" className={styles.counterBtn}
                onClick={() => setGuestsCount((g) => Math.max(1, g - 1))} aria-label="Меньше">−</button>
              <span className={styles.counterValue}>{guestsCount}</span>
              <button type="button" className={styles.counterBtn}
                onClick={() => setGuestsCount((g) => Math.min(20, g + 1))} aria-label="Больше">+</button>
              <span className={styles.counterHint}>{pluralGuests(guestsCount)}</span>
            </div>
          </div>

          {/* Inline validation hint */}
          {date && time && step1Error && (
            <p className={styles.validationHint}>{step1Error}</p>
          )}
          {error && <p className={styles.error}>{error}</p>}

          <button
            type="button"
            className={styles.btnPrimary}
            disabled={!step1Valid || loadingTables}
            onClick={goToStep2}
          >
            {loadingTables ? 'Загрузка столов…' : 'Посмотреть доступные столики →'}
          </button>
        </div>
      )}

      {/* ── Step 1: table selection ────────────────────────────── */}
      {step === 1 && (
        <div className={styles.stepContent}>
          <h3 className={styles.stepTitle}>Выберите столик</h3>
          <p className={styles.stepHint}>
            {new Date(dateTimeStr).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })}
            {' · '}{guestsCount} {pluralGuests(guestsCount)}
          </p>

          {/* Merge suggestion banner */}
          {suggestion?.type === 'merged' && !selectedMergedPair && (
            <div className={styles.mergeSuggestion}>
              <span className={styles.mergeSuggestionIcon}>⟺</span>
              <span className={styles.mergeSuggestionText}>
                Для {guestsCount} гостей рекомендуем объединить столы&nbsp;
                {suggestion.pair.tableIds.map((id) => {
                  const t = tables.find((x) => x.id === id);
                  return t ? `№${t.number}` : `#${id}`;
                }).join(' и ')}&nbsp;
                — получится <strong>
                  {guestsCount > suggestion.pair.combinedCapacity
                    ? (suggestion.pair.combinedMax || suggestion.pair.combinedCapacity)
                    : suggestion.pair.combinedCapacity} мест
                </strong>
                {guestsCount > suggestion.pair.combinedCapacity && (
                  <> (с дополнительными местами)</>
                )}
              </span>
              <button
                type="button"
                className={styles.mergeSuggestionBtn}
                onClick={() => setSelectedMergedPair(suggestion.pair)}
              >
                Объединить
              </button>
            </div>
          )}

          {/* Overflow warning */}
          {isOverflow && (
            <div className={styles.overflowWarning}>
              ⚠ Столик рассчитан на {selectedTable.capacity} гостей, но мы можем добавить дополнительное место
              — будет чуть теснее
            </div>
          )}

          {tables.length === 0 ? (
            <p className={styles.noTables}>
              У ресторана пока нет столиков в системе — обратитесь к администрации заведения.
            </p>
          ) : (
            <div className={styles.floorWrap}>
              <TableFloorPlan
                tables={tables}
                guestsCount={guestsCount}
                selectedTableId={selectedMergedPair ? null : selectedTableId}
                onSelectTable={(id) => {
                  setSelectedTableId(id);
                  setSelectedMergedPair(null);
                }}
                hallSchema={hallSchema}
                staticMode
                bookingStretch
                suggestedPairIds={!selectedMergedPair && suggestion?.type === 'merged' ? suggestion.pair.tableIds : null}
                selectedMergedIds={selectedMergedPair ? selectedMergedPair.tableIds : null}
                mergedCapacity={mergedDisplayCapacity}
                onSelectMergedPair={
                  suggestion?.type === 'merged' && !selectedMergedPair
                    ? () => setSelectedMergedPair(suggestion.pair)
                    : null
                }
              />
            </div>
          )}

          {/* Selection status row */}
          {selectedMergedPair ? (
            <div className={styles.selectionRow}>
              <span className={`${styles.selectionBadge} ${styles.selectionBadgeMerge}`}>
                ⟺ Столы объединены · {mergedDisplayCapacity} мест
              </span>
              {mergedNeedsOverflow && (
                <span className={styles.conflictBadge}>С доп. местами, будет чуть теснее</span>
              )}
              <button
                type="button"
                className={styles.mergeCancelBtn}
                onClick={() => setSelectedMergedPair(null)}
              >
                Отменить объединение
              </button>
            </div>
          ) : selectedTable ? (
            <div className={styles.selectionRow}>
              <span className={styles.selectionBadge}>
                Стол №{selectedTable.number} · до {selectedTable.capacity} мест
              </span>
              {pickStatus(selectedTable, guestsCount) === 'booked' && (
                <span className={styles.conflictBadge}>На это время занят — выберите другой</span>
              )}
            </div>
          ) : null}

          <div className={styles.navRow}>
            <button type="button" className={styles.btnBack} onClick={() => setStep(0)}>← Назад</button>
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={
                (!selectedTableId && !selectedMergedPair) ||
                (selectedTable && pickStatus(selectedTable, guestsCount) === 'booked')
              }
              onClick={goToStep3}
            >
              Далее →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: confirmation ───────────────────────────────── */}
      {step === 2 && (
        <div className={styles.stepContent}>
          <h3 className={styles.stepTitle}>Подтверждение</h3>

          <div className={styles.summary}>
            {restaurantName && <p className={styles.summaryRestaurant}>{restaurantName}</p>}
            <div className={styles.summaryGrid}>
              <span className={styles.summaryLabel}>Дата и время</span>
              <span className={styles.summaryValue}>
                {new Date(dateTimeStr).toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' })}
              </span>
              <span className={styles.summaryLabel}>Гостей</span>
              <span className={styles.summaryValue}>{guestsCount} {pluralGuests(guestsCount)}</span>
              <span className={styles.summaryLabel}>Столик</span>
              <span className={styles.summaryValue}>
                {selectedMergedPair
                  ? `Объединённые столы · ${mergedDisplayCapacity} мест`
                  : `№${selectedTable?.number} · до ${isOverflow ? (selectedTable?.maxCapacity || selectedTable?.capacity) : selectedTable?.capacity} мест`
                }
              </span>
              {mergedNeedsOverflow && (
                <>
                  <span className={styles.summaryLabel} />
                  <span className={`${styles.summaryValue} ${styles.summaryOverflowNote}`}>
                    ⚠ Для этой компании используются дополнительные места
                  </span>
                </>
              )}
              {isOverflow && (
                <>
                  <span className={styles.summaryLabel} />
                  <span className={`${styles.summaryValue} ${styles.summaryOverflowNote}`}>
                    ⚠ Добавим дополнительное место — немного теснее обычного
                  </span>
                </>
              )}
            </div>

            <p className={styles.summaryNote}>
              После подтверждения рестораном вы получите уведомление о статусе бронирования.
            </p>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Комментарий (необязательно)</label>
            <textarea
              className={styles.textarea}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Особые пожелания, аллергии, повод…"
              rows={3}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.navRow}>
            <button type="button" className={styles.btnBack} onClick={() => setStep(1)}>← Назад</button>
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading ? 'Отправка…' : 'Забронировать'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingWizard;
