import { useState, useEffect } from 'react';
import { reservationsApi } from '../../api/reservations.api';
import Navbar from '../../components/Navbar/Navbar';
import styles from './ReservationsPage.module.css';

const STATUS_LABELS = {
  PENDING: 'Ожидает',
  CONFIRMED: 'Подтверждено',
  CANCELLED: 'Отменено',
  COMPLETED: 'Завершено',
};

const ReservationsPage = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    reservationsApi
      .getMyReservations()
      .then(({ data }) => setReservations(data.data))
      .catch(() => setError('Не удалось загрузить бронирования'))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (id) => {
    try {
      await reservationsApi.cancel(id);
      setReservations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'CANCELLED' } : r))
      );
    } catch {
      /* silent */
    }
  };

  return (
    <>
      <Navbar />
      <main className={styles.page}>
        <h1>Мои бронирования</h1>

        {error && <p className={styles.error}>{error}</p>}

        {loading ? (
          <p className={styles.loading}>Загрузка...</p>
        ) : reservations.length === 0 ? (
          <p className={styles.empty}>Бронирований пока нет</p>
        ) : (
          <ul className={styles.list}>
            {reservations.map((r) => (
              <li key={r.id} className={styles.item}>
                <div className={styles.info}>
                  <span className={styles.restaurantName}>{r.restaurant?.name}</span>
                  <span className={styles.date}>
                    {new Date(r.date).toLocaleString('ru-RU')}
                  </span>
                  <span className={styles.guests}>Гостей: {r.guestsCount}</span>
                </div>
                <div className={styles.right}>
                  <span className={`${styles.badge} ${styles[r.status.toLowerCase()]}`}>
                    {STATUS_LABELS[r.status]}
                  </span>
                  {r.status === 'PENDING' && (
                    <button
                      className={styles.cancelBtn}
                      onClick={() => handleCancel(r.id)}
                    >
                      Отменить
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
};

export default ReservationsPage;
