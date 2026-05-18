import { useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFloatingPopup } from '../../hooks/useFloatingPopup';
import { usePopupDismiss } from '../../hooks/usePopupDismiss';
import styles from './CustomSelect.module.css';

/**
 * Кастомный дропдаун в стиле DatePicker / TimePicker (тёмная тема + золото).
 */
export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Выберите…',
  disabled = false,
  className = '',
  popupAlign = 'start',
  id: idProp,
  'aria-label': ariaLabel,
}) {
  const autoId = useId();
  const listId = `${autoId}-list`;
  const triggerId = idProp || autoId;

  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const popupRef = useRef(null);

  const selected = useMemo(
    () => options.find((o) => o.value === value),
    [options, value],
  );

  const displayLabel = selected?.label ?? (value ? String(value) : '');

  const align = popupAlign === 'end' ? 'end' : 'start';
  const { coords } = useFloatingPopup({
    open,
    triggerRef,
    popupRef,
    align,
  });

  usePopupDismiss(open, setOpen, triggerRef, popupRef);

  const pick = (opt) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
  };

  const popup = open ? (
    <div
      id={listId}
      ref={popupRef}
      role="listbox"
      aria-labelledby={triggerId}
      className={styles.popup}
      style={
        coords
          ? { ...coords, width: Math.max(coords.minWidth, 200) }
          : { visibility: 'hidden' }
      }
    >
      {options.map((opt) => (
        <button
          key={opt.value === '' ? '__empty__' : opt.value}
          type="button"
          role="option"
          aria-selected={opt.value === value}
          disabled={opt.disabled}
          className={[
            styles.option,
            opt.value === value ? styles.optionSelected : '',
            opt.disabled ? styles.optionDisabled : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => pick(opt)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div className={`${styles.root} ${className}`.trim()} ref={triggerRef}>
      <button
        type="button"
        id={triggerId}
        className={[
          styles.trigger,
          open ? styles.triggerOpen : '',
          !displayLabel ? styles.triggerPlaceholder : '',
          disabled ? styles.triggerDisabled : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
      >
        <span className={styles.triggerLabel}>{displayLabel || placeholder}</span>
        <span className={`${styles.triggerArrow} ${open ? styles.triggerArrowUp : ''}`} aria-hidden>
          ›
        </span>
      </button>

      {popup && createPortal(popup, document.body)}
    </div>
  );
}
