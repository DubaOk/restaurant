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
import ReservationForm from '../../components/ReservationForm/ReservationForm';
import PromotionList from '../../components/PromotionList/PromotionList';
import styles from './RestaurantPage.module.css';

const defaultTeam = [
  {
    name: 'Борис Зарьков',
    role: 'ресторатор',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=240&q=80',
  },
  {
    name: 'Владимир Мухин',
    role: 'бренд-шеф',
    avatar: 'https://images.unsplash.com/photo-1581299894341-367e31d4af37?auto=format&fit=crop&w=240&q=80',
  },
];

const cuisineRecommendations = {
  'Европейская кухня': {
    chef: ['Тартар из говядины с трюфельным кремом', 'Томленые щечки с сельдереем', 'Палтус с соусом из шампанского'],
    bar: ['French 75', 'Negroni Bianco', 'Signature Spritz с бергамотом'],
  },
  'Итальянская кухня': {
    chef: ['Карпаччо из тунца с цитрусом', 'Паста с трюфельным маслом', 'Ризотто с белыми грибами'],
    bar: ['Aperol Spritz', 'Bellini', 'Milano Sour'],
  },
};

const buildGallery = (restaurant) => {
  const urls = restaurant.images?.length
    ? restaurant.images.map((img) => img.url)
    : restaurant.imageUrl
      ? [restaurant.imageUrl]
      : [];

  const fallback = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1500&q=80';
  const prepared = [...urls];
  while (prepared.length < 4) prepared.push(prepared[prepared.length - 1] || fallback);
  return prepared.slice(0, 4);
};

const getRecommendations = (restaurant, promotions) => {
  const byCuisine = cuisineRecommendations[restaurant.cuisine];
  if (byCuisine) return byCuisine;

  const promoBased = promotions?.slice(0, 3).map((p) => p.title) || [];
  return {
    chef: promoBased.length ? promoBased : ['Авторское сет-меню от шефа', 'Фермерские сезонные продукты', 'Десерт дня'],
    bar: ['Домашние лимонады', 'Классические коктейли', 'Подборка премиальных вин'],
  };
};

const RestaurantPage = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const [restaurant, setRestaurant] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
        if (restRes.status !== 'fulfilled') {
          throw new Error('restaurant_load_failed');
        }

        setRestaurant(restRes.value.data.data);
        setReviews(reviewsRes.status === 'fulfilled' ? reviewsRes.value.data.data : []);
        setPromotions(promoRes.status === 'fulfilled' ? promoRes.value.data.data : []);
        setMenuItems(menuRes.status === 'fulfilled' ? menuRes.value.data.data : []);

        if (user?.role === 'CLIENT') {
          try {
            const favRes = await favoritesApi.getMyFavorites();
            const favIds = favRes.data.data.map((f) => f.restaurantId);
            setIsFavorite(favIds.includes(parseInt(id, 10)));
          } catch {
            setIsFavorite(false);
          }
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
      if (isFavorite) {
        await favoritesApi.remove(id);
      } else {
        await favoritesApi.add(id);
      }
      setIsFavorite((prev) => !prev);
    } catch {
      /* silent */
    }
  };

  const handleReviewCreated = (newReview) => {
    setReviews((prev) => [newReview, ...prev]);
  };

  const handleReviewUpdated = (updated) => {
    setReviews((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const menuByCategory = menuItems.reduce((acc, item) => {
    const cat = item.category || 'Прочее';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  if (loading) {
    return (
      <>
        <Navbar />
        <div className={`${styles.pageShell} ${styles.pageShellCentered}`}>
          <p className={styles.loading}>Загрузка...</p>
        </div>
      </>
    );
  }
  if (error) {
    return (
      <>
        <Navbar />
        <div className={`${styles.pageShell} ${styles.pageShellCentered}`}>
          <p className={styles.error}>{error}</p>
        </div>
      </>
    );
  }
  if (!restaurant) return null;
  const gallery = buildGallery(restaurant);
  const recs = getRecommendations(restaurant, promotions);
  const team = defaultTeam;

  return (
    <>
      <Navbar />
      <div className={styles.pageShell}>
      <main className={styles.page}>
        <section className={styles.overview}>
          <Link to="/restaurants" className={styles.backLink}>
            ← Назад к списку
          </Link>

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
            <h1>Ресторан {restaurant.name}</h1>
            <div className={styles.awards}>
              <span className={styles.awardItem}><span className={styles.awardIcon}>A</span> Выбор A-Club</span>
              <span className={styles.awardItem}><span className={styles.awardIcon}>★</span> Премиальный гид</span>
              <span className={styles.awardItem}><span className={styles.awardIcon}>#{restaurant.avgRating != null ? Number(restaurant.avgRating).toFixed(1) : '5.0'}</span> Рейтинг</span>
            </div>
            <p className={styles.description}>
              {restaurant.description || 'Проект, который сочетает авторскую кухню, безупречный сервис и премиальную атмосферу в центре Минска.'}
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

          <section className={styles.teamSection}>
            {team.map((member) => (
              <article key={member.name} className={styles.person}>
                <img src={member.avatar} alt={member.name} className={styles.personAvatar} />
                <div className={styles.personInfo}>
                  <p className={styles.personName}>{member.name} <span>→</span></p>
                  <p className={styles.personRole}>{member.role}</p>
                </div>
              </article>
            ))}
          </section>

          <section className={styles.recommendations}>
            <div className={styles.recCol}>
              <h2>Рекомендации шеф-повара</h2>
              <ul>
                {recs.chef.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div className={styles.recCol}>
              <h2>Рекомендации шеф-бартендера</h2>
              <ul>
                {recs.bar.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </section>

          <section className={styles.contacts}>
            <h2>Адрес ресторана {restaurant.name}</h2>
            <div className={styles.contactGrid}>
              <p><span>⌖</span>{restaurant.address || 'Адрес уточняется'}</p>
              <p><span>◷</span>{restaurant.openTime || '--:--'} - {restaurant.closeTime || '--:--'}</p>
              <p><span>☏</span>{restaurant.phone || 'Телефон уточняется'}</p>
              <p><span>◎</span>{restaurant.cuisine || 'Европейская кухня'}</p>
            </div>
          </section>
        </section>

        {user?.role === 'CLIENT' && (
          <section id="booking" className={styles.bookingFullBleed}>
            <div className={styles.bookingBleedInner}>
              <div className={styles.bookingHeader}>
                <h2 className={styles.sectionTitle}>Бронирование</h2>
              </div>
              <ReservationForm restaurantId={id} />
            </div>
          </section>
        )}

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

          <aside className={styles.sideCol}>
            {promotions.length > 0 && (
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Акции</h2>
                </div>
                <div className={styles.sectionBody}>
                  <PromotionList promotions={promotions} />
                </div>
              </section>
            )}
          </aside>
        </div>
      </main>
      </div>
    </>
  );
};

export default RestaurantPage;
