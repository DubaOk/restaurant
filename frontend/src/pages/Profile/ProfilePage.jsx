import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth.api';
import { favoritesApi } from '../../api/favorites.api';
import { restaurantsApi } from '../../api/restaurants.api';
import Navbar from '../../components/Navbar/Navbar';
import { formatUserRole } from '../../utils/formatUserRole';
import styles from './ProfilePage.module.css';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();

  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [favorites, setFavorites] = useState([]);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef(null);

  const [establishmentCount, setEstablishmentCount] = useState(null);
  const [ownerPlaces, setOwnerPlaces] = useState([]);

  useEffect(() => {
    if (user?.role === 'OWNER' && user?.id) {
      restaurantsApi
        .getAll({ ownerId: user.id })
        .then(({ data }) => {
          const list = data.data || [];
          setOwnerPlaces(list);
          setEstablishmentCount(list.length);
        })
        .catch(() => {
          setOwnerPlaces([]);
          setEstablishmentCount(null);
        });
    } else {
      setOwnerPlaces([]);
      setEstablishmentCount(null);
    }
  }, [user]);

  const ownerAvgRating = useMemo(() => {
    const rated = ownerPlaces.filter((p) => p.avgRating != null && Number.isFinite(Number(p.avgRating)));
    if (!rated.length) return null;
    const sum = rated.reduce((s, p) => s + Number(p.avgRating), 0);
    return sum / rated.length;
  }, [ownerPlaces]);

  useEffect(() => {
    if (user?.role === 'CLIENT') {
      favoritesApi.getMyFavorites().then(({ data }) => setFavorites(data.data)).catch(() => {});
    }
  }, [user]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await authApi.updateProfile(form);
      updateUser(data.data);
      setSuccess('Профиль обновлён');
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const { data } = await authApi.updateAvatar(file);
      updateUser(data.data);
    } catch {
      /* silent */
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveFavorite = async (restaurantId) => {
    try {
      await favoritesApi.remove(restaurantId);
      setFavorites((prev) => prev.filter((f) => f.restaurantId !== restaurantId));
    } catch {
      /* silent */
    }
  };

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const avatarBlock = (
    <div className={styles.avatarBlock}>
      <div
        className={styles.avatarCircle}
        onClick={() => avatarInputRef.current?.click()}
        title="Сменить фото"
      >
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="avatar" className={styles.avatarImg} />
        ) : (
          <span className={styles.avatarInitials}>{initials}</span>
        )}
        <div className={styles.avatarOverlay}>
          {avatarUploading ? '…' : '📷'}
        </div>
      </div>
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleAvatarChange}
      />
      <p className={styles.avatarHint}>Нажмите, чтобы загрузить фото</p>
    </div>
  );

  return (
    <>
      <Navbar />
      <main className={styles.shell}>
        <div className={`${styles.inner} ${user?.role === 'OWNER' ? styles.innerWide : ''}`}>
          <h1 className={styles.title}>
            {user?.role === 'OWNER' ? 'Профиль ресторатора' : 'Мой профиль'}
          </h1>

          {user?.role === 'OWNER' ? (
            <div className={styles.ownerGrid}>
              <section className={styles.card}>
                <h2>Кабинет ресторатора</h2>
                <p className={styles.lead}>
                  Управляйте карточками заведений, столами в зале, меню, акциями и гостевыми бронированиями в одном
                  разделе.
                </p>
                <p className={styles.metaLine}>
                  Заведений в гиде:{' '}
                  <strong>{establishmentCount === null ? '…' : establishmentCount}</strong>
                </p>
                <Link to="/cabinet/restaurateur" className={styles.cabinetLink}>
                  Перейти в кабинет ресторатора
                </Link>
              </section>

              <aside className={`${styles.card} ${styles.ownerInsight}`}>
                <h2>Ваша сеть в Бурмалда</h2>
                <dl className={styles.ownerStats}>
                  <div>
                    <dt>Заведений</dt>
                    <dd>{establishmentCount === null ? '…' : establishmentCount}</dd>
                  </div>
                  <div>
                    <dt>Средний рейтинг</dt>
                    <dd>{ownerAvgRating != null ? ownerAvgRating.toFixed(2) : '—'}</dd>
                  </div>
                </dl>
                <p className={styles.ownerHintTitle}>Чеклист перед сменой</p>
                <ul className={styles.ownerChecklist}>
                  <li>Проверьте актуальность меню и цен</li>
                  <li>Обновите доступность столов под бронь</li>
                  <li>Загляните в новые заявки гостей</li>
                </ul>
                <p className={styles.ownerQuote}>
                  «Гость запоминает сервис так же, как вкус блюда» — держите карточки и зал в актуальном состоянии.
                </p>
              </aside>

              <section className={styles.card}>
                <h2>Контакты и учётная запись</h2>
                {avatarBlock}

                {success && <p className={styles.success}>{success}</p>}
                {error && <p className={styles.error}>{error}</p>}

                <form onSubmit={handleSubmit} className={styles.form}>
                  <div className={styles.field}>
                    <label>Имя или публичное имя</label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      placeholder="Например, Ресторатор Иванов"
                    />
                  </div>
                  <div className={styles.field}>
                    <label>Телефон для связи с гостями</label>
                    <input name="phone" value={form.phone} onChange={handleChange} placeholder="+375 XX XXX-XX-XX" />
                  </div>
                  <div className={styles.field}>
                    <label>Email</label>
                    <input value={user?.email || ''} disabled />
                  </div>
                  <div className={styles.field}>
                    <label>Роль в сервисе</label>
                    <input value={formatUserRole(user?.role)} disabled />
                  </div>
                  <button type="submit" className={styles.btn} disabled={saving}>
                    {saving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </form>
              </section>

              <section className={`${styles.card} ${styles.ownerPlacesCard}`}>
                <h2>Заведения в гиде</h2>
                {ownerPlaces.length === 0 ? (
                  <p className={styles.empty}>Добавьте первое заведение в кабинете ресторатора — оно появится здесь.</p>
                ) : (
                  <ul className={styles.ownerPlaceList}>
                    {ownerPlaces.map((place) => (
                      <li key={place.id} className={styles.ownerPlaceRow}>
                        <div className={styles.ownerPlaceText}>
                          <span className={styles.ownerPlaceName}>{place.name}</span>
                          <span className={styles.ownerPlaceMeta}>
                            {[place.city, place.cuisine].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                        {place.avgRating != null && (
                          <span className={styles.ownerPlaceRating}>★ {Number(place.avgRating).toFixed(1)}</span>
                        )}
                        <div className={styles.ownerPlaceLinks}>
                          <Link to={`/restaurants/${place.id}`} className={styles.ownerPlaceLink}>
                            Страница
                          </Link>
                          <Link to="/cabinet/restaurateur" className={styles.ownerPlaceLinkMuted}>
                            В кабинет
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          ) : (
          <div className={styles.grid}>

            <section className={styles.card}>
              <h2>Контакты и учётная запись</h2>
              {avatarBlock}

              {success && <p className={styles.success}>{success}</p>}
              {error && <p className={styles.error}>{error}</p>}

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.field}>
                  <label>Имя</label>
                  <input name="name" value={form.name} onChange={handleChange} required />
                </div>
                <div className={styles.field}>
                  <label>Телефон</label>
                  <input name="phone" value={form.phone} onChange={handleChange} placeholder="+375 XX XXX-XX-XX" />
                </div>
                <div className={styles.field}>
                  <label>Email</label>
                  <input value={user?.email || ''} disabled />
                </div>
                <div className={styles.field}>
                  <label>Роль в сервисе</label>
                  <input value={formatUserRole(user?.role)} disabled />
                </div>
                <button type="submit" className={styles.btn} disabled={saving}>
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </form>
            </section>

            {user?.role === 'CLIENT' && (
              <section className={`${styles.card} ${styles.cardWide}`}>
                <h2>Избранные заведения</h2>
                {favorites.length === 0 ? (
                  <p className={styles.empty}>В избранном пока ничего нет</p>
                ) : (
                  <ul className={styles.favList}>
                    {favorites.map((fav) => (
                      <li key={fav.id} className={styles.favItem}>
                        {fav.restaurant?.imageUrl && (
                          <img
                            src={fav.restaurant.imageUrl}
                            alt={fav.restaurant.name}
                            className={styles.favImg}
                          />
                        )}
                        <div className={styles.favInfo}>
                          <Link to={`/restaurants/${fav.restaurantId}`} className={styles.favName}>
                            {fav.restaurant?.name}
                          </Link>
                          <span className={styles.favMeta}>
                            {fav.restaurant?.cuisine}
                            {fav.restaurant?.city ? ` · ${fav.restaurant.city}` : ''} · {fav.restaurant?.address}
                          </span>
                          {fav.restaurant?.avgRating && (
                            <span className={styles.favRating}>★ {Number(fav.restaurant.avgRating).toFixed(1)}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          className={styles.favRemove}
                          onClick={() => handleRemoveFavorite(fav.restaurantId)}
                        >
                          ♥
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>
          )}
        </div>
      </main>
    </>
  );
};

export default ProfilePage;
