import { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin.api';
import Navbar from '../../components/Navbar/Navbar';
import styles from './AdminPage.module.css';

const AdminPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .getUsers()
      .then(({ data }) => setUsers(data.data))
      .catch(() => setError('Не удалось загрузить пользователей'))
      .finally(() => setLoading(false));
  }, []);

  const toggleBlock = async (user) => {
    try {
      if (user.isBlocked) {
        await adminApi.unblockUser(user.id);
      } else {
        await adminApi.blockUser(user.id);
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, isBlocked: !u.isBlocked } : u
        )
      );
    } catch {
      /* silent */
    }
  };

  return (
    <>
      <Navbar />
      <main className={styles.page}>
        <h1>Панель администратора</h1>

        {error && <p className={styles.error}>{error}</p>}

        {loading ? (
          <p className={styles.loading}>Загрузка...</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Имя</th>
                  <th>Email</th>
                  <th>Роль</th>
                  <th>Статус</th>
                  <th>Действие</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className={u.isBlocked ? styles.blocked : ''}>
                    <td>{u.id}</td>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>
                      <span className={`${styles.badge} ${u.isBlocked ? styles.badgeBlocked : styles.badgeActive}`}>
                        {u.isBlocked ? 'Заблокирован' : 'Активен'}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`${styles.btn} ${u.isBlocked ? styles.unblock : styles.block}`}
                        onClick={() => toggleBlock(u)}
                      >
                        {u.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
};

export default AdminPage;
