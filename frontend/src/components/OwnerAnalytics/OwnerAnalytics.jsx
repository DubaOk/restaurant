import { useState, useEffect } from 'react';
import { analyticsApi } from '../../api/analytics.api';
import styles from './OwnerAnalytics.module.css';

const OwnerAnalytics = ({ restaurantId }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi
      .getRestaurantStats(restaurantId)
      .then(({ data }) => setStats(data.data))
      .finally(() => setLoading(false));
  }, [restaurantId]);

  if (loading) return <p className={styles.loading}>Загрузка аналитики...</p>;
  if (!stats) return <p className={styles.empty}>Данных пока нет</p>;

  return (
    <div className={styles.container}>
      <div className={styles.cards}>
        <div className={styles.card}>
          <span className={styles.label}>Всего бронирований</span>
          <span className={styles.value}>{stats.totalReservations}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.label}>Подтверждено</span>
          <span className={styles.value}>{stats.confirmedReservations}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.label}>Средний рейтинг</span>
          <span className={styles.value}>{stats.avgRating ? Number(stats.avgRating).toFixed(2) : '—'}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.label}>Всего отзывов</span>
          <span className={styles.value}>{stats.totalReviews}</span>
        </div>
      </div>
    </div>
  );
};

export default OwnerAnalytics;
