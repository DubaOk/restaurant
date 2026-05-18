import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFloatingPopup } from '../../hooks/useFloatingPopup';
import { usePopupDismiss } from '../../hooks/usePopupDismiss';
import styles from './TimePicker.module.css';

const MINUTES = [0, 15, 30, 45];
const POPULAR = ['18:00', '19:00', '19:30', '20:00', '20:30'];
const POPUP_WIDTH = 300;

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

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function filterSlotsForDate(slots, selectedDate) {
  if (!slots || !selectedDate || selectedDate !== todayISO()) return slots;
  const now = new Date();
  const cutoff = now.getHours() * 60 + now.getMinutes() + 14;
  return slots.filter((slot) => toMins(slot) > cutoff);
}

function groupSlots(slots) {
  const groups = [
    { id: 'morning', label: 'Утро', from: 0, to: 11 * 60 + 59 },
    { id: 'day', label: 'День', from: 12 * 60, to: 16 * 60 + 59 },
    { id: 'evening', label: 'Вечер', from: 17 * 60, to: 24 * 60 },
  ];
  return groups
    .map((g) => ({
      ...g,
      slots: slots.filter((s) => {
        const m = toMins(s);
        return m >= g.from && m <= g.to;
      }),
    }))
    .filter((g) => g.slots.length > 0);
}

function pickDefaultPeriod(slotGroups, value) {
  if (!slotGroups.length) return null;
  if (value) {
    const hit = slotGroups.find((g) => g.slots.includes(value));
    if (hit) return hit.id;
  }
  return slotGroups.find((g) => g.id === 'evening')?.id ?? slotGroups[slotGroups.length - 1].id;
}

function ClockIcon() {
  return (
    <svg className={styles.triggerIconSvg} viewBox="0 0 20 20" width="17" height="17" aria-hidden>
      <circle cx="10" cy="10" r="7.25" fill="none" stroke="currentColor" strokeWidth="1.35" />
      <path d="M10 5.5v4.5l3 2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function TimePicker({
  value,
  onChange,
  openTime,
  closeTime,
  selectedDate,
  placeholder = 'Выберите время',
  popupAlign = 'start',
}) {
  const [open, setOpen] = useState(false);
  const [periodId, setPeriodId] = useState(null);
  const triggerRef = useRef(null);
  const popupRef = useRef(null);
  const { h: selH, m: selM } = parseHHMM(value);

  const rangeSlots = useMemo(() => {
    const base = openTime && closeTime ? slotsInRange(openTime, closeTime) : null;
    return filterSlotsForDate(base, selectedDate);
  }, [openTime, closeTime, selectedDate]);

  const slotGroups = useMemo(() => (rangeSlots ? groupSlots(rangeSlots) : []), [rangeSlots]);

  const popularInRange = useMemo(() => {
    if (!rangeSlots) return [];
    const set = new Set(rangeSlots);
    return POPULAR.filter((t) => set.has(t));
  }, [rangeSlots]);

  const activeGroup = useMemo(
    () => slotGroups.find((g) => g.id === periodId) ?? slotGroups[0] ?? null,
    [slotGroups, periodId],
  );

  useEffect(() => {
    if (!open) return;
    setPeriodId(pickDefaultPeriod(slotGroups, value));
  }, [open, slotGroups, value]);

  const align = popupAlign === 'end' ? 'end' : 'start';
  const { coords, placement, ready } = useFloatingPopup({
    open,
    triggerRef,
    popupRef,
    align,
    popupWidth: POPUP_WIDTH,
  });

  usePopupDismiss(open, setOpen, triggerRef, popupRef);

  const pickSlot = (slot) => {
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

  const hoursLabel = openTime && closeTime ? `${openTime} – ${closeTime}` : null;

  const popupStyle = coords
    ? {
        top: coords.top,
        left: coords.left,
        width: coords.width,
        visibility: 'visible',
        opacity: 1,
      }
    : {
        position: 'fixed',
        top: -9999,
        left: 0,
        width: POPUP_WIDTH,
        visibility: 'hidden',
        opacity: 0,
        pointerEvents: 'none',
      };

  const popup = open ? (
    <div
      ref={popupRef}
      className={`${styles.popup} ${placement === 'above' ? styles.popupAbove : ''} ${ready ? styles.popupReady : ''}`}
      style={popupStyle}
      role="dialog"
      aria-label="Выбор времени"
    >
      <div className={styles.popupHead}>
        <div>
          <span className={styles.popupTitle}>Время визита</span>
          {hoursLabel && <span className={styles.popupSub}>{hoursLabel}</span>}
        </div>
        {value && <span className={styles.popupCurrent}>{value}</span>}
      </div>

      {popularInRange.length > 0 && (
        <div className={styles.popularBlock}>
          <span className={styles.popularLabel}>Популярное</span>
          <div className={styles.popularRow}>
            {popularInRange.map((slot) => (
              <button
                key={slot}
                type="button"
                className={`${styles.popularBtn} ${slot === value ? styles.slotSelected : ''}`}
                onClick={() => pickSlot(slot)}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      )}

      {rangeSlots && rangeSlots.length > 0 ? (
        <>
          {slotGroups.length > 1 && (
            <div className={styles.periodTabs} role="tablist" aria-label="Период дня">
              {slotGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  role="tab"
                  aria-selected={group.id === periodId}
                  className={`${styles.periodTab} ${group.id === periodId ? styles.periodTabActive : ''}`}
                  onClick={() => setPeriodId(group.id)}
                >
                  {group.label}
                </button>
              ))}
            </div>
          )}
          {activeGroup && (
            <div className={styles.slotScroll}>
              <div className={styles.slotGrid} role="listbox" aria-label={activeGroup.label}>
                {activeGroup.slots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    role="option"
                    aria-selected={slot === value}
                    className={`${styles.slotBtn} ${slot === value ? styles.slotSelected : ''}`}
                    onClick={() => pickSlot(slot)}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : rangeSlots && rangeSlots.length === 0 ? (
        <p className={styles.emptyHint}>На сегодня свободных слотов уже нет — выберите другую дату.</p>
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
  ) : null;

  return (
    <div className={styles.root}>
      <button
        ref={triggerRef}
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
          <ClockIcon />
        </span>
        <span className={styles.triggerText}>{value || placeholder}</span>
        <span className={`${styles.triggerArrow} ${open ? styles.triggerArrowUp : ''}`} aria-hidden>›</span>
      </button>

      {popup && createPortal(popup, document.body)}
    </div>
  );
}
