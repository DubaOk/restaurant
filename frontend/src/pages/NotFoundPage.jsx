import { Link } from 'react-router-dom';
import styles from './NotFoundPage.module.css';

const NotFoundPage = () => (
  <div className={styles.container}>
    <h1 className={styles.code}>404</h1>
    <p className={styles.message}>Страница не найдена</p>
    <Link to="/restaurants" className={styles.link}>
      Вернуться к ресторанам
    </Link>
  </div>
);

export default NotFoundPage;
