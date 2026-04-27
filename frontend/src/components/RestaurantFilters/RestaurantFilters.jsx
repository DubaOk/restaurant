import styles from './RestaurantFilters.module.css';

const CUISINES = [
  '', 'Белорусская', 'Европейская', 'Итальянская', 'Японская',
  'Китайская', 'Грузинская', 'Американская', 'Французская',
];

const RestaurantFilters = ({ filters, onChange }) => {
  const handleChange = (e) => {
    onChange((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className={styles.filters}>
      <input
        className={styles.search}
        name="search"
        value={filters.search}
        onChange={handleChange}
        placeholder="Поиск по названию или адресу..."
      />

      <select name="cuisine" value={filters.cuisine} onChange={handleChange}>
        <option value="">Все кухни</option>
        {CUISINES.filter(Boolean).map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <select name="minRating" value={filters.minRating} onChange={handleChange}>
        <option value="">Любой рейтинг</option>
        <option value="3">От 3★</option>
        <option value="4">От 4★</option>
        <option value="4.5">От 4.5★</option>
      </select>

      <select name="sortBy" value={filters.sortBy} onChange={handleChange}>
        <option value="name">По названию</option>
        <option value="avgRating">По рейтингу</option>
        <option value="createdAt">По дате добавления</option>
      </select>

      <select name="sortOrder" value={filters.sortOrder} onChange={handleChange}>
        <option value="asc">По возрастанию</option>
        <option value="desc">По убыванию</option>
      </select>
    </div>
  );
};

export default RestaurantFilters;
