import { useState, useEffect, useMemo } from 'react';
import { reservationsApi } from '../../api/reservations.api';
import { tablesApi } from '../../api/tables.api';
import TableFloorPlan, { pickStatus, canPreselectBookingTable } from '../TableFloorPlan/TableFloorPlan';
import styles from './EditBookingModal.module.css';

function toDateTimeLocal(isoStr) {
  const d = new Date(isoStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function minDateTimeLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function pluralGuests(n) {
  if (n === 1) return 'гость';
  if (n >= 2 && n <= 4) return 'гостя';
  return 'гостей';
}

const EditBookingModal = ({ reservation, onClose, onSaved }) => {
  const [dateTime, setDateTime] = useState(toDateTimeLocal(reservation.date));
  const [guestsCount, setGuestsCount] = useState(reservation.guestsCount);
  const [showFloor, setShowFloor] = useState(false);
  const [tables, setTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState(reservation.table?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const restaurantId = reservation.restaurant?.id;

  const selectedTable = useMemo(
    () => tables.find((t) => t.id === selectedTableId) || null,
    [tables, selectedTableId]
  );

  useEffect(() => {
    if (!showFloor || !restaurantId || !dateTime) return;
    setLoadingTables(true);
    tablesApi
      .getByRestaurant(restaurantId, { at: new Date(dateTime).toISOString() })
      .then(({ data }) => setTables(data.data || []))
      .catch(() => setTables([]))
      .finally(() => setLoadingTables(false));
  }, [showFloor, restaurantId, dateTime]);

  useEffect(() => {
    if (!selectedTableId) return;
    const t = tables.find((x) => x.id === selectedTableId);
    if (t && !canPreselectBookingTable(t, guestsCount)) setSelectedTableId(null);
  }, [guestsCount, tables, selectedTableId]);

  const validations = () => {
    if (!dateTime) return 'Укажите дату и время';
    if (new Date(dateTime) < new Date()) return 'Выберите будущую дату и время';
    if (guestsCount < 1 || guestsCount > 20) return 'Количество гостей: от 1 до 20';
    if (
      showFloor &&
      selectedTable &&
      pickStatus(selectedTable, guestsCount) === 'booked'
    )
      return 'Выбранный столик занят на это время';
    return null;
  };

  const handleSave = async () => {
    const valErr = validations();
    if (valErr) { setError(valErr); return; }

    setSaving(true);
    setError('');
    try {
      const payload = {
        date: new Date(dateTime).toISOString(),
        guestsCount: parseInt(guestsCount, 10),
      };
      if (showFloor && selectedTableId && selectedTableId !== reservation.table?.id) {
        payload.tableId = selectedTableId;
      }
      const { data } = await reservationsApi.update(reservation.id, payload);
      onSaved(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка при изменении');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>Изменить бронирование</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>

        <div className={styles.body}>
          {reservation.restaurant?.name && (
            <p className={styles.restaurantName}>{reservation.restaurant.name}</p>
          )}

          <div className={styles.section}>
            <label className={styles.label}>Дата и время</label>
            <input
              type="datetime-local"
              className={styles.input}
              value={dateTime}
              min={minDateTimeLocal()}
              onChange={(e) => setDateTime(e.target.value)}
            />
          </div>

          <div className={styles.section}>
            <label className={styles.label}>Количество гостей</label>
            <div className={styles.guestCounter}>
              <button
                type="button"
                className={styles.cBtn}
                onClick={() => setGuestsCount((g) => Math.max(1, g - 1))}
                aria-label="Меньше"
              >
                −
              </button>
              <span className={styles.cValue}>{guestsCount}</span>
              <button
                type="button"
                className={styles.cBtn}
                onClick={() => setGuestsCount((g) => Math.min(20, g + 1))}
                aria-label="Больше"
              >
                +
              </button>
              <span className={styles.cHint}>{pluralGuests(guestsCount)}</span>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.tableHeader}>
              <span className={styles.label}>
                Стол: №{reservation.table?.number} · до {reservation.table?.capacity} мест
              </span>
              <button
                type="button"
                className={styles.toggleFloorBtn}
                onClick={() => setShowFloor((p) => !p)}
              >
                {showFloor ? 'Оставить текущий' : 'Сменить столик'}
              </button>
            </div>

            {showFloor && (
              <div className={styles.floorArea}>
                {loadingTables ? (
                  <p className={styles.loadingMsg}>Загрузка схемы зала…</p>
                ) : tables.length === 0 ? (
                  <p className={styles.noTablesMsg}>Нет данных о столиках</p>
                ) : (
                  <TableFloorPlan
                    tables={tables}
                    guestsCount={guestsCount}
                    selectedTableId={selectedTableId}
                    onSelectTable={(id) => setSelectedTableId(id)}
                    bookingStretch
                  />
                )}
                {selectedTable && (
                  <p className={styles.pickedTable}>
                    Выбрано: Стол №{selectedTable.number} · до {selectedTable.capacity} мест
                    {pickStatus(selectedTable, guestsCount) === 'booked' && (
                      <span className={styles.busyWarn}> · занят на это время</span>
                    )}
                  </p>
                )}
              </div>
            )}
          </div>

          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? 'Сохранение…' : 'Сохранить изменения'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditBookingModal;
