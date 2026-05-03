import styles from './PromotionList.module.css';

const now = () => new Date();
const isActive = (p) => !p.endDate || new Date(p.endDate) >= now();

const PromotionList = ({ promotions }) => {
  const active = promotions.filter(isActive);
  if (active.length === 0) return null;

  return (
    <div className={styles.list}>
      {active.map((p) => (
        <div key={p.id} className={styles.item}>
          <h4 className={styles.title}>{p.title}</h4>
          <p className={styles.desc}>{p.description}</p>
          {(p.startDate || p.endDate) && (
            <p className={styles.dates}>
              {p.startDate && `с ${new Date(p.startDate).toLocaleDateString('ru-RU')}`}
              {p.endDate && ` по ${new Date(p.endDate).toLocaleDateString('ru-RU')}`}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default PromotionList;
