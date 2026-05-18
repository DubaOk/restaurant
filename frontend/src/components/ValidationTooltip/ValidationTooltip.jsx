import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './ValidationTooltip.module.css';

const ValidationTooltip = ({ anchor, message }) => {
  const tipRef = useRef(null);
  const [layout, setLayout] = useState(null);

  useLayoutEffect(() => {
    if (!anchor || !message) {
      setLayout(null);
      return undefined;
    }

    const update = () => {
      if (!anchor.isConnected) return;
      const rect = anchor.getBoundingClientRect();
      const tipHeight = tipRef.current?.offsetHeight ?? 52;
      const gap = 10;
      const below = rect.top - tipHeight - gap < 12;
      const top = below ? rect.bottom + gap : rect.top - tipHeight - gap;
      const maxWidth = Math.min(300, window.innerWidth - 24);
      const left = Math.max(
        12,
        Math.min(rect.left, window.innerWidth - maxWidth - 12),
      );

      setLayout({ top, left, maxWidth, below });
    };

    update();
    const raf = requestAnimationFrame(update);

    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(update)
      : null;
    ro?.observe(anchor);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [anchor, message]);

  if (!anchor || !message) return null;

  const pos = layout ?? { top: -9999, left: 0, maxWidth: 280, below: false };

  return createPortal(
    <Tag
      ref={tipRef}
      role="alert"
      className={styles.tooltip}
      style={{
        top: pos.top,
        left: pos.left,
        maxWidth: pos.maxWidth,
        opacity: layout ? 1 : 0,
      }}
    >
      <span className={styles.icon} aria-hidden>!</span>
      <span className={styles.text}>{message}</span>
      <span
        className={`${styles.arrow} ${pos.below ? styles.arrowBelow : ''}`}
        aria-hidden
      />
    </Tag>,
    document.body,
  );
};

const Tag = 'div';

export default ValidationTooltip;
