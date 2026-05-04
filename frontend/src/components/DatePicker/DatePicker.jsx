import { useEffect, useRef, useState } from 'react';
import styles from './DatePicker.module.css';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

/* Convert "YYYY-MM-DD" ↔ Date (local noon to avoid tz shifts) */
function isoToDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

function dateToIso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function sameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildCalendar(year, month) {
  const firstDay = new Date(year, month, 1);
  // Monday-based: 0=Mon … 6=Sun
  let startDow = (firstDay.getDay() + 6) % 7;
  const days = [];
  // Leading empty slots
  for (let i = 0; i < startDow; i++) days.push(null);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d, 12));
  return days;
}

/**
 * DatePicker
 * Props:
 *   value    — "YYYY-MM-DD" | ""
 *   min      — "YYYY-MM-DD" (dates before are disabled)
 *   onChange — (iso: string) => void
 *   placeholder — string
 */
export default function DatePicker({ value, min, onChange, placeholder = 'Выберите дату' }) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const selected = isoToDate(value);
  const minDate  = isoToDate(min) ?? today;

  const initialMonth = selected
    ? selected.getMonth()
    : today.getMonth();
  const initialYear = selected
    ? selected.getFullYear()
    : today.getFullYear();

  const [viewYear,  setViewYear]  = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);

  const rootRef = useRef(null);

  // Keep view in sync with external value changes
  useEffect(() => {
    if (selected) {
      setViewYear(selected.getFullYear());
      setViewMonth(selected.getMonth());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  const handleDayClick = (day) => {
    if (!day) return;
    if (day < minDate && !sameDay(day, minDate)) return;
    onChange(dateToIso(day));
    setOpen(false);
  };

  const displayValue = selected
    ? selected.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const calendar = buildCalendar(viewYear, viewMonth);

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''} ${!value ? styles.triggerPlaceholder : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className={styles.triggerIcon}>📅</span>
        <span>{displayValue || placeholder}</span>
        <span className={`${styles.triggerArrow} ${open ? styles.triggerArrowUp : ''}`}>›</span>
      </button>

      {open && (
        <div className={styles.popup} role="dialog" aria-label="Выбор даты">
          {/* Month navigation */}
          <div className={styles.header}>
            <button type="button" className={styles.navBtn} onClick={prevMonth} aria-label="Предыдущий месяц">‹</button>
            <span className={styles.monthLabel}>
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button type="button" className={styles.navBtn} onClick={nextMonth} aria-label="Следующий месяц">›</button>
          </div>

          {/* Weekday headers */}
          <div className={styles.grid}>
            {WEEKDAYS.map((w) => (
              <div key={w} className={styles.weekday}>{w}</div>
            ))}

            {/* Day cells */}
            {calendar.map((day, idx) => {
              if (!day) return <div key={`e-${idx}`} />;
              const isToday    = sameDay(day, today);
              const isSelected = sameDay(day, selected);
              const disabled   = day < minDate && !sameDay(day, minDate);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  className={`${styles.day}
                    ${isToday    ? styles.dayToday    : ''}
                    ${isSelected ? styles.daySelected : ''}
                    ${disabled   ? styles.dayDisabled : ''}
                  `}
                  onClick={() => handleDayClick(day)}
                  disabled={disabled}
                  aria-label={day.toLocaleDateString('ru-RU')}
                  aria-pressed={isSelected}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
