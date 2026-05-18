import { useCallback, useLayoutEffect, useState } from 'react';

const VIEWPORT_MARGIN = 10;

/**
 * Позиционирует всплывающий блок через position:fixed относительно триггера.
 * popupWidth — фиксированная ширина (рекомендуется, чтобы не ломать grid до измерения).
 */
export function useFloatingPopup({
  open,
  triggerRef,
  popupRef,
  gap = 6,
  align = 'start',
  popupWidth,
}) {
  const [coords, setCoords] = useState(null);
  const [placement, setPlacement] = useState('below');

  const update = useCallback(() => {
    const trigger = triggerRef.current;
    const popup = popupRef.current;
    if (!trigger || !popup) return;

    const rect = trigger.getBoundingClientRect();
    const measuredW = popup.offsetWidth;
    const popupW = popupWidth ?? (measuredW > 0 ? measuredW : rect.width);
    const popupH = popup.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spaceBelow = vh - rect.bottom - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - VIEWPORT_MARGIN;

    let top;
    let place = 'below';

    if (popupH + gap <= spaceBelow) {
      top = rect.bottom + gap;
    } else if (popupH + gap <= spaceAbove) {
      top = rect.top - gap - popupH;
      place = 'above';
    } else if (spaceBelow >= spaceAbove) {
      top = Math.max(VIEWPORT_MARGIN, rect.bottom + gap);
      top = Math.min(top, vh - popupH - VIEWPORT_MARGIN);
    } else {
      top = Math.max(VIEWPORT_MARGIN, rect.top - gap - popupH);
      place = 'above';
    }

    let left = align === 'end' ? rect.right - popupW : rect.left;
    left = Math.max(VIEWPORT_MARGIN, Math.min(left, vw - popupW - VIEWPORT_MARGIN));

    setPlacement(place);
    setCoords({
      top: Math.round(top),
      left: Math.round(left),
      width: Math.round(popupW),
    });
  }, [align, gap, popupWidth, triggerRef, popupRef]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return undefined;
    }

    let raf = null;
    const scheduleUpdate = () => {
      if (raf != null) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        update();
      });
    };

    scheduleUpdate();
    const raf2 = requestAnimationFrame(scheduleUpdate);

    const popup = popupRef.current;
    let ro = null;
    if (popup && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(scheduleUpdate);
      ro.observe(popup);
    }

    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('scroll', scheduleUpdate, true);

    return () => {
      cancelAnimationFrame(raf2);
      if (raf != null) cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate, true);
    };
  }, [open, update, popupRef]);

  return { coords, placement, ready: Boolean(coords) };
}
