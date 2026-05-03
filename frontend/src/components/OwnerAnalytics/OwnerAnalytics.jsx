import { useState, useEffect } from 'react';
import { analyticsApi } from '../../api/analytics.api';
import styles from './OwnerAnalytics.module.css';

const STATUS_LABELS = {
  PENDING: 'Ожидает',
  CONFIRMED: 'Подтверждено',
  CANCELLED: 'Отменено',
  COMPLETED: 'Завершено',
};

const OwnerAnalytics = ({ restaurantId }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi
      .getRestaurantStats(restaurantId)
      .then(({ data }) => setStats(data.data))
      .finally(() => setLoading(false));
  }, [restaurantId]);

  if (loading) return <p className={styles.loading}>Загрузка показателей...</p>;
  if (!stats) return <p className={styles.empty}>Данных пока нет</p>;

  const cancelRate = stats.totalReservations > 0
    ? ((stats.cancelledReservations / stats.totalReservations) * 100).toFixed(1)
    : '0.0';

  return (
    <div className={styles.container}>
      <div className={styles.cards}>
        <div className={styles.card}>
          <span className={styles.label}>Всего гостевых броней</span>
          <span className={styles.value}>{stats.totalReservations}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.label}>Подтверждено</span>
          <span className={styles.value}>{stats.confirmedReservations}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.label}>Отменено</span>
          <span className={`${styles.value} ${styles.valueMuted}`}>{stats.cancelledReservations}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.label}>Процент отмен</span>
          <span className={`${styles.value} ${parseFloat(cancelRate) > 30 ? styles.valueWarn : styles.valueMuted}`}>
            {cancelRate}%
          </span>
        </div>
        <div className={styles.card}>
          <span className={styles.label}>Средний рейтинг</span>
          <span className={styles.value}>
            {stats.avgRating ? Number(stats.avgRating).toFixed(2) : '—'}
          </span>
        </div>
        <div className={styles.card}>
          <span className={styles.label}>Всего отзывов</span>
          <span className={styles.value}>{stats.totalReviews}</span>
        </div>
      </div>

      {stats.reservationsByStatus?.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Брони по статусам</h3>
          <div className={styles.statusList}>
            {stats.reservationsByStatus.map((s) => (
              <div key={s.status} className={styles.statusItem}>
                <span className={styles.statusLabel}>{STATUS_LABELS[s.status] || s.status}</span>
                <div className={styles.statusBar}>
                  <div
                    className={styles.statusBarFill}
                    style={{
                      width: `${Math.round((s._count.status / stats.totalReservations) * 100)}%`,
                    }}
                  />
                </div>
                <span className={styles.statusCount}>{s._count.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.recentReservations?.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Последние брони</h3>
          <div className={styles.recentList}>
            {stats.recentReservations.map((r) => (
              <div key={r.id} className={styles.recentItem}>
                <div className={styles.recentInfo}>
                  <span className={styles.recentUser}>{r.user?.name || 'Гость'}</span>
                  <span className={styles.recentMeta}>
                    Стол №{r.table?.number} · {new Date(r.date).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                <span className={`${styles.statusBadge} ${styles[r.status.toLowerCase()]}`}>
                  {STATUS_LABELS[r.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerAnalytics;
