import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import BrandLogo from '../BrandLogo/BrandLogo';
import { APP_NAME, APP_TAGLINE } from '../../constants/brand';
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
        <Link to="/restaurants" className={styles.brand} title={APP_TAGLINE}>
          <BrandLogo compact />
          <span className={styles.brandWordmark}>
            <span className={styles.brandTitle}>{APP_NAME}</span>
            <span className={styles.brandTagline}>{APP_TAGLINE}</span>
          </span>
        </Link>

        <div className={styles.rightCol}>
          <nav className={styles.nav}>
            <Link to="/restaurants">Заведения</Link>
            {user?.role === 'CLIENT' && <Link to="/reservations">Мои брони</Link>}
            {user?.role === 'OWNER' && <Link to="/cabinet/restaurateur">Кабинет ресторатора</Link>}
            {user?.role === 'ADMIN' && <Link to="/admin">Админ</Link>}
            <Link to="/profile">Профиль</Link>
          </nav>

          {user ? (
            <>
              <button className={styles.logoutBtn} onClick={handleLogout}>
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={styles.logoutBtn}>Войти</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
