import { useEffect } from 'react';

/**
 * Закрытие попапа по клику вне и Escape.
 */
export function usePopupDismiss(open, setOpen, triggerRef, popupRef) {
  useEffect(() => {
    if (!open) return undefined;

    const onPointer = (e) => {
      const t = triggerRef.current;
      const p = popupRef.current;
      if (t?.contains(e.target) || p?.contains(e.target)) return;
      setOpen(false);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, setOpen, triggerRef, popupRef]);
}
