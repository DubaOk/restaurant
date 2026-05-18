/** Коды операторов / городов Беларуси (без +375) */
const BY_OPERATOR = /^(17|25|29|33|44)\d{7}$/;

/** Только цифры из строки телефона */
export function phoneDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

/** Пустое поле допустимо; иначе +375 и 9 цифр номера */
export function isValidBelarusPhone(value) {
  const raw = String(value || '').trim();
  if (!raw) return true;

  const digits = phoneDigits(raw);
  if (digits.length === 12 && digits.startsWith('375')) {
    return BY_OPERATOR.test(digits.slice(3));
  }
  if (digits.length === 9) {
    return BY_OPERATOR.test(digits);
  }
  return false;
}

export function belarusPhoneValidationMessage(value) {
  if (isValidBelarusPhone(value)) return '';
  return 'Телефон: +375 XX XXX-XX-XX (код 17, 25, 29, 33 или 44) или оставьте пустым.';
}

/** Для отображения: +375 29 123-45-67 */
export function formatBelarusPhoneDisplay(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  let digits = phoneDigits(raw);
  if (digits.length === 9) digits = `375${digits}`;
  if (digits.length !== 12 || !digits.startsWith('375')) return raw;
  const rest = digits.slice(3);
  return `+375 ${rest.slice(0, 2)} ${rest.slice(2, 5)}-${rest.slice(5, 7)}-${rest.slice(7, 9)}`;
}
