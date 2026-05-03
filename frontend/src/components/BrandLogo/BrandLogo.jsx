import styles from './BrandLogo.module.css';

/** Логотип «Бурмалда»: маркер на карте + акцент гастронавигатора по Беларуси */
const BrandLogo = ({ compact = false }) => (
  <span className={`${styles.wrap} ${compact ? styles.compact : ''}`} aria-hidden>
    <svg className={styles.mark} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="smkm-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f4e4bc" />
          <stop offset="55%" stopColor="#d4a574" />
          <stop offset="100%" stopColor="#8b5a2b" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="18" fill="rgba(20,24,30,0.92)" stroke="url(#smkm-grad)" strokeWidth="1.4" />
      <path
        fill="none"
        stroke="url(#smkm-grad)"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 26c2.2-4.5 4-9.2 5.5-14M17 24.5c1.8-3.8 3.2-7.8 4.5-12M23 25c1.5-3.2 2.8-6.5 4-10M28 23.5c.8-2 1.6-4 2.5-6"
      />
      <path
        fill="url(#smkm-grad)"
        d="M19.2 9.2h1.6v5.4l-.35 1.9h-.9l-.35-1.9V9.2zm-3.1 0h1.55v5.2l-.3 1.85h-.95l-.3-1.85V9.2z"
      />
    </svg>
  </span>
);

export default BrandLogo;
