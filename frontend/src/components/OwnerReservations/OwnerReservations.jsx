import { useState, useEffect } from 'react';
import { reservationsApi } from '../../api/reservations.api';
import styles from './OwnerReservations.module.css';

const STATUS_LABELS = {
  PENDING: 'Ожидает',
  CONFIRMED: 'Подтверждено',
  CANCELLED: 'Отменено',
  COMPLETED: 'Завершено',
};

const OwnerReservations = ({ restaurantId }) => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reservationsApi
      .getRestaurantReservations(restaurantId)
      .then(({ data }) => setReservations(data.data))
      .finally(() => setLoading(false));
  }, [restaurantId]);

  const handleAction = async (id, action) => {
    try {
      if (action === 'confirm') await reservationsApi.confirm(id);
      if (action === 'cancel') await reservationsApi.cancel(id);
      setReservations((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: action === 'confirm' ? 'CONFIRMED' : 'CANCELLED' }
            : r
        )
      );
    } catch {
      /* silent */
    }
  };

  if (loading) return <p className={styles.loading}>Загрузка...</p>;
  if (reservations.length === 0) return <p className={styles.empty}>Гостевых броней пока нет</p>;

  return (
    <ul className={styles.list}>
      {reservations.map((r) => (
        <li key={r.id} className={styles.item}>
          <div className={styles.info}>
            <span className={styles.guest}>{r.user?.name || 'Гость'}</span>
            <span className={styles.date}>{new Date(r.date).toLocaleString('ru-RU')}</span>
            <span className={styles.guests}>Гостей: {r.guestsCount}</span>
            {r.comment && <span className={styles.comment}>«{r.comment}»</span>}
          </div>
          <div className={styles.right}>
            <span className={`${styles.badge} ${styles[r.status.toLowerCase()]}`}>
              {STATUS_LABELS[r.status]}
            </span>
            {r.status === 'PENDING' && (
              <>
                <button className={styles.confirmBtn} onClick={() => handleAction(r.id, 'confirm')}>
                  Подтвердить
                </button>
                <button className={styles.cancelBtn} onClick={() => handleAction(r.id, 'cancel')}>
                  Отклонить
                </button>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
};

export default OwnerReservations;
