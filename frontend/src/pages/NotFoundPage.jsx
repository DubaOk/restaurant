import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar';
import styles from './NotFoundPage.module.css';

const NotFoundPage = () => (
  <>
    <Navbar />
    <div className={styles.shell}>
      <div className={styles.content}>
        <p className={styles.code}>404</p>
        <h1 className={styles.title}>Страница не найдена</h1>
        <p className={styles.text}>
          Адрес мог измениться или страница удалена. Вернитесь к каталогу ресторанов.
        </p>
        <Link to="/restaurants" className={styles.link}>
          К ресторанам
        </Link>
      </div>
    </div>
  </>
);

export default NotFoundPage;
