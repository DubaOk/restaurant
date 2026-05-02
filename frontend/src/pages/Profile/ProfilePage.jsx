import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth.api';
import { bonusesApi } from '../../api/bonuses.api';
import { favoritesApi } from '../../api/favorites.api';
import Navbar from '../../components/Navbar/Navbar';
import styles from './ProfilePage.module.css';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();

  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [bonuses, setBonuses] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [spendAmount, setSpendAmount] = useState('');
  const [spendDesc, setSpendDesc] = useState('');
  const [spendError, setSpendError] = useState('');
  const [spendSuccess, setSpendSuccess] = useState('');
  const [spending, setSpending] = useState(false);

  useEffect(() => {
    if (user?.role === 'CLIENT') {
      bonusesApi.getMyBalance().then(({ data }) => setBonuses(data.data.balance));
      bonusesApi.getMyTransactions().then(({ data }) => setTransactions(data.data));
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

  const handleSpend = async (e) => {
    e.preventDefault();
    const amount = parseInt(spendAmount, 10);
    if (!amount || amount <= 0) {
      setSpendError('Введите корректное количество баллов');
      return;
    }
    if (amount > bonuses) {
      setSpendError('Недостаточно бонусов на счёте');
      return;
    }
    setSpending(true);
    setSpendError('');
    setSpendSuccess('');
    try {
      await bonusesApi.spend(amount, spendDesc || 'Списание бонусов');
      setBonuses((prev) => prev - amount);
      bonusesApi.getMyTransactions().then(({ data }) => setTransactions(data.data));
      setSpendSuccess(`Списано ${amount} бонусов`);
      setSpendAmount('');
      setSpendDesc('');
    } catch (err) {
      setSpendError(err.response?.data?.message || 'Ошибка списания');
    } finally {
      setSpending(false);
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

  return (
    <>
      <Navbar />
      <main className={styles.shell}>
        <div className={styles.inner}>
          <h1 className={styles.title}>Мой профиль</h1>

          <div className={styles.grid}>
            <section className={styles.card}>
              <h2>Личные данные</h2>

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
                  <label>Роль</label>
                  <input value={user?.role || ''} disabled />
                </div>
                <button type="submit" className={styles.btn} disabled={saving}>
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </form>
            </section>

            {user?.role === 'CLIENT' && (
              <section className={styles.card}>
                <h2>Бонусный счёт</h2>
                <p className={styles.balance}>
                  {bonuses !== null ? `${bonuses} бонусов` : 'Загрузка...'}
                </p>

                <form onSubmit={handleSpend} className={styles.spendForm}>
                  <h3 className={styles.spendTitle}>Списать бонусы</h3>
                  {spendError && <p className={styles.error}>{spendError}</p>}
                  {spendSuccess && <p className={styles.success}>{spendSuccess}</p>}
                  <div className={styles.spendRow}>
                    <input
                      type="number"
                      className={styles.spendInput}
                      placeholder="Количество"
                      min={1}
                      max={bonuses || 0}
                      value={spendAmount}
                      onChange={(e) => setSpendAmount(e.target.value)}
                    />
                    <input
                      type="text"
                      className={styles.spendInput}
                      placeholder="Описание (необязательно)"
                      value={spendDesc}
                      onChange={(e) => setSpendDesc(e.target.value)}
                    />
                    <button type="submit" className={styles.spendBtn} disabled={spending || bonuses === 0}>
                      {spending ? '...' : 'Списать'}
                    </button>
                  </div>
                </form>

                <h3>История транзакций</h3>
                {transactions.length === 0 ? (
                  <p className={styles.empty}>Транзакций пока нет</p>
                ) : (
                  <ul className={styles.txList}>
                    {transactions.map((tx) => (
                      <li key={tx.id} className={`${styles.tx} ${tx.type === 'EARN' ? styles.earn : styles.spend}`}>
                        <span>{tx.description}</span>
                        <span>{tx.type === 'EARN' ? `+${tx.amount}` : `-${tx.amount}`}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {user?.role === 'CLIENT' && (
              <section className={`${styles.card} ${styles.cardWide}`}>
                <h2>Избранные рестораны</h2>
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
                          <span className={styles.favMeta}>{fav.restaurant?.cuisine} · {fav.restaurant?.address}</span>
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
        </div>
      </main>
    </>
  );
};

export default ProfilePage;
