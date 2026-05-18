import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFloatingPopup } from '../../hooks/useFloatingPopup';
import { usePopupDismiss } from '../../hooks/usePopupDismiss';
import styles from './DatePicker.module.css';

const WEEKDAYS = [
  { label: 'Пн', weekend: false },
  { label: 'Вт', weekend: false },
  { label: 'Ср', weekend: false },
  { label: 'Чт', weekend: false },
  { label: 'Пт', weekend: false },
  { label: 'Сб', weekend: true },
  { label: 'Вс', weekend: true },
];

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

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
  const startDow = (firstDay.getDay() + 6) % 7;
  const days = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d, 12));
  return days;
}

function formatTriggerDate(date, withWeekday = false) {
  if (withWeekday) {
    const wd = date.toLocaleDateString('ru-RU', { weekday: 'short' });
    const rest = date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
    });
    return `${wd}, ${rest}`;
  }
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function addDaysISO(baseDate, days) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + days);
  return dateToIso(d);
}

function CalendarIcon() {
  return (
    <svg className={styles.triggerIconSvg} viewBox="0 0 20 20" width="17" height="17" aria-hidden>
      <rect x="2.5" y="4" width="15" height="13.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.35" />
      <path d="M2.5 8.5h15" stroke="currentColor" strokeWidth="1.35" />
      <path d="M6.5 2.5v3M13.5 2.5v3" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  );
}

export default function DatePicker({
  value,
  min,
  max,
  onChange,
  placeholder = 'Выберите дату',
  popupAlign = 'start',
  quickPicks = false,
  showWeekday = false,
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const popupRef = useRef(null);

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const selected = isoToDate(value);
  const minDate = min ? isoToDate(min) : null;
  const maxDate = max ? isoToDate(max) : null;

  const initialMonth = selected ? selected.getMonth() : today.getMonth();
  const initialYear = selected ? selected.getFullYear() : today.getFullYear();

  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);

  const { coords, placement } = useFloatingPopup({
    open,
    triggerRef,
    popupRef,
    align: popupAlign,
    popupWidth: 252,
  });

  usePopupDismiss(open, setOpen, triggerRef, popupRef);

  useEffect(() => {
    if (selected) {
      setViewYear(selected.getFullYear());
      setViewMonth(selected.getMonth());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  const isDisabledDay = (day) => {
    if (minDate && day < minDate && !sameDay(day, minDate)) return true;
    if (maxDate && day > maxDate && !sameDay(day, maxDate)) return true;
    return false;
  };

  const handleDayClick = (day) => {
    if (!day || isDisabledDay(day)) return;
    onChange(dateToIso(day));
    setOpen(false);
  };

  const pickOffset = (offsetDays) => {
    const target = isoToDate(addDaysISO(today, offsetDays));
    if (!target || isDisabledDay(target)) return;
    onChange(dateToIso(target));
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
    setOpen(false);
  };

  const pickToday = () => {
    if (isDisabledDay(today)) return;
    onChange(dateToIso(today));
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setOpen(false);
  };

  const todayDisabled = isDisabledDay(today);
  const displayValue = selected ? formatTriggerDate(selected, showWeekday) : '';

  const quickPickItems = quickPicks
    ? [
        { label: 'Сегодня', offset: 0 },
        { label: 'Завтра', offset: 1 },
        { label: 'Послезавтра', offset: 2 },
      ]
    : [];
  const calendar = buildCalendar(viewYear, viewMonth);

  const popup = open ? (
    <div
      ref={popupRef}
      className={`${styles.popup} ${placement === 'above' ? styles.popupAbove : ''}`}
      style={coords ?? { visibility: 'hidden' }}
      role="dialog"
      aria-label="Выбор даты"
    >
      <div className={styles.header}>
        <button type="button" className={styles.navBtn} onClick={prevMonth} aria-label="Предыдущий месяц">‹</button>
        <div className={styles.monthLabel}>
          {MONTHS[viewMonth]}
          <span className={styles.monthLabelYear}>{viewYear}</span>
        </div>
        <button type="button" className={styles.navBtn} onClick={nextMonth} aria-label="Следующий месяц">›</button>
      </div>

      <div className={styles.grid}>
        {WEEKDAYS.map(({ label, weekend }) => (
          <div
            key={label}
            className={`${styles.weekday} ${weekend ? styles.weekdayWeekend : ''}`}
          >
            {label}
          </div>
        ))}

        {calendar.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} className={styles.dayEmpty} aria-hidden />;

          const isToday = sameDay(day, today);
          const isSelected = sameDay(day, selected);
          const disabled = isDisabledDay(day);
          const dow = (day.getDay() + 6) % 7;
          const isWeekend = dow >= 5;

          return (
            <button
              key={day.toISOString()}
              type="button"
              className={[
                styles.day,
                isToday ? styles.dayToday : '',
                isSelected ? styles.daySelected : '',
                disabled ? styles.dayDisabled : '',
                isWeekend && !isSelected ? styles.dayWeekend : '',
              ].filter(Boolean).join(' ')}
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

      <div className={styles.footer}>
        {quickPickItems.length > 0 && (
          <div className={styles.quickRow}>
            {quickPickItems.map(({ label, offset }) => {
              const target = isoToDate(addDaysISO(today, offset));
              const off = !target || isDisabledDay(target);
              const active = target && selected && sameDay(target, selected);
              return (
                <button
                  key={label}
                  type="button"
                  className={`${styles.quickBtn} ${active ? styles.quickBtnActive : ''}`}
                  disabled={off}
                  onClick={() => pickOffset(offset)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
        <button
          type="button"
          className={styles.todayBtn}
          onClick={pickToday}
          disabled={todayDisabled}
        >
          Сегодня
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className={styles.root} ref={triggerRef}>
      <button
        type="button"
        className={[
          styles.trigger,
          open ? styles.triggerOpen : '',
          !value ? styles.triggerPlaceholder : '',
        ].filter(Boolean).join(' ')}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={styles.triggerIcon}>
          <CalendarIcon />
        </span>
        <span className={styles.triggerText}>{displayValue || placeholder}</span>
        <span className={`${styles.triggerArrow} ${open ? styles.triggerArrowUp : ''}`} aria-hidden>›</span>
      </button>

      {popup && createPortal(popup, document.body)}
    </div>
  );
}
