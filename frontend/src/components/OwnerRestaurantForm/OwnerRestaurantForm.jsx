import { useState, useEffect } from 'react';
import { restaurantsApi } from '../../api/restaurants.api';
import styles from './OwnerRestaurantForm.module.css';

const OwnerRestaurantForm = ({ restaurant, onSaved }) => {
  const isEdit = Boolean(restaurant);
  const [form, setForm] = useState({
    name: '',
    description: '',
    address: '',
    cuisine: '',
    phone: '',
    openTime: '',
    closeTime: '',
    imageUrl: '',
    latitude: '',
    longitude: '',
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (restaurant) {
      setForm({
        name: restaurant.name || '',
        description: restaurant.description || '',
        address: restaurant.address || '',
        cuisine: restaurant.cuisine || '',
        phone: restaurant.phone || '',
        openTime: restaurant.openTime || '',
        closeTime: restaurant.closeTime || '',
        imageUrl: restaurant.imageUrl || '',
        latitude: restaurant.latitude?.toString() || '',
        longitude: restaurant.longitude?.toString() || '',
      });
    }
  }, [restaurant]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    const payload = {
      ...form,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
    };
    try {
      let res;
      if (isEdit) {
        res = await restaurantsApi.update(restaurant.id, payload);
      } else {
        res = await restaurantsApi.create(payload);
      }
      onSaved(res.data.data);
      setSuccess(isEdit ? 'Ресторан обновлён' : 'Ресторан создан');
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h2>{isEdit ? 'Редактировать ресторан' : 'Создать ресторан'}</h2>

      {success && <p className={styles.success}>{success}</p>}
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.grid}>
        <div className={styles.field}>
          <label>Название *</label>
          <input name="name" value={form.name} onChange={handleChange} required />
        </div>
        <div className={styles.field}>
          <label>Кухня *</label>
          <input name="cuisine" value={form.cuisine} onChange={handleChange} required placeholder="Итальянская" />
        </div>
        <div className={styles.field}>
          <label>Адрес *</label>
          <input name="address" value={form.address} onChange={handleChange} required placeholder="ул. Ленина, 1" />
        </div>
        <div className={styles.field}>
          <label>Телефон</label>
          <input name="phone" value={form.phone} onChange={handleChange} placeholder="+375 17 XXX-XX-XX" />
        </div>
        <div className={styles.field}>
          <label>Открытие</label>
          <input name="openTime" value={form.openTime} onChange={handleChange} placeholder="10:00" />
        </div>
        <div className={styles.field}>
          <label>Закрытие</label>
          <input name="closeTime" value={form.closeTime} onChange={handleChange} placeholder="23:00" />
        </div>
        <div className={styles.field}>
          <label>Ссылка на фото</label>
          <input name="imageUrl" value={form.imageUrl} onChange={handleChange} placeholder="https://..." />
        </div>
        <div className={styles.field}>
          <label>Широта (GPS)</label>
          <input name="latitude" value={form.latitude} onChange={handleChange} type="number" step="any" placeholder="53.9045" />
        </div>
        <div className={styles.field}>
          <label>Долгота (GPS)</label>
          <input name="longitude" value={form.longitude} onChange={handleChange} type="number" step="any" placeholder="27.5615" />
        </div>
      </div>

      <div className={styles.field}>
        <label>Описание</label>
        <textarea name="description" value={form.description} onChange={handleChange} rows={3} />
      </div>

      <button type="submit" className={styles.btn} disabled={saving}>
        {saving ? 'Сохранение...' : isEdit ? 'Сохранить изменения' : 'Создать ресторан'}
      </button>
    </form>
  );
};

export default OwnerRestaurantForm;
