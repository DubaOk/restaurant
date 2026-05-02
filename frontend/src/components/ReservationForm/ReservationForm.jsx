import { useEffect, useMemo, useState } from 'react';
import { reservationsApi } from '../../api/reservations.api';
import { tablesApi } from '../../api/tables.api';
import TableFloorPlan, {
  pickStatus,
  canPreselectBookingTable,
} from '../TableFloorPlan/TableFloorPlan';
import styles from './ReservationForm.module.css';

const DEPOSIT_PER_GUEST = 25;

/** Минимум для datetime-local в локальной зоне (не UTC), иначе поле режет допустимое время */
function minDateTimeLocalFromNow() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function reservationOptionSuffix(table, guestsCount) {
  const st = pickStatus(table, guestsCount);
  if (st === 'free' || st === 'unknown') return '';
  if (st === 'booked') return ' · занят';
  if (st === 'disabled') return ' · не в брони';
  if (st === 'small') return ' · мало мест';
  return ' · недоступен';
}

const ReservationForm = ({ restaurantId }) => {
  const [tables, setTables] = useState([]);
  const [form, setForm] = useState({
    date: '',
    guestsCount: 2,
    comment: '',
  });
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingTables(true);
      try {
        const params = {};
        if (form.date) {
          params.at = new Date(form.date).toISOString();
        }
        const { data } = await tablesApi.getByRestaurant(restaurantId, params);
        if (!cancelled) setTables(data.data || []);
      } catch {
        if (!cancelled) setTables([]);
      } finally {
        if (!cancelled) setLoadingTables(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [restaurantId, form.date]);

  useEffect(() => {
    setSelectedTableId((prev) => {
      if (prev == null) return prev;
      const t = tables.find((row) => row.id === prev);
      if (!t) return null;
      if (!canPreselectBookingTable(t, form.guestsCount)) return null;
      return prev;
    });
  }, [tables, form.guestsCount]);

  const selectedTable = useMemo(
    () => tables.find((t) => t.id === selectedTableId) || null,
    [tables, selectedTableId]
  );

  const depositPreview = useMemo(
    () => Math.max(DEPOSIT_PER_GUEST, form.guestsCount * DEPOSIT_PER_GUEST),
    [form.guestsCount]
  );

  const canSubmit =
    Boolean(form.date && selectedTableId && tables.length) &&
    selectedTable &&
    pickStatus(selectedTable, form.guestsCount) === 'free';

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]:
        e.target.name === 'guestsCount' ? parseInt(e.target.value, 10) || 1 : e.target.value,
    }));
  };

  const handleFallbackSelect = (e) => {
    const id = parseInt(e.target.value, 10);
    const t = tables.find((row) => row.id === id);
    if (!t || !canPreselectBookingTable(t, form.guestsCount)) return;
    setSelectedTableId(id || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await reservationsApi.create({
        restaurantId: parseInt(restaurantId, 10),
        tableId: selectedTableId,
        date: new Date(form.date).toISOString(),
        guestsCount: parseInt(form.guestsCount, 10),
        comment: form.comment,
      });
      setSuccess('Заявка отправлена — ресторан подтвердит стол и депозит.');
      setForm((prev) => ({ ...prev, date: '', comment: '' }));
      setSelectedTableId(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка бронирования');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={`${styles.shell} ${styles.shellBooking}`} onSubmit={handleSubmit}>
      {success && <p className={styles.success}>{success}</p>}
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.topRow}>
        <div className={styles.field}>
          <label>Дата и время</label>
          <input
            name="date"
            type="datetime-local"
            value={form.date}
            onChange={handleChange}
            required
            min={minDateTimeLocalFromNow()}
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label>Гостей</label>
          <input
            name="guestsCount"
            type="number"
            min={1}
            max={20}
            value={form.guestsCount}
            onChange={handleChange}
            required
            className={styles.input}
          />
        </div>
        <div className={`${styles.field} ${styles.fieldGrow}`}>
          <label>Комментарий</label>
          <input
            name="comment"
            value={form.comment}
            onChange={handleChange}
            placeholder="Особые пожелания…"
            className={styles.input}
          />
        </div>
      </div>

      {tables.length === 0 && !loadingTables && (
        <p className={styles.hintEmpty}>
          У ресторана ещё нет столиков в системе — обратитесь к администрации заведения.
        </p>
      )}

      {tables.length > 0 && (
        <div className={styles.split}>
          <div className={styles.floorCol}>
            {loadingTables && <p className={styles.miniLoading}>Обновление схемы…</p>}
            {!form.date ? (
              <p className={styles.hintMuted}>
                Выберите стол на схеме, затем укажите дату и время — проверим пересечения с другими бронями (окно ±2
                часа). Пунктиром отмечены столы до проверки слота.
              </p>
            ) : (
              <p className={styles.hintMuted}>
                Занятость по выбранному времени (±2 ч). Стол можно сменить в любой момент.
              </p>
            )}
            <TableFloorPlan
              tables={tables}
              guestsCount={form.guestsCount}
              selectedTableId={selectedTableId}
              onSelectTable={(id) => setSelectedTableId(id)}
              bookingStretch
            />
            <details className={styles.fallback}>
              <summary>Выбрать стол из списка</summary>
              <select
                className={styles.select}
                value={selectedTableId || ''}
                onChange={handleFallbackSelect}
              >
                <option value="">—</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id} disabled={!canPreselectBookingTable(t, form.guestsCount)}>
                    Стол №{t.number} · до {t.capacity}
                    {reservationOptionSuffix(t, form.guestsCount)}
                  </option>
                ))}
              </select>
            </details>
          </div>

          <aside className={styles.sidePanel}>
            <h3 className={styles.sideTitle}>Ваш выбор</h3>
            {selectedTable ? (
              <>
                <p className={styles.sideLine}>
                  Стол №<strong>{selectedTable.number}</strong>
                </p>
                <p className={styles.sideMeta}>
                  До {selectedTable.capacity} персон · гостей: {form.guestsCount}
                </p>
                {!form.date && (
                  <p className={styles.sideNeedDate}>Укажите дату и время — подтвердим, что стол свободен.</p>
                )}
                {form.date && pickStatus(selectedTable, form.guestsCount) === 'booked' && (
                  <p className={styles.sideConflict}>На это время стол занят — выберите другой.</p>
                )}
                <div className={styles.depositBlock}>
                  <span className={styles.depositLabel}>Депозит (расчёт)</span>
                  <span className={styles.depositValue}>{depositPreview}&nbsp;<i className="nbrb-icon">BYN</i></span>
                  <p className={styles.depositHint}>
                    Точная сумма и способ предоплаты — после подтверждения ресторана.
                  </p>
                </div>
                <button
                  type="submit"
                  className={styles.confirmBtn}
                  disabled={loading || !canSubmit}
                >
                  {loading ? 'Отправка…' : 'Подтвердить бронирование'}
                </button>
              </>
            ) : (
              <>
                <p className={styles.sidePlaceholder}>Выберите стол на схеме зала.</p>
                <div className={styles.depositBlockMuted}>
                  <span className={styles.depositLabel}>Депозит</span>
                  <span className={styles.depositValueMuted}>—</span>
                </div>
                <button type="submit" className={styles.confirmBtn} disabled>
                  Подтвердить бронирование
                </button>
              </>
            )}
            <p className={styles.panHint}>
              Колесо мыши — масштаб · перетаскивание по фону — панорама.
            </p>
          </aside>
        </div>
      )}
    </form>
  );
};

export default ReservationForm;
