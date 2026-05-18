import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useValidationTooltip } from '../../hooks/useValidationTooltip';
import { reservationsApi } from '../../api/reservations.api';
import { tablesApi } from '../../api/tables.api';
import TableFloorPlan, { pickStatus } from '../TableFloorPlan/TableFloorPlan';
import DatePicker from '../DatePicker/DatePicker';
import TimePicker from '../TimePicker/TimePicker';
import styles from './BookingWizard.module.css';

const STEP_LABELS = ['Дата и время', 'Выбор столика', 'Подтверждение'];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function maxBookingISO(daysAhead = 90) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatBookingPreview(dateIso, timeStr) {
  if (!dateIso || !timeStr) return null;
  const dt = new Date(`${dateIso}T${timeStr}`);
  if (Number.isNaN(dt.getTime())) return null;
  const datePart = dt.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const timePart = dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return { datePart, timePart, full: `${datePart}, ${timePart}` };
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

/** Если свободных мест у одного стола не больше этого — объединение не предлагаем (хватает «ровного» стола) */
const MAX_SPARE_SEATS_FOR_OBVIOUS_SINGLE = 2;

/** С этого числа гостей показываем объединение как альтернативу просторному одному столу (оба варианта на выбор) */
const MERGE_AS_ALT_FROM_GUESTS = 6;

const listMergedCapacity = (groupTables) =>
  groupTables.reduce((sum, t) => sum + (Number(t.capacity) || 0), 0);

const listMergedMax = (groupTables) =>
  groupTables.reduce((sum, t) => sum + (Number(t.maxCapacity) || Number(t.capacity) || 0), 0);

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
          if (next.length <= 8) stack.push(next);
        }
      }
    }
  };

  for (const id of freeIds) expand(id);
  return candidates;
};

function sortMergeOptionsForGuests(a, b, guests) {
  const g = Number(guests) || 0;
  const capA = a.combinedCapacity;
  const capB = b.combinedCapacity;
  const fitsNomA = capA >= g;
  const fitsNomB = capB >= g;
  if (fitsNomA !== fitsNomB) return fitsNomA ? -1 : 1;
  if (capA !== capB) return capA - capB;
  if (a.tableIds.length !== b.tableIds.length) return a.tableIds.length - b.tableIds.length;
  return Math.min(...a.tableIds) - Math.min(...b.tableIds);
}

function isProperSubsetIds(subIds, superIds) {
  const sub = unique(subIds);
  const sup = unique(superIds);
  if (sub.length >= sup.length) return false;
  const setSup = new Set(sup);
  return sub.every((id) => setSup.has(id));
}

/** Оставить только «минимальные» группы: не показывать 2+3+4+5, если уже хватает 2+3 */
function filterMinimalMergeGroups(candidates) {
  return candidates.filter((c) => {
    return !candidates.some(
      (other) => other !== c && isProperSubsetIds(other.tableIds, c.tableIds),
    );
  });
}

