import { useState, useEffect } from 'react';
import { reservationsApi } from '../../api/reservations.api';
import styles from './OwnerReservations.module.css';

const STATUS_LABELS = {
  PENDING: 'Ожидает',
  CONFIRMED: 'Подтверждено',
  CANCELLED: 'Отменено',
  COMPLETED: 'Посещение состоялось',
};

const FILTERS = ['Все', 'Ожидает', 'Подтверждено', 'Завершено', 'Отменено'];
const FILTER_STATUS = { 'Все': null, 'Ожидает': 'PENDING', 'Подтверждено': 'CONFIRMED', 'Завершено': 'COMPLETED', 'Отменено': 'CANCELLED' };

const OwnerReservations = ({ restaurantId }) => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [filter, setFilter] = useState('Все');

  useEffect(() => {
    reservationsApi
      .getRestaurantReservations(restaurantId)
      .then(({ data }) => setReservations(data.data))
      .finally(() => setLoading(false));
  }, [restaurantId]);

  const handleAction = async (id, action) => {
    setActionId(id);
    try {
      if (action === 'confirm') await reservationsApi.confirm(id);
      if (action === 'cancel') await reservationsApi.cancel(id);
      if (action === 'complete') await reservationsApi.complete(id);
      const nextStatus = { confirm: 'CONFIRMED', cancel: 'CANCELLED', complete: 'COMPLETED' }[action];
      setReservations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: nextStatus } : r))
      );
    } catch {
      /* silent */
    } finally {
      setActionId(null);
    }
  };

  const filterStatus = FILTER_STATUS[filter];
  const displayed = filterStatus
    ? reservations.filter((r) => r.status === filterStatus)
    : reservations;

  if (loading) return <p className={styles.loading}>Загрузка…</p>;

  return (
    <div className={styles.wrap}>
      <div className={styles.filterBar}>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
            {f !== 'Все' && (
              <span className={styles.filterCount}>
                {reservations.filter((r) => r.status === FILTER_STATUS[f]).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <p className={styles.empty}>
          {filter === 'Все' ? 'Гостевых броней пока нет' : `Нет броней со статусом «${filter}»`}
        </p>
      ) : (
        <ul className={styles.list}>
          {displayed.map((r) => (
            <li key={r.id} className={`${styles.item} ${styles[`item_${r.status.toLowerCase()}`]}`}>
              <div className={styles.info}>
                <div className={styles.guestRow}>
                  <span className={styles.guest}>{r.user?.name || 'Гость'}</span>
                  <span className={`${styles.badge} ${styles[r.status.toLowerCase()]}`}>
                    {STATUS_LABELS[r.status]}
                  </span>
                </div>
                <span className={styles.date}>
                  {new Date(r.date).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
                <span className={styles.meta}>
                  Гостей: {r.guestsCount}
                  {r.table && ` · Стол №${r.table.number}`}
                </span>
                {r.comment && <span className={styles.comment}>«{r.comment}»</span>}
              </div>

              <div className={styles.actions}>
                {r.status === 'PENDING' && (
                  <>
                    <button
                      className={styles.confirmBtn}
                      disabled={actionId === r.id}
                      onClick={() => handleAction(r.id, 'confirm')}
                    >
                      Подтвердить
                    </button>
                    <button
                      className={styles.cancelBtn}
                      disabled={actionId === r.id}
                      onClick={() => handleAction(r.id, 'cancel')}
                    >
                      Отклонить
                    </button>
                  </>
                )}
                {r.status === 'CONFIRMED' && (
                  <>
                    <button
                      className={styles.completeBtn}
                      disabled={actionId === r.id}
                      onClick={() => handleAction(r.id, 'complete')}
                    >
                      {actionId === r.id ? '…' : '✓ Посещение состоялось'}
                    </button>
                    <button
                      className={styles.cancelBtn}
                      disabled={actionId === r.id}
                      onClick={() => handleAction(r.id, 'cancel')}
                    >
                      Отменить
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default OwnerReservations;
