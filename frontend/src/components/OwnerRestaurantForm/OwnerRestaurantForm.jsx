import { useEffect, useMemo, useState } from 'react';
import { YMaps, Map, Placemark } from '@pbe/react-yandex-maps';
import { restaurantsApi } from '../../api/restaurants.api';
import styles from './OwnerRestaurantForm.module.css';

const MINSK_CENTER = [53.9023, 27.5619];
const YANDEX_MAPS_API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY || '';

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
  });
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [manualPointEnabled, setManualPointEnabled] = useState(false);
  const [manualPoint, setManualPoint] = useState(null);
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
      });
      setExistingImages((restaurant.images || []).map((img) => img.url).filter(Boolean));
      if (restaurant.latitude && restaurant.longitude) {
        setManualPoint([Number(restaurant.latitude), Number(restaurant.longitude)]);
      } else {
        setManualPoint(null);
      }
      setManualPointEnabled(false);
      setNewImages([]);
    } else {
      setForm({
        name: '',
        description: '',
        address: '',
        cuisine: '',
        phone: '',
        openTime: '',
        closeTime: '',
      });
      setExistingImages([]);
      setNewImages([]);
      setManualPoint([MINSK_CENTER[0], MINSK_CENTER[1]]);
      setManualPointEnabled(false);
    }
  }, [restaurant]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFilesChange = (e) => {
    const selected = Array.from(e.target.files || []);
    setNewImages(selected);
  };

  const mapState = useMemo(
    () => ({
      center: manualPoint || MINSK_CENTER,
      zoom: manualPoint ? 14 : 11,
      controls: [],
    }),
    [manualPoint]
  );

  const mapQuery = useMemo(() => {
    const query = { lang: 'ru_RU' };
    if (YANDEX_MAPS_API_KEY) {
      query.apikey = YANDEX_MAPS_API_KEY;
    }
    return query;
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    const hasCoords =
      manualPoint && Number.isFinite(manualPoint[0]) && Number.isFinite(manualPoint[1]);
    const shouldSendCoords = hasCoords && (manualPointEnabled || !isEdit);
    const payload = {
      ...form,
      existingImages,
      images: newImages,
      latitude: shouldSendCoords ? manualPoint[0] : undefined,
      longitude: shouldSendCoords ? manualPoint[1] : undefined,
    };
    try {
      let res;
      if (isEdit) {
        res = await restaurantsApi.update(restaurant.id, payload);
      } else {
        res = await restaurantsApi.create(payload);
      }
      onSaved(res.data.data);
      setExistingImages((res.data.data.images || []).map((img) => img.url));
      setNewImages([]);
      setManualPointEnabled(false);
      setSuccess(isEdit ? 'Ресторан обновлён' : 'Ресторан создан');
    } catch (err) {
      const message = err.response?.data?.message || 'Ошибка сохранения';
      setError(message);
      if (message.includes('координаты')) {
        setManualPointEnabled(true);
      }
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
          <label>Фото ресторана</label>
          <input type="file" multiple accept="image/*" onChange={handleFilesChange} />
          {newImages.length > 0 && (
            <p className={styles.helper}>Выбрано новых файлов: {newImages.length}</p>
          )}
        </div>
      </div>

      {existingImages.length > 0 && (
        <div className={styles.field}>
          <label>Текущие фото</label>
          <div className={styles.imagesRow}>
            {existingImages.map((url) => (
              <div key={url} className={styles.imageChip}>
                <img src={url} alt="restaurant" />
                <button
                  type="button"
                  onClick={() => setExistingImages((prev) => prev.filter((item) => item !== url))}
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.field}>
        <label>Точка на карте</label>
        <p className={styles.coordHint}>
          При создании ресторана без ручной точки используются координаты центра Минска — затем можно уточнить на карте.
        </p>
        <button
          type="button"
          className={styles.secondaryBtn}
          onClick={() => setManualPointEnabled((prev) => !prev)}
        >
          {manualPointEnabled ? 'Скрыть выбор точки на карте' : 'Уточнить точку на карте'}
        </button>
      </div>

      {(manualPointEnabled || !isEdit) && (
        <div className={styles.mapBlock}>
          <YMaps version="2.1" query={mapQuery}>
            <Map
              state={mapState}
              width="100%"
              height="300px"
              onClick={(event) => {
                const coords = event.get('coords');
                setManualPoint([coords[0], coords[1]]);
              }}
            >
              {manualPoint && <Placemark geometry={manualPoint} options={{ preset: 'islands#redIcon' }} />}
            </Map>
          </YMaps>
          <p className={styles.helper}>
            Нажмите на карту, чтобы выбрать точку. Адрес останется основным источником, эта точка используется как fallback.
          </p>
        </div>
      )}

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
