import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { restaurantsApi } from '../../api/restaurants.api';
import { reviewsApi } from '../../api/reviews.api';
import { favoritesApi } from '../../api/favorites.api';
import { promotionsApi } from '../../api/promotions.api';
import { menuApi } from '../../api/menu.api';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar/Navbar';
import ReviewList from '../../components/ReviewList/ReviewList';
import ReviewForm from '../../components/ReviewForm/ReviewForm';
import BookingWizard from '../../components/BookingWizard/BookingWizard';
import PromotionList from '../../components/PromotionList/PromotionList';
import styles from './RestaurantPage.module.css';

/* ── Helpers ───────────────────────────────────────────────── */
const DRINK_CATEGORIES = ['напитки', 'коктейли', 'вина', 'пиво', 'бар', 'drinks', 'cocktails', 'wine'];

function isDrinkCategory(cat = '') {
  return DRINK_CATEGORIES.some((k) => cat.toLowerCase().includes(k));
}

function buildGallery(restaurant) {
  const urls = restaurant.images?.length
    ? restaurant.images.map((img) => img.url)
    : restaurant.imageUrl ? [restaurant.imageUrl] : [];
  const fallback = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1500&q=80';
  const prepared = [...urls];
  while (prepared.length < 4) prepared.push(prepared[prepared.length - 1] || fallback);
  return prepared.slice(0, 4);
}

/* Picks from actual menu: food items for chef, drinks for bar */
function buildMenuPicks(menuItems) {
  const available = menuItems.filter((i) => i.isAvailable);
  const foodItems  = available.filter((i) => !isDrinkCategory(i.category));
  const drinkItems = available.filter((i) => isDrinkCategory(i.category));
  return {
    chef: foodItems.slice(0, 3),
    bar:  drinkItems.slice(0, 3),
  };
}

