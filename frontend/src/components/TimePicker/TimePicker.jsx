import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './TimePicker.module.css';

const MINUTES = [0, 15, 30, 45];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function parseHHMM(s) {
  const def = { h: 19, m: 0 };
  if (!s || typeof s !== 'string') return def;
  const [hs, ms] = s.split(':');
  const h = Math.min(23, Math.max(0, parseInt(hs, 10) || 0));
  const rawM = parseInt(ms, 10);
  if (!Number.isFinite(rawM)) return { h, m: 0 };
  const m = MINUTES.reduce(
    (best, cand) => (Math.abs(cand - rawM) < Math.abs(best - rawM) ? cand : best),
    MINUTES[0],
  );
  return { h, m };
}

function toMins(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** All quarter-hour strings from openTime to closeTime inclusive */
function slotsInRange(openTime, closeTime) {
  const a = toMins(openTime);
  const b = toMins(closeTime);
  if (a == null || b == null || b < a) return null;
  const out = [];
  for (let t = a; t <= b; t += 15) {
    const h = Math.floor(t / 60) % 24;
    const m = t % 60;
    out.push(`${pad2(h)}:${pad2(m)}`);
  }
  return out.length ? out : null;
}

/**
 * TimePicker — same visual language as DatePicker (dark + gold).
 * value / onChange: "HH:MM" (24h)
 */
export default function TimePicker({
  value,
  onChange,
  openTime,
  closeTime,
  placeholder = 'Выберите время',
  /** 'end' — прижать всплывающее окно к правому краю (вторая колонка сетки) */
  popupAlign = 'start',
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const { h: selH, m: selM } = parseHHMM(value);

  const rangeSlots = useMemo(
    () => (openTime && closeTime ? slotsInRange(openTime, closeTime) : null),
    [openTime, closeTime],
  );

  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const displayValue = value ? value : '';

  const pickFromList = (slot) => {
    onChange(slot);
    setOpen(false);
  };

  const pickHour = (hour) => {
    onChange(`${pad2(hour)}:${pad2(selM)}`);
  };

  const pickMinute = (minute) => {
    onChange(`${pad2(selH)}:${pad2(minute)}`);
    setOpen(false);
  };

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''} ${!value ? styles.triggerPlaceholder : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className={styles.triggerIcon}>◷</span>
        <span>{displayValue || placeholder}</span>
        <span className={`${styles.triggerArrow} ${open ? styles.triggerArrowUp : ''}`}>›</span>
      </button>

      {open && (
        <div
          className={`${styles.popup} ${popupAlign === 'end' ? styles.popupAlignEnd : ''}`}
          role="dialog"
          aria-label="Выбор времени"
        >
          <div className={styles.popupTitle}>Время</div>

          {rangeSlots ? (
            <div className={styles.slotList} role="listbox">
              {rangeSlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  role="option"
                  aria-selected={slot === value}
                  className={`${styles.slotBtn} ${slot === value ? styles.slotBtnSelected : ''}`}
                  onClick={() => pickFromList(slot)}
                >
                  {slot}
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className={styles.subLabel}>Часы</div>
              <div className={styles.hourGrid}>
                {Array.from({ length: 24 }, (_, hour) => (
                  <button
                    key={hour}
                    type="button"
                    className={`${styles.hourBtn} ${hour === selH ? styles.cellSelected : ''}`}
                    onClick={() => pickHour(hour)}
                  >
                    {pad2(hour)}
                  </button>
                ))}
              </div>
              <div className={styles.subLabel}>Минуты</div>
              <div className={styles.minRow}>
                {MINUTES.map((minute) => (
                  <button
                    key={minute}
                    type="button"
                    className={`${styles.minBtn} ${minute === selM ? styles.cellSelected : ''}`}
                    onClick={() => pickMinute(minute)}
                  >
                    {pad2(minute)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
