import { useState, useEffect } from 'react';
import { reservationsApi } from '../../api/reservations.api';
import api from '../../api/index';
import styles from './ReservationForm.module.css';

const ReservationForm = ({ restaurantId }) => {
  const [tables, setTables] = useState([]);
  const [form, setForm] = useState({
    tableId: '',
    date: '',
    guestsCount: 2,
    comment: '',
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get(`/tables/restaurant/${restaurantId}`).then(({ data }) => {
      setTables(data.data);
      if (data.data.length > 0) {
        setForm((prev) => ({ ...prev, tableId: data.data[0].id }));
      }
    });
  }, [restaurantId]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await reservationsApi.create({
        restaurantId: parseInt(restaurantId),
        tableId: parseInt(form.tableId),
        date: new Date(form.date).toISOString(),
        guestsCount: parseInt(form.guestsCount),
        comment: form.comment,
      });
      setSuccess('Бронирование отправлено! Ожидайте подтверждения.');
      setForm((prev) => ({ ...prev, date: '', comment: '' }));
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка бронирования');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {success && <p className={styles.success}>{success}</p>}
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.row}>
        <div className={styles.field}>
          <label>Столик</label>
          <select name="tableId" value={form.tableId} onChange={handleChange} required>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                Стол №{t.number} (мест: {t.capacity})
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label>Дата и время</label>
          <input
            name="date"
            type="datetime-local"
            value={form.date}
            onChange={handleChange}
            required
            min={new Date().toISOString().slice(0, 16)}
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
          />
        </div>
      </div>

      <div className={styles.field}>
        <label>Комментарий (необязательно)</label>
        <input
          name="comment"
          value={form.comment}
          onChange={handleChange}
          placeholder="Особые пожелания..."
        />
      </div>

      <button type="submit" className={styles.btn} disabled={loading || tables.length === 0}>
        {loading ? 'Отправка...' : 'Забронировать'}
      </button>
    </form>
  );
};

export default ReservationForm;