function listMergeOptionsThatFit(tables, guests) {
  const g = Number(guests) || 0;
  const byId = new Map(tables.map((t) => [t.id, t]));
  const raw = buildConnectedMergeCandidates(tables);
  const ok = raw.filter((c) => (c.combinedMax ?? c.combinedCapacity) >= g);
  const minimal = filterMinimalMergeGroups(ok).filter(
    (c) => c.tableIds.length >= 2 && !mergeGroupHasRedundantStandalone(c.tableIds, byId, g),
  );
  minimal.sort((a, b) => sortMergeOptionsForGuests(a, b, g));
  const seen = new Set();
  const out = [];
  for (const c of minimal) {
    const key = unique(c.tableIds)
      .sort((x, y) => x - y)
      .join('-');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

const nominalPartySlack = (guests) =>
  guests >= 4 ? Math.max(4, Math.ceil(guests * 0.85)) : Math.max(2, Math.ceil(guests / 2));

/** Не предлагать одиночный стол, если номинальная вместимость сильно больше числа гостей */
const nominalPartyReasonable = (guests, nominalCap) => {
  const g = Number(guests) || 0;
  const cap = Number(nominalCap) || 0;
  if (!g || !cap) return true;
  if (g > cap) return true;
  return cap - g <= nominalPartySlack(g);
};

/** Не предлагать объединение, если один из столов уже подходит под состав как отдельная бронь */
function mergeGroupHasRedundantStandalone(tableIds, tablesById, guests) {
  const g = Number(guests) || 0;
  return tableIds.some((id) => {
    const t = tablesById.get(id);
    if (!t || !t.isAvailable || !t.slotKnown || t.occupiedForSlot) return false;
    const cap = Number(t.capacity) || 0;
    return cap >= g && nominalPartyReasonable(g, cap);
  });
}

/** Priority algorithm: ideal → overflow → merge (supports 2+ tables) */
function findBestOption(tables, guests) {
  // 1) Ideal: free, capacity >= guests
  const ideal = tables
    .filter(
      (t) =>
        t.isAvailable &&
        !t.occupiedForSlot &&
        t.slotKnown &&
        t.capacity >= guests &&
        nominalPartyReasonable(guests, t.capacity),
    )
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

  const mergeOpts = listMergeOptionsThatFit(tables, guests);
  if (mergeOpts.length > 0) return { type: 'merged', pair: mergeOpts[0] };

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

  const dateFieldRef = useRef(null);
  const timeFieldRef = useRef(null);
  const { showMessage, dismissMessage, ValidationTooltipPortal } = useValidationTooltip();

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
    /* На схеме и в сводке — «до» по сумме верхних мест, как у каждого стола */
    return max;
  }, [selectedMergedPair]);

  const mergedNeedsOverflow = useMemo(() => {
    if (!selectedMergedPair) return false;
    return guestsCount > (Number(selectedMergedPair.combinedCapacity) || 0);
  }, [selectedMergedPair, guestsCount]);

  const rawMergeFitOptions = useMemo(() => {
    if (tables.length === 0) return [];
    return listMergeOptionsThatFit(tables, guestsCount);
  }, [tables, guestsCount]);

  /** Варианты объединения: для небольших компаний не конкурируем с нормальным одиночным столом */
  const mergeFitOptions = useMemo(() => {
    if (rawMergeFitOptions.length === 0) return [];
    const g = guestsCount;

    if (g < MERGE_AS_ALT_FROM_GUESTS) {
      const hasNominalSingle = tables.some(
        (t) =>
          t.isAvailable &&
          !t.occupiedForSlot &&
          t.slotKnown &&
          t.capacity >= g &&
          nominalPartyReasonable(g, t.capacity),
      );
      if (hasNominalSingle) return [];
      return rawMergeFitOptions;
    }

    const hasObviousSingle = tables.some(
      (t) =>
        t.isAvailable &&
        !t.occupiedForSlot &&
        t.slotKnown &&
        t.capacity >= g &&
        nominalPartyReasonable(g, t.capacity) &&
        t.capacity - g <= MAX_SPARE_SEATS_FOR_OBVIOUS_SINGLE,
    );
    if (hasObviousSingle) return [];
    return rawMergeFitOptions;
  }, [tables, guestsCount, rawMergeFitOptions]);

  /** Показываем текст «большой стол или merge» (только режим «6+») */
  const mergeChoiceWithLargeSingle = useMemo(() => {
    if (guestsCount < MERGE_AS_ALT_FROM_GUESTS || mergeFitOptions.length === 0) return false;
    const g = guestsCount;
    return tables.some(
      (t) =>
        t.isAvailable &&
        !t.occupiedForSlot &&
        t.slotKnown &&
        t.capacity >= g &&
        nominalPartyReasonable(g, t.capacity) &&
        t.capacity - g > MAX_SPARE_SEATS_FOR_OBVIOUS_SINGLE,
    );
  }, [tables, guestsCount, mergeFitOptions.length]);

  const canPickSingleInsteadOfMerge = useMemo(() => {
    if (!selectedTable || selectedMergedPair) return false;
    const st = pickStatus(selectedTable, guestsCount);
    return ['free', 'overflow', 'unknown'].includes(st);
  }, [selectedTable, selectedMergedPair, guestsCount]);

  const blockNextForMergePick =
    mergeFitOptions.length >= 1 && !selectedMergedPair && !canPickSingleInsteadOfMerge;

  useEffect(() => {
    if (tables.length === 0) return;
    const best = findBestOption(tables, guestsCount);
    setSuggestion(best);

    if (best?.type === 'single' || best?.type === 'overflow') {
      if (mergeFitOptions.length >= 1 && guestsCount >= MERGE_AS_ALT_FROM_GUESTS) {
        setSelectedTableId(null);
        setSelectedMergedPair(null);
      } else {
        setSelectedTableId(best.table.id);
        setSelectedMergedPair(null);
      }
    } else if (mergeFitOptions.length === 1) {
      setSelectedTableId(null);
      setSelectedMergedPair(mergeFitOptions[0]);
    } else if (mergeFitOptions.length > 1) {
      setSelectedTableId(null);
      setSelectedMergedPair(null);
    } else {
      setSelectedTableId(null);
      setSelectedMergedPair(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables, guestsCount, mergeFitOptions]);

  const step1Error = validateSlot(date, time, openTime, closeTime);
  const step1Valid = !step1Error && Boolean(date && time);
  const bookingPreview = useMemo(() => formatBookingPreview(date, time), [date, time]);

  const validateStep1 = useCallback(() => {
    if (!date) {
      showMessage(dateFieldRef.current, 'Выберите дату.');
      return false;
    }
    if (!time) {
      showMessage(timeFieldRef.current, 'Выберите время.');
      return false;
    }
    if (step1Error) {
      showMessage(timeFieldRef.current, step1Error);
      return false;
    }
    return true;
  }, [date, time, step1Error, showMessage]);

  const goToStep2 = useCallback(async () => {
    if (!validateStep1()) return;
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
  }, [validateStep1, dateTimeStr, restaurantId]);

  useEffect(() => {
    if (step > 0) dismissMessage();
  }, [step, dismissMessage]);

  const goToStep3 = () => {
    if (!selectedTableId && !selectedMergedPair) return;
    if (mergeFitOptions.length >= 1 && !selectedMergedPair && !canPickSingleInsteadOfMerge) {
      setError(
        'Выберите: объединение соседних столов (кнопки или подсветка на схеме) или один большой стол на плане.',
      );
      return;
    }
    if (selectedTableId && !selectedMergedPair && selectedTable) {
      const st = pickStatus(selectedTable, guestsCount);
      if (st === 'oversized') {
        setError('Выберите стол ближе по размеру к числу гостей.');
        return;
      }
    }
    setStep(2);
    setError('');
  };

  const handleSubmit = async () => {
    setError('');
    dismissMessage();
    if (!date || !time) {
      setError('Укажите дату и время бронирования');
      return;
    }
    if (selectedTableId && !selectedMergedPair) {
      const t = tables.find((x) => x.id === selectedTableId);
      if (t && pickStatus(t, guestsCount) === 'oversized') {
        setError('Выберите стол ближе по размеру к числу гостей.');
        return;
      }
    }
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
    } finally {
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

          <div className={styles.scheduleCard}>
            <div className={styles.dateTimeRow}>
              <div className={styles.field} ref={dateFieldRef}>
              <label className={styles.fieldLabel}>Дата</label>
              <DatePicker
                value={date}
                min={todayISO()}
                max={maxBookingISO()}
                onChange={(iso) => { setDate(iso); setError(''); }}
                placeholder="Выберите дату"
                quickPicks
                showWeekday
              />
            </div>
            <div className={styles.field} ref={timeFieldRef}>
              <label className={styles.fieldLabel}>Время</label>
              <TimePicker
                value={time}
                selectedDate={date}
                onChange={(t) => { setTime(t); setError(''); }}
                openTime={openTime}
                closeTime={closeTime}
                placeholder="Выберите время"
                popupAlign="start"
              />
            </div>
            </div>
            {openTime && closeTime && (
              <p className={styles.scheduleMeta}>Часы работы: {openTime} – {closeTime}</p>
            )}
            {bookingPreview && (
              <div className={styles.schedulePreview} aria-live="polite">
                <span className={styles.schedulePreviewLabel}>Ваш визит</span>
                <span className={styles.schedulePreviewValue}>{bookingPreview.full}</span>
              </div>
            )}
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
          {error && <p className={styles.error}>{error}</p>}

          <button
            type="button"
            className={styles.btnPrimary}
            disabled={loadingTables}
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

          {(mergeFitOptions.length > 1 ||
            (mergeFitOptions.length === 1 && !selectedMergedPair)) && (
            <div className={styles.mergeSuggestion}>
              <span className={styles.mergeSuggestionIcon}>⟺</span>
              <div className={styles.mergeSuggestionBody}>
                <p className={styles.mergeSuggestionLead}>
                  {mergeChoiceWithLargeSingle
                    ? 'Можно сесть за один просторный стол или сдвинуть соседние — выберите вариант. Листайте объединения вправо.'
                    : mergeFitOptions.length > 1
                      ? 'Одного столика на ваш состав нет — сдвиньте соседние. Листайте варианты вправо.'
                      : 'Одного столика на ваш состав нет — выберите объединение ниже (подсвечено на схеме).'}
                </p>
                <div className={styles.mergeChipScroll} role="region" aria-label="Варианты объединения столов">
                  <div className={styles.mergeChipScrollInner}>
                  {mergeFitOptions.map((opt) => {
                    const key = unique(opt.tableIds)
                      .sort((a, b) => a - b)
                      .join('-');
                    const activeKey = selectedMergedPair
                      ? unique(selectedMergedPair.tableIds)
                          .sort((a, b) => a - b)
                          .join('-')
                      : '';
                    const active = key === activeKey;
                    const label = opt.tableIds.map((id) => {
                      const t = tables.find((x) => x.id === id);
                      return t ? `№${t.number}` : `#${id}`;
                    }).join(' · ');
                    const capMax = Number(opt.combinedMax) || Number(opt.combinedCapacity) || 0;
                    const capNom = Number(opt.combinedCapacity) || 0;
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`${styles.mergeChip} ${active ? styles.mergeChipActive : ''}`}
                        onClick={() => {
                          setSelectedMergedPair(opt);
                          setSelectedTableId(null);
                        }}
                      >
                        <span className={styles.mergeChipTitle}>{label}</span>
                        <span className={styles.mergeChipMeta}>
                          до {capMax} мест{capMax > capNom ? ' · с доп. стульями' : ''}
                        </span>
                      </button>
                    );
                  })}
                  </div>
                </div>
              </div>
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
                suggestedPairIds={
                  selectedMergedPair
                    ? null
                    : mergeFitOptions.length >= 1
                      ? mergeFitOptions[0].tableIds
                      : suggestion?.type === 'merged'
                        ? suggestion.pair.tableIds
                        : null
                }
                selectedMergedIds={selectedMergedPair ? selectedMergedPair.tableIds : null}
                mergedCapacity={mergedDisplayCapacity}
                onSelectMergedPair={
                  !selectedMergedPair && mergeFitOptions.length >= 1
                    ? () => {
                        setSelectedMergedPair(mergeFitOptions[0]);
                        setSelectedTableId(null);
                      }
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
              {mergeFitOptions.length !== 1 && (
              <button
                type="button"
                className={styles.mergeCancelBtn}
                onClick={() => setSelectedMergedPair(null)}
              >
                Отменить объединение
              </button>
              )}
            </div>
          ) : selectedTable ? (
            <div className={styles.selectionRow}>
              <span className={styles.selectionBadge}>
                Стол №{selectedTable.number} · до {selectedTable.capacity} мест
              </span>
              {pickStatus(selectedTable, guestsCount) === 'booked' && (
                <span className={styles.conflictBadge}>На это время занят — выберите другой</span>
              )}
              {pickStatus(selectedTable, guestsCount) === 'oversized' && (
                <span className={styles.conflictBadge}>Стол слишком большой для вашего состава</span>
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
                (selectedTable && pickStatus(selectedTable, guestsCount) === 'booked') ||
                (selectedTable && !selectedMergedPair && pickStatus(selectedTable, guestsCount) === 'oversized') ||
                blockNextForMergePick
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
            <button
              type="button"
              className={styles.btnBack}
              onClick={() => {
                setStep(1);
                setError('');
              }}
            >
              ← Назад
            </button>
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={loading || Boolean(error)}
              onClick={handleSubmit}
            >
              {loading ? 'Отправка…' : 'Забронировать'}
            </button>
          </div>
        </div>
      )}
      <ValidationTooltipPortal />
    </div>
  );
};

export default BookingWizard;
