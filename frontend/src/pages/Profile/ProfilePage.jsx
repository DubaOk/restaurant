import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth.api';
import { bonusesApi } from '../../api/bonuses.api';
import { useEffect } from 'react';
import Navbar from '../../components/Navbar/Navbar';
import styles from './ProfilePage.module.css';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();

  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [bonuses, setBonuses] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.role === 'CLIENT') {
      bonusesApi.getMyBalance().then(({ data }) => setBonuses(data.data.balance));
      bonusesApi.getMyTransactions().then(({ data }) => setTransactions(data.data));
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

  return (
    <>
      <Navbar />
      <main className={styles.page}>
        <h1>Мой профиль</h1>

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
        </div>
      </main>
    </>
  );
};

export default ProfilePage;
