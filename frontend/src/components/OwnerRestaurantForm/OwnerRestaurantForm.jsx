import { useEffect, useMemo, useRef, useState } from 'react';
import { YMaps, Map, Placemark, useYMaps } from '@pbe/react-yandex-maps';
import { restaurantsApi } from '../../api/restaurants.api';
import { BELARUS_CITY_NAMES, getCityMapCenter } from '../../constants/belarusCities';
import styles from './OwnerRestaurantForm.module.css';

const YANDEX_MAPS_API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY || '';

function formatAddressForField(fullLine) {
  if (!fullLine) return '';
  return fullLine
    .replace(/^(Беларусь|Belarus),?\s*/i, '')
    .replace(/^Республика Беларусь,?\s*/i, '')
    .trim();
}

/**
 * Вложенный компонент — должен быть внутри <YMaps>, чтобы использовать useYMaps.
 * Все geo-операции (suggest, geocode, reverse) идут через браузерный ymaps JS API,
 * поскольку HTTP-ключи ограничены по реферреру и работают только из браузера.
 */
const GeoAddressAndMap = ({ address, city, manualPoint, onAddressChange, onPointChange, mapState }) => {
  const ymaps = useYMaps(['geocode', 'suggest']);

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const suggestTimer = useRef(null);
  const cityRef = useRef(city);
  useEffect(() => { cityRef.current = city; }, [city]);

  /** Получить подсказки через ymaps.suggest(), fallback — ymaps.geocode() с несколькими результатами */
  const fetchSuggestions = async (text) => {
    if (!ymaps) return [];
    const query = `${cityRef.current}, ${text}`;

    // Пробуем suggest (работает, если на ключе включён сервис Suggest)
    try {
      const items = await ymaps.suggest(query, { results: 10 });
      if (Array.isArray(items) && items.length > 0) {
        return items.map((item) => ({
          displayName: item.displayName,
          geocodeQuery: item.value,
          coords: null,
        }));
      }
    } catch { /* suggest недоступен — переходим к fallback */ }

    // Fallback: geocode с несколькими результатами (работает всегда через JS API)
    try {
      const res = await ymaps.geocode(query, { results: 8 });
      const out = [];
      for (let i = 0; i < res.geoObjects.getLength(); i++) {
        const obj = res.geoObjects.get(i);
        const line = obj.getAddressLine();
        if (line) {
          out.push({
            displayName: line,
            geocodeQuery: line,
            coords: obj.geometry.getCoordinates(),
          });
        }
      }
      return out;
    } catch { return []; }
  };

  const handleInput = (e) => {
    const value = e.target.value;
    onAddressChange(value);
    clearTimeout(suggestTimer.current);
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSuggestLoading(false);
      return;
    }
    suggestTimer.current = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const list = await fetchSuggestions(value.trim());
        setSuggestions(list);
        setShowSuggestions(list.length > 0);
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setSuggestLoading(false);
      }
    }, 300);
  };

  const handlePick = async (suggestion) => {
    setShowSuggestions(false);
    setSuggestions([]);
    onAddressChange(formatAddressForField(suggestion.displayName) || suggestion.displayName);
    // Если coords уже известны из fallback — ставим сразу
    if (suggestion.coords) {
      onPointChange(suggestion.coords);
      return;
    }
    if (!ymaps) return;
    try {
      const res = await ymaps.geocode(suggestion.geocodeQuery, { results: 1 });
      const obj = res.geoObjects.get(0);
      if (obj) onPointChange(obj.geometry.getCoordinates());
    } catch { /* silent */ }
  };

  const handleMapClick = async (event) => {
    const coords = event.get('coords');
    onPointChange(coords);
    if (!ymaps) return;
    try {
      const res = await ymaps.geocode(coords, { results: 1 });
      const obj = res.geoObjects.get(0);
      if (obj) {
        const line = obj.getAddressLine();
        onAddressChange(formatAddressForField(line) || line);
      }
    } catch { /* silent */ }
  };

  return (
    <>
      <div className={styles.field}>
        <label>Адрес заведения *</label>
        <div className={styles.suggestWrap}>
          <input
            name="address"
            value={address}
            onChange={handleInput}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            required
            placeholder="Начните вводить улицу и дом — появятся подсказки"
            autoComplete="off"
          />
          {suggestLoading && <span className={styles.suggestLoading}>Поиск…</span>}
          {showSuggestions && suggestions.length > 0 && (
            <ul className={styles.suggestList} role="listbox">
              {suggestions.map((s, i) => (
                <li
                  key={`${s.value}-${i}`}
                  className={styles.suggestItem}
                  role="option"
                  onMouseDown={(ev) => { ev.preventDefault(); handlePick(s); }}
                >
                  {s.displayName}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className={styles.field}>
        <label>Карта</label>
        <p className={styles.coordHint}>
          Выберите адрес из подсказок — метка встанет автоматически. Или нажмите на карту: адрес подставится по координатам.
        </p>
      </div>

      <div className={styles.mapBlock}>
        <Map
          state={mapState}
          width="100%"
          height="340px"
          onClick={handleMapClick}
        >
          {manualPoint && (
            <Placemark
              geometry={manualPoint}
              options={{ preset: 'islands#darkOrangeDotIcon' }}
            />
          )}
        </Map>
      </div>
    </>
  );
};

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
  const [manualPoint, setManualPoint] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef(null);

  const cityCenter = useMemo(() => getCityMapCenter(form.city), [form.city]);

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
      if (restaurant.latitude != null && restaurant.longitude != null) {
        setManualPoint([Number(restaurant.latitude), Number(restaurant.longitude)]);
      } else {
        setManualPoint(null);
      }
      setNewImages([]);
      setNewPreviews([]);
    } else {
      setForm({
        name: '',
        description: '',
        city: 'Минск',
        address: '',
        cuisine: '',
        phone: '',
        openTime: '',
        closeTime: '',
      });
      setExistingImages([]);
      setNewImages([]);
      setNewPreviews([]);
      setManualPoint([...getCityMapCenter('Минск')]);
    }
  }, [restaurant]);

  useEffect(() => {
    if (restaurant || !form.city) return;
    setManualPoint([...getCityMapCenter(form.city)]);
  }, [form.city, restaurant]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFilesAdd = (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    setNewImages((prev) => [...prev, ...selected]);
    setNewPreviews((prev) => [...prev, ...selected.map((f) => URL.createObjectURL(f))]);
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
    const center = manualPoint || cityCenter;
    return { center, zoom: manualPoint ? 16 : 11, controls: ['zoomControl', 'fullscreenControl'] };
  }, [manualPoint, cityCenter]);

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
    const payload = {
      ...form,
      existingImages,
      images: newImages,
      latitude: hasCoords ? manualPoint[0] : undefined,
      longitude: hasCoords ? manualPoint[1] : undefined,
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
      setSuccess(isEdit ? 'Карточка обновлена' : 'Заведение добавлено в гид');
    } catch (err) {
      const message = err.response?.data?.message || 'Ошибка сохранения';
      setError(message);
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

        <GeoAddressAndMap
          address={form.address}
          city={form.city}
          manualPoint={manualPoint}
          onAddressChange={(value) => setForm((prev) => ({ ...prev, address: value }))}
          onPointChange={setManualPoint}
          mapState={mapState}
        />

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