/* ══════════════════════════════════════════════════════════════
   RestaurantPage
═══════════════════════════════════════════════════════════════ */
const RestaurantPage = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const [restaurant, setRestaurant] = useState(null);
  const [reviews, setReviews]       = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [menuItems, setMenuItems]   = useState([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [restRes, reviewsRes, promoRes, menuRes] = await Promise.allSettled([
          restaurantsApi.getById(id),
          reviewsApi.getByRestaurant(id),
          promotionsApi.getByRestaurant(id),
          menuApi.getByRestaurant(id),
        ]);
        if (restRes.status !== 'fulfilled') throw new Error('restaurant_load_failed');

        setRestaurant(restRes.value.data.data);
        setReviews(reviewsRes.status === 'fulfilled' ? reviewsRes.value.data.data : []);
        setPromotions(promoRes.status === 'fulfilled' ? promoRes.value.data.data : []);
        setMenuItems(menuRes.status === 'fulfilled' ? menuRes.value.data.data : []);

        if (user?.role === 'CLIENT') {
          try {
            const favRes = await favoritesApi.getMyFavorites();
            const favIds = favRes.data.data.map((f) => f.restaurantId);
            setIsFavorite(favIds.includes(parseInt(id, 10)));
          } catch { setIsFavorite(false); }
        } else {
          setIsFavorite(false);
        }
      } catch {
        setError('Не удалось загрузить данные ресторана');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, user]);

  const toggleFavorite = async () => {
    if (!user) return;
    try {
      if (isFavorite) await favoritesApi.remove(id);
      else await favoritesApi.add(id);
      setIsFavorite((prev) => !prev);
    } catch { /* silent */ }
  };

  const handleReviewCreated = (newReview) => setReviews((prev) => [newReview, ...prev]);
  const handleReviewUpdated = (updated) =>
    setReviews((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));

  const menuByCategory = menuItems.reduce((acc, item) => {
    const cat = item.category || 'Прочее';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  if (loading) {
    return (<><Navbar /><div className={`${styles.pageShell} ${styles.pageShellCentered}`}><p className={styles.loading}>Загрузка...</p></div></>);
  }
  if (error) {
    return (<><Navbar /><div className={`${styles.pageShell} ${styles.pageShellCentered}`}><p className={styles.error}>{error}</p></div></>);
  }
  if (!restaurant) return null;

  const gallery   = buildGallery(restaurant);
  const menuPicks = buildMenuPicks(menuItems);
  const hasMenuPicks = menuPicks.chef.length > 0 || menuPicks.bar.length > 0;

  return (
    <>
      <Navbar />
      <div className={styles.pageShell}>
        <main className={styles.page}>

          {/* ── Overview ──────────────────────────────────────── */}
          <section className={styles.overview}>
            <Link to="/restaurants" className={styles.backLink}>← К подбору заведений</Link>

            <div className={styles.galleryGrid}>
              <div className={styles.galleryLeft}>
                <img src={gallery[0]} alt={`${restaurant.name} интерьер 1`} />
              </div>
              <div className={styles.galleryCenter}>
                <img src={gallery[1]} alt={`${restaurant.name} интерьер 2`} />
              </div>
              <div className={styles.galleryRight}>
                <img src={gallery[2]} alt={`${restaurant.name} интерьер 3`} />
                <img src={gallery[3]} alt={`${restaurant.name} интерьер 4`} />
              </div>
            </div>

            <section className={styles.headline}>
              <h1>{restaurant.name}</h1>
              <div className={styles.awards}>
                {restaurant.avgRating != null && (
                  <span className={styles.awardItem}>
                    <span className={styles.awardIcon}>★</span>
                    Рейтинг {Number(restaurant.avgRating).toFixed(1)}
                  </span>
                )}
                {restaurant.cuisine && (
                  <span className={styles.awardItem}>
                    <span className={styles.awardIcon}>◎</span>
                    {restaurant.cuisine}
                  </span>
                )}
                {restaurant.openTime && restaurant.closeTime && (
                  <span className={styles.awardItem}>
                    <span className={styles.awardIcon}>◷</span>
                    {restaurant.openTime} – {restaurant.closeTime}
                  </span>
                )}
              </div>
              <p className={styles.description}>
                {restaurant.description ||
                  `Заведение в ${restaurant.city || 'Беларуси'}: авторская кухня, сервис и атмосфера для вашего визита.`}
              </p>
              <div className={styles.actions}>
                {user && (
                  <button
                    className={`${styles.favoriteBtn} ${isFavorite ? styles.favoriteBtnActive : ''}`}
                    onClick={toggleFavorite}
                  >
                    {isFavorite ? '♥ В избранном' : '♡ В избранное'}
                  </button>
                )}
                <a href="#reviews" className={styles.linkBtn}>Отзывы</a>
                {user?.role === 'CLIENT' && (
                  <a href="#booking" className={styles.linkBtn}>Бронирование</a>
                )}
              </div>
            </section>

            {restaurant.owner && (
              <section className={styles.teamSection}>
                <article className={styles.person}>
                  <div className={styles.personAvatarWrap}>
                    {restaurant.owner.avatarUrl ? (
                      <img src={restaurant.owner.avatarUrl} alt={restaurant.owner.name} className={styles.personAvatar} />
                    ) : (
                      <div className={styles.personAvatarFallback}>
                        {restaurant.owner.name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  <div className={styles.personInfo}>
                    <p className={styles.personName}>{restaurant.owner.name}</p>
                    <p className={styles.personRole}>Ресторатор</p>
                  </div>
                </article>
              </section>
            )}

            {/* ── Menu-based recommendations ─────────────────── */}
            {hasMenuPicks && (
              <section className={styles.recommendations}>
                {menuPicks.chef.length > 0 && (
                  <div className={styles.recCol}>
                    <h2>Рекомендации кухни</h2>
                    <ul className={styles.recList}>
                      {menuPicks.chef.map((item) => (
                        <li key={item.id} className={styles.recItem}>
                          <span className={styles.recName}>{item.name}</span>
                          <span className={styles.recPrice}>
                            {Number(item.price).toFixed(2)} BYN
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {menuPicks.bar.length > 0 && (
                  <div className={styles.recCol}>
                    <h2>Рекомендации бара</h2>
                    <ul className={styles.recList}>
                      {menuPicks.bar.map((item) => (
                        <li key={item.id} className={styles.recItem}>
                          <span className={styles.recName}>{item.name}</span>
                          <span className={styles.recPrice}>
                            {Number(item.price).toFixed(2)} BYN
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            <section className={styles.contacts}>
              <h2>Как нас найти</h2>
              <div className={styles.contactGrid}>
                <p><span>⌖</span>{restaurant.city ? `${restaurant.city}, ` : ''}{restaurant.address || 'Адрес уточняется'}</p>
                <p><span>◷</span>{restaurant.openTime || '--:--'} – {restaurant.closeTime || '--:--'}</p>
                <p><span>☏</span>{restaurant.phone || 'Телефон уточняется'}</p>
                <p><span>◎</span>{restaurant.cuisine || 'Кухня уточняется'}</p>
              </div>
            </section>
          </section>

          {/* ── Booking ───────────────────────────────────────── */}
          {user?.role === 'CLIENT' && (
            <section id="booking" className={styles.bookingFullBleed}>
              <div className={styles.bookingBleedInner}>
                <div className={styles.bookingHeader}>
                  <h2 className={styles.sectionTitle}>Бронирование</h2>
                </div>
                <BookingWizard
                  restaurantId={id}
                  restaurantName={restaurant.name}
                  openTime={restaurant.openTime}
                  closeTime={restaurant.closeTime}
                  hallSchema={restaurant.hallSchema}
                />
              </div>
            </section>
          )}

          {/* ── Main content + sidebar ────────────────────────── */}
          <div className={styles.content}>
            <div className={styles.mainCol}>

              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>О ресторане</h2>
                </div>
                <div className={styles.sectionBody}>
                  <p>{restaurant.description || 'Описание ресторана скоро будет добавлено.'}</p>
                </div>
              </section>

              {menuItems.length > 0 && (
                <section className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Меню</h2>
                  </div>
                  <div className={styles.sectionBody}>
                    {Object.entries(menuByCategory).map(([category, items]) => (
                      <div key={category} className={styles.menuCategory}>
                        <h3 className={styles.categoryTitle}>{category}</h3>
                        <ul className={styles.menuList}>
                          {items.filter((i) => i.isAvailable).map((item) => (
                            <li key={item.id} className={styles.menuItem}>
                              <span className={styles.menuItemName}>{item.name}</span>
                              {item.description && (
                                <span className={styles.menuItemDesc}>{item.description}</span>
                              )}
                              <span className={styles.menuItemPrice}>
                                {item.price.toFixed(2)}&nbsp;<i className="nbrb-icon">BYN</i>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className={styles.section} id="reviews">
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Отзывы ({reviews.length})</h2>
                </div>
                <div className={styles.sectionBody}>
                  {user?.role === 'CLIENT' && (
                    <ReviewForm restaurantId={id} onCreated={handleReviewCreated} />
                  )}
                  <ReviewList
                    reviews={reviews}
                    currentUserId={user?.id}
                    onDeleted={(rid) => setReviews((prev) => prev.filter((r) => r.id !== rid))}
                    onUpdated={handleReviewUpdated}
                  />
                </div>
              </section>
            </div>

            {/* ── Sidebar: Promotions ──────────────────────────── */}
            <aside className={styles.sideCol}>
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Акции</h2>
                </div>
                <div className={styles.sectionBody}>
                  {promotions.length > 0 ? (
                    <PromotionList promotions={promotions} />
                  ) : (
                    <div className={styles.emptyPromo}>
                      <span className={styles.emptyPromoIcon}>🎁</span>
                      <p className={styles.emptyPromoText}>Акций пока нет — следите за обновлениями</p>
                    </div>
                  )}
                </div>
              </section>
            </aside>
          </div>

        </main>
      </div>
    </>
  );
};

export default RestaurantPage;
