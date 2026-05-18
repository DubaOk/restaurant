const VALIDATABLE_SELECTOR =
  'input:not([type=hidden]):not([type=button]):not([type=submit]):not([type=reset]), select, textarea';

function fieldLabel(input) {
  const id = input.id;
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label) return label.textContent.replace(/\*/g, '').trim();
  }
  if (input.labels?.length) {
    return input.labels[0].textContent.replace(/\*/g, '').trim();
  }
  const placeholder = input.getAttribute('placeholder');
  if (placeholder) return placeholder.replace(/\*/g, '').trim();
  return 'поле';
}

function formatDateTimeLocalMin(min) {
  if (!min) return min;
  const d = new Date(min);
  if (Number.isNaN(d.getTime())) return min;
  return d.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getFieldValidationMessage(input) {
  if (!input || input.validity?.valid) return '';

  const label = fieldLabel(input);
  const v = input.validity;

  if (v.valueMissing) {
    return `Укажите «${label}».`;
  }
  if (v.typeMismatch) {
    if (input.type === 'email') return 'Введите корректный email, например name@example.com.';
    if (input.type === 'url') return 'Введите корректный адрес сайта.';
    return 'Значение имеет неверный формат.';
  }
  if (v.tooShort) {
    return `«${label}»: минимум ${input.minLength} символов.`;
  }
  if (v.tooLong) {
    return `«${label}»: не больше ${input.maxLength} символов.`;
  }
  if (v.rangeUnderflow) {
    if (input.type === 'datetime-local' || input.type === 'date') {
      return `Выберите дату и время не раньше ${formatDateTimeLocalMin(input.min)}.`;
    }
    return `«${label}»: значение не меньше ${input.min}.`;
  }
  if (v.rangeOverflow) {
    return `«${label}»: значение не больше ${input.max}.`;
  }
  if (v.stepMismatch) return 'Введите допустимое значение.';
  if (v.patternMismatch) {
    if (input.name === 'phone' || input.dataset.validatePhone != null) {
      return 'Телефон: +375 XX XXX-XX-XX (код 17, 25, 29, 33 или 44) или оставьте пустым.';
    }
    return 'Значение не соответствует требуемому формату.';
  }
  if (v.badInput) return 'Некорректное значение.';
  return 'Проверьте введённые данные.';
}

export function findFirstInvalidField(form) {
  if (!form) return null;
  const fields = form.querySelectorAll(VALIDATABLE_SELECTOR);
  for (const field of fields) {
    if (field.disabled) continue;
    if (!field.willValidate) continue;
    if (!field.checkValidity()) return field;
  }
  return null;
}

export function markFieldInvalid(field, invalid) {
  if (!field) return;
  if (invalid) {
    field.setAttribute('data-validation-invalid', '');
  } else {
    field.removeAttribute('data-validation-invalid');
  }
}
