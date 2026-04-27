import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Navbar.module.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className={styles.navbar}>
      <div className={styles.inner}>
        <Link to="/restaurants" className={styles.brand}>
          🍽 Рестораны Минска
        </Link>

        <nav className={styles.nav}>
          <Link to="/restaurants">Рестораны</Link>

          {user?.role === 'CLIENT' && (
            <>
              <Link to="/reservations">Бронирования</Link>
              <Link to="/profile">Профиль</Link>
            </>
          )}

          {user?.role === 'OWNER' && (
            <Link to="/owner">Мой ресторан</Link>
          )}

          {user?.role === 'ADMIN' && (
            <Link to="/admin">Администрирование</Link>
          )}

          {user ? (
            <button className={styles.logoutBtn} onClick={handleLogout}>
              Выйти
            </button>
          ) : (
            <>
              <Link to="/login">Войти</Link>
              <Link to="/register" className={styles.registerBtn}>
                Регистрация
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
