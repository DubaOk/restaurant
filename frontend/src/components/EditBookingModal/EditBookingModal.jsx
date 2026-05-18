import { useState, useEffect, useMemo, useRef } from 'react';
import { useValidationTooltip } from '../../hooks/useValidationTooltip';
import ValidatedForm from '../ValidatedForm/ValidatedForm';
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
  const floorAreaRef = useRef(null);
  const { showMessage, ValidationTooltipPortal } = useValidationTooltip();

  const restaurantId = reservation.restaurant?.id;
  const originalTableId = reservation.table?.id ?? null;

  const selectedTable = useMemo(
    () => tables.find((t) => t.id === selectedTableId) || null,
    [tables, selectedTableId],
  );

  const selectedTableBlocked = Boolean(
    showFloor
    && selectedTable
    && !canPreselectBookingTable(selectedTable, guestsCount, { strict: true }),
  );

  useEffect(() => {
    if (!showFloor || !restaurantId || !dateTime) return;
    setLoadingTables(true);
    tablesApi
      .getByRestaurant(restaurantId, {
        at: new Date(dateTime).toISOString(),
        excludeReservationId: reservation.id,
      })
      .then(({ data }) => setTables(data.data || []))
      .catch(() => setTables([]))
      .finally(() => setLoadingTables(false));
  }, [showFloor, restaurantId, dateTime, reservation.id]);

  useEffect(() => {
    if (!selectedTableId) return;
    const t = tables.find((x) => x.id === selectedTableId);
    if (!t) return;
    if (canPreselectBookingTable(t, guestsCount, { strict: true })) return;
    if (selectedTableId === originalTableId) return;
    setSelectedTableId(originalTableId);
  }, [guestsCount, tables, selectedTableId, originalTableId]);

  const validations = () => {
    if (!dateTime) return 'Укажите дату и время';
    if (new Date(dateTime) < new Date()) return 'Выберите будущую дату и время';
    if (guestsCount < 1 || guestsCount > 20) return 'Количество гостей: от 1 до 20';
    if (showFloor && selectedTableId) {
      const t = tables.find((x) => x.id === selectedTableId);
      if (!t) return 'Выберите столик на схеме зала';
      if (!t.slotKnown) return 'Подождите, загружается занятость столов';
      if (!canPreselectBookingTable(t, guestsCount, { strict: true })) {
        if (pickStatus(t, guestsCount) === 'booked') {
          return 'Этот столик уже занят на выбранное время';
        }
        return 'Этот столик недоступен для вашего состава гостей';
      }
    }
    return null;
  };

  const handleSelectTable = (id) => {
    const t = tables.find((x) => x.id === id);
    if (!t || !canPreselectBookingTable(t, guestsCount, { strict: true })) return;
    setSelectedTableId(id);
    setError('');
  };

  const handleSave = async () => {
    const valErr = validations();
    if (valErr) {
      setError(valErr);
      if (valErr.includes('столик') && floorAreaRef.current) {
        showMessage(floorAreaRef.current, valErr);
      }
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        date: new Date(dateTime).toISOString(),
        guestsCount: parseInt(guestsCount, 10),
      };
      if (showFloor && selectedTableId && selectedTableId !== originalTableId) {
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

        <ValidatedForm
          className={styles.body}
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          {reservation.restaurant?.name && (
            <p className={styles.restaurantName}>{reservation.restaurant.name}</p>
          )}

          <div className={styles.section}>
            <label className={styles.label} htmlFor="edit-booking-datetime">Дата и время</label>
            <input
              id="edit-booking-datetime"
              type="datetime-local"
              className={styles.input}
              value={dateTime}
              min={minDateTimeLocal()}
              onChange={(e) => setDateTime(e.target.value)}
              required
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
              <div className={styles.floorArea} ref={floorAreaRef}>
                {loadingTables ? (
                  <p className={styles.loadingMsg}>Загрузка схемы зала…</p>
                ) : tables.length === 0 ? (
                  <p className={styles.noTablesMsg}>Нет данных о столиках</p>
                ) : (
                  <TableFloorPlan
                    tables={tables}
                    guestsCount={guestsCount}
                    selectedTableId={selectedTableId}
                    onSelectTable={handleSelectTable}
                    bookingStretch
                    minZoomK={1}
                    strictBooking
                  />
                )}
                {selectedTable && (
                  <p className={styles.pickedTable}>
                    Выбрано: Стол №{selectedTable.number} · до {selectedTable.capacity} мест
                    {selectedTableBlocked && (
                      <span className={styles.busyWarn}> · занят на это время</span>
                    )}
                  </p>
                )}
              </div>
            )}
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Отмена
            </button>
            <button
              type="submit"
              className={styles.saveBtn}
              disabled={saving || selectedTableBlocked}
            >
              {saving ? 'Сохранение…' : 'Сохранить изменения'}
            </button>
          </div>
        </ValidatedForm>
        <ValidationTooltipPortal />
      </div>
    </div>
  );
};

export default EditBookingModal;
