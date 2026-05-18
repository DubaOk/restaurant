import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import ValidationTooltip from '../ValidationTooltip/ValidationTooltip';
import {
  findFirstInvalidField,
  getFieldValidationMessage,
  markFieldInvalid,
} from '../../utils/fieldValidation';

function getFieldKey(field) {
  if (!field) return '';
  if (field.id) return field.id;
  if (field.name) return `name:${field.name}`;
  return '';
}

function resolveField(form, key) {
  if (!form || !key) return null;
  if (key.startsWith('name:')) {
    return form.querySelector(`[name="${CSS.escape(key.slice(5))}"]`);
  }
  return form.querySelector(`#${CSS.escape(key)}`);
}

const ValidatedForm = ({ onSubmit, children, ...rest }) => {
  const formRef = useRef(null);
  const [fieldError, setFieldError] = useState(null);
  const [tooltipAnchor, setTooltipAnchor] = useState(null);

  const showFieldError = useCallback((field) => {
    if (!field) return;
    const key = getFieldKey(field);
    markFieldInvalid(field, true);
    setFieldError({
      key,
      message: getFieldValidationMessage(field),
    });
  }, []);

  const clearFieldError = useCallback((field) => {
    if (!field?.checkValidity?.()) return;
    const key = getFieldKey(field);
    setFieldError((prev) => {
      if (!prev || prev.key !== key) return prev;
      markFieldInvalid(field, false);
      return null;
    });
  }, []);

  const handleSubmit = (e) => {
    const form = e.currentTarget;
    const invalid = findFirstInvalidField(form);
    if (invalid) {
      e.preventDefault();
      e.stopPropagation();
      showFieldError(invalid);
      return;
    }
    setFieldError(null);
    form.querySelectorAll('[data-validation-invalid]').forEach((el) => {
      markFieldInvalid(el, false);
    });
    onSubmit?.(e);
  };

  const handleInvalid = (e) => {
    e.preventDefault();
    e.stopPropagation();
    showFieldError(e.target);
  };

  useLayoutEffect(() => {
    if (!fieldError) {
      setTooltipAnchor(null);
      return;
    }
    setTooltipAnchor(resolveField(formRef.current, fieldError.key));
  }, [fieldError]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return undefined;

    const onInput = (e) => {
      const { target } = e;
      if (
        target instanceof HTMLInputElement
        || target instanceof HTMLSelectElement
        || target instanceof HTMLTextAreaElement
      ) {
        clearFieldError(target);
      }
    };

    form.addEventListener('input', onInput);
    return () => {
      form.removeEventListener('input', onInput);
    };
  }, [clearFieldError]);

  return (
    <form
      ref={formRef}
      {...rest}
      noValidate
      onSubmit={handleSubmit}
      onInvalid={handleInvalid}
    >
      {children}
      <ValidationTooltip anchor={tooltipAnchor} message={fieldError?.message ?? ''} />
    </form>
  );
};

export default ValidatedForm;
