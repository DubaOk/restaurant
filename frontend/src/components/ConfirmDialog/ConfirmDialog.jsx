import styles from './ConfirmDialog.module.css';

/**
 * Встроенное подтверждение вместо window.confirm.
 * @param {{ open: boolean; title: string; message: string; confirmLabel?: string; cancelLabel?: string; variant?: 'danger'|'default'; onConfirm: () => void; onCancel: () => void }} props
 */
const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  variant = 'default',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className={styles.backdrop} role="presentation" onClick={onCancel}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className={styles.title}>
          {title}
        </h2>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.btnGhost} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={variant === 'danger' ? styles.btnDanger : styles.btnPrimary}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
