export const ETHIOPIAN_PHONE_REGEX = /^(?:\+251[97]\d{8}|251[97]\d{8}|0[97]\d{8}|[97]\d{8})$/;

export const isValidEthiopianPhone = (phone?: string | number | null): boolean => {
  if (!phone) return false;
  const str = phone.toString().trim();
  return ETHIOPIAN_PHONE_REGEX.test(str);
};

export const normalizeEthiopianPhone = (phone?: string | number | null): string => {
  if (!phone) return '';
  const trimmed = phone.toString().trim();
  if (trimmed.startsWith('0')) {
    return '+251' + trimmed.slice(1);
  }
  if (trimmed.startsWith('251')) {
    return '+' + trimmed;
  }
  if (!trimmed.startsWith('+') && (trimmed.startsWith('9') || trimmed.startsWith('7'))) {
    return '+251' + trimmed;
  }
  return trimmed;
};

export interface PhoneValidationResult {
  isValid: boolean;
  message: string;
}

export const validateEthiopianPhone = (
  phone?: string | number | null,
  required = true,
  customError: string | null = null
): PhoneValidationResult & string => {
  const trimmed = (phone || '').toString().trim();
  let message = '';
  let isValid = true;

  if (!trimmed) {
    if (required) {
      isValid = false;
      message = 'Phone number is required';
    }
  } else if (/^0[97]/.test(trimmed)) {
    if (trimmed.length !== 10) {
      isValid = false;
      message =
        customError ||
        `Phone number length must be 10 digits (currently ${trimmed.length}). Exactly 8 numbers required after 09/07.`;
    } else if (!/^0[97]\d{8}$/.test(trimmed)) {
      isValid = false;
      message = customError || 'Phone must contain only numbers after 09 or 07';
    }
  } else if (/^\+251[97]/.test(trimmed)) {
    const after = trimmed.slice(5);
    if (after.length !== 8 || !/^\d{8}$/.test(after)) {
      isValid = false;
      message =
        customError ||
        `There must be exactly 8 numbers after +2519 or +2517 (found ${after.length}).`;
    }
  } else if (/^251[97]/.test(trimmed)) {
    const after = trimmed.slice(4);
    if (after.length !== 8 || !/^\d{8}$/.test(after)) {
      isValid = false;
      message =
        customError ||
        `There must be exactly 8 numbers after 2519 or 2517 (found ${after.length}).`;
    }
  } else if (!/^[97]\d{8}$/.test(trimmed)) {
    isValid = false;
    message =
      customError ||
      'Invalid Ethiopian phone format. Must start with 09, 07, +2519, or +2517 followed by 8 numbers only.';
  }

  return {
    isValid,
    message,
    toString: () => message,
  } as any;
};

export default {
  ETHIOPIAN_PHONE_REGEX,
  isValidEthiopianPhone,
  normalizeEthiopianPhone,
  validateEthiopianPhone,
};
