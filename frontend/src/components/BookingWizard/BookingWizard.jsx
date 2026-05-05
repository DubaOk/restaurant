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

  const [comment, setComment]       = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState(false);

  const dateTimeStr = date && time ? `${date}T${time}` : '';

  const selectedTable = useMemo(
    () => tables.find((t) => t.id === selectedTableId) || null,
    [tables, selectedTableId],
  );

  // Drop incompatible table when guests count changes
  useEffect(() => {
    if (!selectedTableId) return;
    const t = tables.find((x) => x.id === selectedTableId);
    if (t && !canPreselectBookingTable(t, guestsCount)) setSelectedTableId(null);
  }, [guestsCount, tables, selectedTableId]);

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
      setStep(1);
    } catch {
      setTables([]);
      setStep(1);
    } finally {
      setLoadingTables(false);
    }
  }, [step1Valid, dateTimeStr, restaurantId]);

  const goToStep3 = () => { if (!selectedTableId) return; setStep(2); setError(''); };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      await reservationsApi.create({
        restaurantId: parseInt(restaurantId, 10),
        tableId: selectedTableId,
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

          {tables.length === 0 ? (
            <p className={styles.noTables}>
              У ресторана пока нет столиков в системе — обратитесь к администрации заведения.
            </p>
          ) : (
            <div className={styles.floorWrap}>
              <TableFloorPlan
                tables={tables}
                guestsCount={guestsCount}
                selectedTableId={selectedTableId}
                onSelectTable={(id) => setSelectedTableId(id)}
                hallSchema={hallSchema}
                staticMode
                bookingStretch
              />
            </div>
          )}

          {selectedTable && (
            <div className={styles.selectionRow}>
              <span className={styles.selectionBadge}>
                Стол №{selectedTable.number} · до {selectedTable.capacity} мест
              </span>
              {pickStatus(selectedTable, guestsCount) === 'booked' && (
                <span className={styles.conflictBadge}>На это время занят — выберите другой</span>
              )}
            </div>
          )}

          <div className={styles.navRow}>
            <button type="button" className={styles.btnBack} onClick={() => setStep(0)}>← Назад</button>
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={!selectedTableId || (selectedTable && pickStatus(selectedTable, guestsCount) === 'booked')}
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
                №{selectedTable?.number} · до {selectedTable?.capacity} мест
              </span>
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
