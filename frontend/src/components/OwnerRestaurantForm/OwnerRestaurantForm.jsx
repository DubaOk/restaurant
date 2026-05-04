import { useEffect, useMemo, useRef, useState } from 'react';
import { YMaps, Map, Placemark } from '@pbe/react-yandex-maps';
import { restaurantsApi } from '../../api/restaurants.api';
import { BELARUS_CITY_NAMES, getCityMapCenter } from '../../constants/belarusCities';
import styles from './OwnerRestaurantForm.module.css';

const YANDEX_MAPS_API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY || '';

const OwnerRestaurantForm = ({ restaurant, onSaved }) => {
  const isEdit = Boolean(restaurant);
  const [form, setForm] = useState({
    name: '',
    description: '',
    city: 'Минск',
    address: '',
    cuisine: '',
    phone: '',
    openTime: '',
    closeTime: '',
  });
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  const [manualPointEnabled, setManualPointEnabled] = useState(false);
  const [manualPoint, setManualPoint] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // address autocomplete
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestTimer = useRef(null);

  const fileInputRef = useRef(null);

  const geocodeAddress = async (address, city = form.city) => {
    if (typeof window.ymaps?.geocode !== 'function') return null;
    const q = `Беларусь, ${city}, ${address}`;
    const res = await window.ymaps.geocode(q, { results: 1 });
    const obj = res.geoObjects.get(0);
    if (!obj) return null;
    return {
      coords: obj.geometry.getCoordinates(),
      address: obj.getAddressLine(),
    };
  };

  useEffect(() => {
    if (restaurant) {
      setForm({
        name: restaurant.name || '',
        description: restaurant.description || '',
        city: restaurant.city || 'Минск',
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
      setNewPreviews([]);
    } else {
      setForm({ name: '', description: '', city: 'Минск', address: '', cuisine: '', phone: '', openTime: '', closeTime: '' });
      setExistingImages([]);
      setNewImages([]);
      setNewPreviews([]);
      setManualPoint([...getCityMapCenter('Минск')]);
      setManualPointEnabled(false);
    }
  }, [restaurant]);

  useEffect(() => {
    if (restaurant || !form.city || manualPointEnabled) return;
    setManualPoint([...getCityMapCenter(form.city)]);
  }, [form.city, restaurant, manualPointEnabled]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ── address suggest ───────────────────────────────────────
  const handleAddressInput = (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, address: value }));
    clearTimeout(suggestTimer.current);
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    suggestTimer.current = setTimeout(async () => {
      if (typeof window.ymaps?.suggest !== 'function' && typeof window.ymaps?.geocode !== 'function') return;
      try {
        let results = [];
        if (typeof window.ymaps?.suggest === 'function') {
          results = await window.ymaps.suggest(`Беларусь, ${form.city}, ${value}`, { results: 7 });
        }

        // Fallback for cases where suggest is unavailable/empty
        if ((!results || results.length === 0) && typeof window.ymaps?.geocode === 'function') {
          const geo = await window.ymaps.geocode(`Беларусь, ${form.city}, ${value}`, { results: 6 });
          results = geo.geoObjects.toArray().map((obj) => ({
            value: obj.getAddressLine(),
            displayName: obj.getAddressLine(),
          }));
        }

        setSuggestions(results || []);
        setShowSuggestions((results || []).length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 350);
  };

  const handleAddressBlur = () => {
    setTimeout(() => setShowSuggestions(false), 150);
  };

  const handleSuggestionPick = async (suggestion) => {
    setShowSuggestions(false);
    setSuggestions([]);
    const displayValue = suggestion.displayName || suggestion.value || '';
    setForm((prev) => ({ ...prev, address: displayValue }));
    try {
      const data = await geocodeAddress(suggestion.value, form.city);
      if (data?.coords) {
        setManualPoint(data.coords);
        setManualPointEnabled(true);
      }
    } catch { /* silent */ }
  };

  // ── map click → reverse geocode ───────────────────────────
  const handleMapClick = async (event) => {
    const coords = event.get('coords');
    setManualPoint(coords);
    setManualPointEnabled(true);
    if (typeof window.ymaps?.geocode !== 'function') return;
    try {
      const result = await window.ymaps.geocode(coords, { results: 1 });
      const obj = result.geoObjects.get(0);
      if (obj) {
        const addr = obj.getAddressLine();
        const clean = addr.replace(/^(Беларусь|Belarus),?\s*/i, '').replace(/^Минск,?\s*/i, '');
        setForm((prev) => ({ ...prev, address: clean }));
      }
    } catch { /* silent */ }
  };

  // ── file upload ───────────────────────────────────────────
  const handleFilesAdd = (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    setNewImages((prev) => [...prev, ...selected]);
    const previews = selected.map((f) => URL.createObjectURL(f));
    setNewPreviews((prev) => [...prev, ...previews]);
    e.target.value = '';
  };

  const removeNewImage = (idx) => {
    setNewImages((prev) => prev.filter((_, i) => i !== idx));
    setNewPreviews((prev) => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const mapState = useMemo(() => {
    const center = manualPoint || getCityMapCenter(form.city);
    return { center, zoom: manualPoint ? 14 : 11, controls: [] };
  }, [manualPoint, form.city]);

  const mapQuery = useMemo(() => {
    const query = { lang: 'ru_RU', load: 'package.full' };
    if (YANDEX_MAPS_API_KEY) query.apikey = YANDEX_MAPS_API_KEY;
    return query;
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    const hasCoords = manualPoint && Number.isFinite(manualPoint[0]) && Number.isFinite(manualPoint[1]);
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
      setNewPreviews([]);
      setManualPointEnabled(false);
      setSuccess(isEdit ? 'Карточка обновлена' : 'Заведение добавлено в гид');
    } catch (err) {
      const message = err.response?.data?.message || 'Ошибка сохранения';
      setError(message);
      if (message.includes('координаты')) setManualPointEnabled(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <YMaps version="2.1" query={mapQuery}>
    <form onSubmit={handleSubmit} className={styles.form}>
      <h2>{isEdit ? 'Карточка заведения' : 'Новое заведение в гиде'}</h2>

      {success && <p className={styles.success}>{success}</p>}
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.grid}>
        <div className={styles.field}>
          <label>Название заведения *</label>
          <input name="name" value={form.name} onChange={handleChange} required />
        </div>
        <div className={styles.field}>
          <label>Кухня *</label>
          <input name="cuisine" value={form.cuisine} onChange={handleChange} required placeholder="Итальянская" />
        </div>
        <div className={styles.field}>
          <label>Город *</label>
          <div className={styles.selectWrap}>
            <select name="city" value={form.city} onChange={handleChange} required className={styles.select}>
              {BELARUS_CITY_NAMES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <span className={styles.selectArrow}>▾</span>
          </div>
        </div>
        <div className={styles.field}>
          <label>Адрес заведения *</label>
          <div className={styles.suggestWrap}>
            <input
              name="address"
              value={form.address}
              onChange={handleAddressInput}
              onBlur={handleAddressBlur}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              required
              placeholder="ул. Ленина, 1"
              autoComplete="off"
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className={styles.suggestList}>
                {suggestions.map((s, i) => (
                  <li key={i} className={styles.suggestItem} onMouseDown={() => handleSuggestionPick(s)}>
                    {s.displayName || s.value}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className={styles.field}>
          <label>Телефон</label>
          <input name="phone" value={form.phone} onChange={handleChange} placeholder="+375 17 XXX-XX-XX" />
        </div>
        <div className={styles.field}>
          <label>Открытие зала</label>
          <input name="openTime" value={form.openTime} onChange={handleChange} placeholder="10:00" />
        </div>
        <div className={styles.field}>
          <label>Последний приём гостей</label>
          <input name="closeTime" value={form.closeTime} onChange={handleChange} placeholder="23:00" />
        </div>
      </div>

      {/* ── Photos ───────────────────────────────────────── */}
      <div className={styles.photosSection}>
        <span className={styles.photosLabel}>Фото интерьера / зала</span>
        <div className={styles.imagesRow}>
          {existingImages.map((url) => (
            <div key={url} className={styles.imageChip}>
              <img src={url} alt="restaurant" />
              <button
                type="button"
                className={styles.imageChipRemove}
                onClick={() => setExistingImages((prev) => prev.filter((item) => item !== url))}
              >
                ✕
              </button>
            </div>
          ))}
          {newPreviews.map((src, idx) => (
            <div key={src} className={`${styles.imageChip} ${styles.imageChipNew}`}>
              <img src={src} alt="new" />
              <button type="button" className={styles.imageChipRemove} onClick={() => removeNewImage(idx)}>✕</button>
              <span className={styles.imageChipNewBadge}>Новое</span>
            </div>
          ))}
          <button
            type="button"
            className={styles.addPhotoBtn}
            onClick={() => fileInputRef.current?.click()}
            title="Добавить фото"
          >
            <span className={styles.addPhotoPlus}>+</span>
            <span className={styles.addPhotoText}>Добавить</span>
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFilesAdd}
        />
        {newImages.length > 0 && (
          <p className={styles.helper}>Новых файлов для загрузки: {newImages.length}</p>
        )}
      </div>

      {/* ── Map ──────────────────────────────────────────── */}
      <div className={styles.field}>
        <label>Точка на карте</label>
        <p className={styles.coordHint}>
          Нажмите на карту, чтобы задать точную геолокацию — или введите адрес выше для автоматического определения.
        </p>
        {!manualPointEnabled && isEdit && (
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => setManualPointEnabled(true)}
          >
            Уточнить точку на карте
          </button>
        )}
      </div>

      {(manualPointEnabled || !isEdit) && (
        <div className={styles.mapBlock}>
          <Map
            state={mapState}
            width="100%"
            height="300px"
            onClick={handleMapClick}
          >
            {manualPoint && <Placemark geometry={manualPoint} options={{ preset: 'islands#darkOrangeIcon' }} />}
          </Map>
          <p className={styles.helper}>
            Нажмите на карту — адрес заполнится автоматически.
          </p>
        </div>
      )}

      <div className={styles.field}>
        <label>Описание</label>
        <textarea name="description" value={form.description} onChange={handleChange} rows={3} />
      </div>

      <button type="submit" className={styles.btn} disabled={saving}>
        {saving ? 'Сохранение...' : isEdit ? 'Сохранить карточку' : 'Добавить в гид'}
      </button>
    </form>
    </YMaps>
  );
};

export default OwnerRestaurantForm;
