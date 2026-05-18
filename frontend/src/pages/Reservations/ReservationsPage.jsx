import { useState, useEffect } from 'react';
import { reservationsApi } from '../../api/reservations.api';
import Navbar from '../../components/Navbar/Navbar';
import EditBookingModal from '../../components/EditBookingModal/EditBookingModal';
import { reservationTableLabel } from '../../utils/reservationTableLabel';
import styles from './ReservationsPage.module.css';

const STATUS_LABELS = {
  PENDING: 'Ожидает',
  CONFIRMED: 'Подтверждено',
  CANCELLED: 'Отменено',
  COMPLETED: 'Посещение состоялось',
};

const STATUS_ICONS = {
  PENDING: '🕐',
  CONFIRMED: '✓',
  CANCELLED: '✕',
  COMPLETED: '★',
};

const TABS = ['Активные', 'История посещений'];

const ReservationsPage = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [editingReservation, setEditingReservation] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    reservationsApi
      .getMyReservations()
      .then(({ data }) => setReservations(data.data))
      .catch(() => setError('Не удалось загрузить бронирования'))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (id) => {
    if (cancellingId) return;
    setCancellingId(id);
    try {
      await reservationsApi.cancel(id);
      setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'CANCELLED' } : r)));
    } catch {
      /* silent */
    } finally {
      setCancellingId(null);
    }
  };

  const handleSaved = (updated) => {
    setReservations((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setEditingReservation(null);
  };

  const active = reservations.filter((r) => ['PENDING', 'CONFIRMED'].includes(r.status));
  const history = reservations.filter((r) => ['CANCELLED', 'COMPLETED'].includes(r.status));
  const displayed = activeTab === 0 ? active : history;

  return (
    <>
      <Navbar />
      <main className={styles.shell}>
        <div className={styles.inner}>
          <h1 className={styles.title}>Мои бронирования</h1>

          <div className={styles.tabs}>
            {TABS.map((tab, i) => (
              <button
                key={tab}
                type="button"
                className={`${styles.tab} ${activeTab === i ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(i)}
              >
                {tab}
                <span className={styles.tabCount}>
                  {(i === 0 ? active : history).length}
                </span>
              </button>
            ))}
          </div>

          {error && <p className={styles.error}>{error}</p>}

          {loading ? (
            <p className={styles.loading}>Загрузка…</p>
          ) : displayed.length === 0 ? (
            <div className={styles.empty}>
              <p>{activeTab === 0 ? 'Активных бронирований нет' : 'История посещений пуста'}</p>
              {activeTab === 0 && (
                <p className={styles.emptyHint}>
                  Забронируйте столик в карточке ресторана — это займёт меньше минуты.
                </p>
              )}
            </div>
          ) : (
            <ul className={styles.list}>
              {displayed.map((r) => (
                <li
                  key={r.id}
                  className={`${styles.item} ${r.status === 'COMPLETED' ? styles.itemCompleted : ''} ${r.status === 'CANCELLED' ? styles.itemCancelled : ''}`}
                >
                  <div className={styles.statusStripe} data-status={r.status} />

                  <div className={styles.itemBody}>
                    <div className={styles.info}>
                      <span className={styles.restaurantName}>{r.restaurant?.name}</span>
                      <span className={styles.date}>
                        {new Date(r.date).toLocaleString('ru-RU', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                      <div className={styles.meta}>
                        <span>Гостей: {r.guestsCount}</span>
                        {reservationTableLabel(r) && (
                          <span>· {reservationTableLabel(r)}</span>
                        )}
                      </div>
                      {r.comment && <span className={styles.comment}>{r.comment}</span>}
                    </div>

                    <div className={styles.right}>
                      <span className={`${styles.badge} ${styles[r.status.toLowerCase()]}`}>
                        <span className={styles.badgeIcon}>{STATUS_ICONS[r.status]}</span>
                        {STATUS_LABELS[r.status]}
                      </span>

                      {r.status === 'COMPLETED' && (
                        <p className={styles.completedNote}>
                          Спасибо за посещение! Вы можете оставить отзыв в карточке ресторана.
                        </p>
                      )}

                      <div className={styles.btnRow}>
                        {r.status === 'PENDING' && (
                          <button
                            className={styles.editBtn}
                            onClick={() => setEditingReservation(r)}
                          >
                            Изменить
                          </button>
                        )}
                        {(r.status === 'PENDING' || r.status === 'CONFIRMED') && (
                          <button
                            className={styles.cancelBtn}
                            disabled={cancellingId === r.id}
                            onClick={() => handleCancel(r.id)}
                          >
                            {cancellingId === r.id ? '…' : 'Отменить'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {editingReservation && (
        <EditBookingModal
          reservation={editingReservation}
          onClose={() => setEditingReservation(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
};

export default ReservationsPage;
