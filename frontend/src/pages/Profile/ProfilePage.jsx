import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth.api';
import { favoritesApi } from '../../api/favorites.api';
import { reservationsApi } from '../../api/reservations.api';
import { restaurantsApi } from '../../api/restaurants.api';
import Navbar from '../../components/Navbar/Navbar';
import ValidatedForm from '../../components/ValidatedForm/ValidatedForm';
import { useValidationTooltip } from '../../hooks/useValidationTooltip';
import { formatUserRole } from '../../utils/formatUserRole';
import { reservationTableLabel } from '../../utils/reservationTableLabel';
import { isValidBelarusPhone, belarusPhoneValidationMessage } from '../../utils/phoneValidation';
import { markFieldInvalid } from '../../utils/fieldValidation';
import styles from './ProfilePage.module.css';

const RES_STATUS_LABELS = {
  PENDING: 'Ожидает',
  CONFIRMED: 'Подтверждено',
  CANCELLED: 'Отменено',
  COMPLETED: 'Завершено',
};

const ProfilePage = () => {
  const { user, updateUser } = useAuth();

  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const phoneInputRef = useRef(null);
  const { showMessage, dismissMessage, ValidationTooltipPortal } = useValidationTooltip();
  const [favorites, setFavorites] = useState([]);
  const [reservationsPreview, setReservationsPreview] = useState([]);
  const [reservationsLoading, setReservationsLoading] = useState(true);
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
    if (user?.role !== 'CLIENT') {
      setReservationsLoading(false);
      return;
    }
    favoritesApi.getMyFavorites().then(({ data }) => setFavorites(data.data)).catch(() => {});
    setReservationsLoading(true);
    reservationsApi
      .getMyReservations()
      .then(({ data }) => {
        const list = data.data || [];
        const sorted = [...list].sort((a, b) => {
          const ap = ['PENDING', 'CONFIRMED'].includes(a.status) ? 0 : 1;
          const bp = ['PENDING', 'CONFIRMED'].includes(b.status) ? 0 : 1;
          if (ap !== bp) return ap - bp;
          return new Date(b.date) - new Date(a.date);
        });
        setReservationsPreview(sorted.slice(0, 6));
      })
      .catch(() => setReservationsPreview([]))
      .finally(() => setReservationsLoading(false));
  }, [user]);

  useEffect(() => {
    setForm({ name: user?.name || '', phone: user?.phone || '' });
  }, [user?.name, user?.phone]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'phone' && phoneInputRef.current) {
      markFieldInvalid(phoneInputRef.current, false);
      if (isValidBelarusPhone(value)) dismissMessage();
    }
  };

  const validatePhoneField = () => {
    const msg = belarusPhoneValidationMessage(form.phone);
    if (!msg) {
      markFieldInvalid(phoneInputRef.current, false);
      return true;
    }
    markFieldInvalid(phoneInputRef.current, true);
    showMessage(phoneInputRef.current, msg);
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validatePhoneField()) return;
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

  const renderPhoneField = (label = 'Телефон') => (
    <div className={styles.field}>
      <label htmlFor="profile-phone">{label}</label>
      <input
        ref={phoneInputRef}
        id="profile-phone"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        data-validate-phone=""
        value={form.phone}
        onChange={handleChange}
        placeholder="+375 29 123-45-67"
      />
    </div>
  );

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
        <div
          className={`${styles.inner} ${user?.role === 'OWNER' ? styles.innerWide : ''} ${user?.role === 'CLIENT' ? styles.innerClient : ''}`}
        >
          <h1 className={styles.title}>
            {user?.role === 'OWNER' ? 'Профиль ресторатора' : 'Мой профиль'}
          </h1>

          {user?.role === 'OWNER' ? (
            <div className={styles.ownerGrid}>
              <section className={`${styles.card} ${styles.ownerCard} ${styles.ownerCabinet}`}>
                <h2>Кабинет ресторатора</h2>
                <div className={styles.ownerCardBody}>
                  <p className={styles.lead}>
                    Управляйте карточками заведений, столами в зале, меню, акциями и гостевыми бронированиями в одном
                    разделе.
                  </p>
                  <p className={styles.metaLine}>
                    Заведений в гиде:{' '}
                    <strong>{establishmentCount === null ? '…' : establishmentCount}</strong>
                  </p>
                </div>
                <Link to="/cabinet/restaurateur" className={styles.cabinetLink}>
                  Перейти в кабинет ресторатора
                </Link>
              </section>

              <aside className={`${styles.card} ${styles.ownerCard} ${styles.ownerInsight}`}>
                <h2>Ваши заведения</h2>
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
                <p className={`${styles.ownerQuote} ${styles.ownerCardFooter}`}>
                  «Гость запоминает сервис так же, как вкус блюда» — держите карточки и зал в актуальном состоянии.
                </p>
              </aside>

              <section className={`${styles.card} ${styles.ownerCard} ${styles.ownerAccount}`}>
                <h2>Контакты и учётная запись</h2>
                {avatarBlock}

                {success && <p className={styles.success}>{success}</p>}
                {error && <p className={styles.error}>{error}</p>}

                <ValidatedForm onSubmit={handleSubmit} className={styles.form}>
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
                  {renderPhoneField('Телефон для связи с гостями')}
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
                </ValidatedForm>
              </section>

              <section className={`${styles.card} ${styles.ownerCard} ${styles.ownerPlacesCard}`}>
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
          ) : user?.role === 'CLIENT' ? (
            <div className={styles.clientLayout}>
              <div className={styles.clientMain}>
                <section className={`${styles.card} ${styles.clientAccountCard}`}>
                  <h2>Контакты и учётная запись</h2>
                  {avatarBlock}

                  {success && <p className={styles.success}>{success}</p>}
                  {error && <p className={styles.error}>{error}</p>}

                  <ValidatedForm onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.field}>
                      <label>Имя</label>
                      <input name="name" value={form.name} onChange={handleChange} required />
                    </div>
                    {renderPhoneField()}
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
                  </ValidatedForm>
                </section>
              </div>

              <aside className={styles.clientAside}>
                <section className={`${styles.card} ${styles.clientHighlightCard} ${styles.clientQuickCard}`}>
                  <h2>Быстрые действия</h2>
                  <div className={styles.quickGrid} spellCheck={false} translate="no">
                    <Link to="/reservations" className={styles.quickTile} spellCheck={false} translate="no">
                      <span className={styles.quickIcon} aria-hidden>◷</span>
                      <span className={styles.quickTitle}>Мои брони</span>
                      <span className={styles.quickDesc}>Статусы и изменения</span>
                    </Link>
                    <Link to="/restaurants" className={styles.quickTile} spellCheck={false} translate="no">
                      <span className={styles.quickIcon} aria-hidden>◎</span>
                      <span className={styles.quickTitle}>Заведения</span>
                      <span className={styles.quickDesc}>Подбор и бронь</span>
                    </Link>
                  </div>
                </section>

                <div className={styles.clientDualGrid}>
                <section className={`${styles.card} ${styles.clientPanelCard}`}>
                  <div className={styles.cardHeadRow}>
                    <h2>Ближайшие бронирования</h2>
                    <Link to="/reservations" className={styles.cardHeadLink}>Все →</Link>
                  </div>
                  <div className={styles.clientPanelScroll}>
                  {reservationsLoading ? (
                    <p className={styles.mutedLine}>Загрузка…</p>
                  ) : reservationsPreview.length === 0 ? (
                    <div className={styles.emptyBlock}>
                      <p className={styles.empty}>Пока нет бронирований</p>
                      <Link to="/restaurants" className={styles.emptyCta}>Выбрать ресторан</Link>
                    </div>
                  ) : (
                    <ul className={styles.resPreviewList}>
                      {reservationsPreview.map((r) => (
                        <li key={r.id} className={styles.resPreviewItem}>
                          <div className={styles.resPreviewMain}>
                            <Link to={`/restaurants/${r.restaurantId}`} className={styles.resPreviewName}>
                              {r.restaurant?.name || 'Ресторан'}
                            </Link>
                            <span className={styles.resPreviewMeta}>
                              {new Date(r.date).toLocaleString('ru-RU', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {reservationTableLabel(r) ? ` · ${reservationTableLabel(r)}` : ''}
                              {r.guestsCount ? ` · ${r.guestsCount} гост.` : ''}
                            </span>
                          </div>
                          <span className={`${styles.resBadge} ${styles[`res_${(r.status || '').toLowerCase()}`]}`}>
                            {RES_STATUS_LABELS[r.status] || r.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  </div>
                </section>

                <section className={`${styles.card} ${styles.clientPanelCard}`}>
                  <div className={styles.cardHeadRow}>
                    <h2>Избранное</h2>
                    {favorites.length > 0 && (
                      <Link to="/restaurants" className={styles.cardHeadLink}>Каталог →</Link>
                    )}
                  </div>
                  <div className={styles.clientPanelScroll}>
                  {favorites.length === 0 ? (
                    <div className={styles.emptyBlock}>
                      <p className={styles.empty}>В избранном пока ничего нет</p>
                      <Link to="/restaurants" className={styles.emptyCta}>Добавить из каталога</Link>
                    </div>
                  ) : (
                    <ul className={styles.favGrid}>
                      {favorites.map((fav) => {
                        const rest = fav.restaurant;
                        const img = rest?.coverImage || rest?.imageUrl;
                        return (
                          <li key={fav.id} className={styles.favCard}>
                            <Link to={`/restaurants/${fav.restaurantId}`} className={styles.favCardLink}>
                              <div
                                className={styles.favCardMedia}
                                style={img ? { backgroundImage: `url(${img})` } : undefined}
                              >
                                {!img && <span className={styles.favCardPlaceholder}>◎</span>}
                                {rest?.avgRating != null && (
                                  <span className={styles.favCardRating}>
                                    ★ {Number(rest.avgRating).toFixed(1)}
                                  </span>
                                )}
                              </div>
                              <div className={styles.favCardBody}>
                                <span className={styles.favCardName}>{rest?.name}</span>
                                <span className={styles.favCardMeta}>
                                  {[rest?.cuisine, rest?.city].filter(Boolean).join(' · ') || 'Ресторан'}
                                </span>
                              </div>
                            </Link>
                            <button
                              type="button"
                              className={styles.favCardRemove}
                              onClick={() => handleRemoveFavorite(fav.restaurantId)}
                              aria-label="Убрать из избранного"
                              title="Убрать из избранного"
                            >
                              ×
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  </div>
                </section>
                </div>
              </aside>
            </div>
          ) : (
            <div className={styles.grid}>
              <section className={styles.card}>
                <h2>Контакты и учётная запись</h2>
                {avatarBlock}

                {success && <p className={styles.success}>{success}</p>}
                {error && <p className={styles.error}>{error}</p>}

                <ValidatedForm onSubmit={handleSubmit} className={styles.form}>
                  <div className={styles.field}>
                    <label>Имя</label>
                    <input name="name" value={form.name} onChange={handleChange} required />
                  </div>
                  {renderPhoneField()}
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
                </ValidatedForm>
              </section>
            </div>
          )}
        </div>
      </main>
      <ValidationTooltipPortal />
    </>
  );
};

export default ProfilePage;
