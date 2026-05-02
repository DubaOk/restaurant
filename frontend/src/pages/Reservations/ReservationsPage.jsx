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

const TABS = ['Активные', 'История посещений'];

const ReservationsPage = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ date: '', guestsCount: 1 });
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

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

  const startEdit = (r) => {
    const local = new Date(r.date);
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`;
    setEditForm({ date: dateStr, guestsCount: r.guestsCount });
    setEditError('');
    setEditingId(r.id);
  };

  const handleEditSubmit = async (id) => {
    setEditSaving(true);
    setEditError('');
    try {
      const { data } = await reservationsApi.update(id, {
        date: new Date(editForm.date).toISOString(),
        guestsCount: parseInt(editForm.guestsCount, 10),
      });
      setReservations((prev) => prev.map((r) => (r.id === id ? data.data : r)));
      setEditingId(null);
    } catch (err) {
      setEditError(err.response?.data?.message || 'Ошибка при изменении бронирования');
    } finally {
      setEditSaving(false);
    }
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
              </button>
            ))}
          </div>

          {error && <p className={styles.error}>{error}</p>}

          {loading ? (
            <p className={styles.loading}>Загрузка...</p>
          ) : displayed.length === 0 ? (
            <p className={styles.empty}>
              {activeTab === 0 ? 'Активных бронирований нет' : 'История посещений пуста'}
            </p>
          ) : (
            <ul className={styles.list}>
              {displayed.map((r) => (
                <li key={r.id} className={styles.item}>
                  {editingId === r.id ? (
                    <div className={styles.editBlock}>
                      <h4 className={styles.editTitle}>Изменить бронирование</h4>
                      {editError && <p className={styles.editError}>{editError}</p>}
                      <div className={styles.editRow}>
                        <label className={styles.editLabel}>Дата и время</label>
                        <input
                          type="datetime-local"
                          className={styles.editInput}
                          value={editForm.date}
                          onChange={(e) => setEditForm((p) => ({ ...p, date: e.target.value }))}
                        />
                      </div>
                      <div className={styles.editRow}>
                        <label className={styles.editLabel}>Гостей</label>
                        <input
                          type="number"
                          className={styles.editInput}
                          min={1}
                          max={20}
                          value={editForm.guestsCount}
                          onChange={(e) => setEditForm((p) => ({ ...p, guestsCount: e.target.value }))}
                        />
                      </div>
                      <div className={styles.editActions}>
                        <button
                          type="button"
                          className={styles.saveBtn}
                          onClick={() => handleEditSubmit(r.id)}
                          disabled={editSaving}
                        >
                          {editSaving ? 'Сохранение…' : 'Сохранить'}
                        </button>
                        <button
                          type="button"
                          className={styles.cancelBtn}
                          onClick={() => setEditingId(null)}
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={styles.info}>
                        <span className={styles.restaurantName}>{r.restaurant?.name}</span>
                        <span className={styles.date}>
                          {new Date(r.date).toLocaleString('ru-RU')}
                        </span>
                        <span className={styles.guests}>Гостей: {r.guestsCount}</span>
                        {r.comment && <span className={styles.comment}>{r.comment}</span>}
                      </div>
                      <div className={styles.right}>
                        <span className={`${styles.badge} ${styles[r.status.toLowerCase()]}`}>
                          {STATUS_LABELS[r.status]}
                        </span>
                        {r.status === 'PENDING' && (
                          <button
                            className={styles.editBtn}
                            onClick={() => startEdit(r)}
                          >
                            Изменить
                          </button>
                        )}
                        {(r.status === 'PENDING' || r.status === 'CONFIRMED') && (
                          <button
                            className={styles.cancelBtn}
                            onClick={() => handleCancel(r.id)}
                          >
                            Отменить
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
};

export default ReservationsPage;
