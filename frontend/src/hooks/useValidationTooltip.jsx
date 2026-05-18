import { useCallback, useRef, useState } from 'react';
import ValidationTooltip from '../components/ValidationTooltip/ValidationTooltip';
import { getFieldValidationMessage, markFieldInvalid } from '../utils/fieldValidation';

export function useValidationTooltip() {
  const anchorRef = useRef(null);
  const [tooltipMessage, setTooltipMessage] = useState('');

  const dismissMessage = useCallback(() => {
    anchorRef.current = null;
    setTooltipMessage('');
  }, []);

  const showMessage = useCallback((anchor, message) => {
    if (!anchor || !message) return false;
    anchorRef.current = anchor;
    setTooltipMessage(message);
    return true;
  }, []);

  const showFieldError = useCallback((field) => {
    if (!field) return false;
    markFieldInvalid(field, true);
    showMessage(field, getFieldValidationMessage(field));
    return true;
  }, [showMessage]);

  const clearFieldError = useCallback((field) => {
    if (!field?.checkValidity?.()) return;
    if (anchorRef.current === field) {
      markFieldInvalid(field, false);
      anchorRef.current = null;
      setTooltipMessage('');
    }
  }, []);

  const validateField = useCallback((field) => {
    if (!field) return true;
    if (field.checkValidity()) {
      clearFieldError(field);
      return true;
    }
    showFieldError(field);
    return false;
  }, [clearFieldError, showFieldError]);

  const ValidationTooltipPortal = useCallback(
    () => (
      <ValidationTooltip anchor={anchorRef.current} message={tooltipMessage} />
    ),
    [tooltipMessage],
  );

  return {
    validateField,
    showFieldError,
    showMessage,
    dismissMessage,
    clearFieldError,
    ValidationTooltipPortal,
  };
}
