// src/utils/phoneValidation.js - Shared Ethiopian phone validation
export const ETHIOPIAN_PHONE_REGEX = /^(?:\+251[97]\d{8}|251[97]\d{8}|0[97]\d{8}|[97]\d{8})$/;

/**
 * Checks if a string or number is a valid Ethiopian phone number.
 * Accepts formats:
 * - 09XXXXXXXX (10 digits: 09 followed by 8 digits)
 * - 07XXXXXXXX (10 digits: 07 followed by 8 digits)
 * - +2519XXXXXXXX (starts with +2519 followed by 8 digits)
 * - +2517XXXXXXXX (starts with +2517 followed by 8 digits)
 * - 2519XXXXXXXX / 2517XXXXXXXX (when entered into number inputs)
 */
export const isValidEthiopianPhone = (phone) => {
  if (!phone) return false;
  const str = phone.toString().trim();
  return ETHIOPIAN_PHONE_REGEX.test(str);
};

/**
 * Normalizes an Ethiopian phone number to canonical international format +251XXXXXXXXX
 */
export const normalizeEthiopianPhone = (phone) => {
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

/**
 * Form validation helper returning precise error message or empty string
 */
export const validateEthiopianPhone = (phone, required = true, customError = null) => {
  const trimmed = (phone || '').toString().trim();
  if (!trimmed) {
    return required ? 'Phone number is required' : '';
  }

  // 1. Starts with 09 or 07 -> length must be exactly 10
  if (/^0[97]/.test(trimmed)) {
    if (trimmed.length !== 10) {
      return customError || `Phone number length must be 10 digits (currently ${trimmed.length}). Exactly 8 numbers required after 09/07.`;
    }
    if (!/^0[97]\d{8}$/.test(trimmed)) {
      return customError || 'Phone must contain only numbers after 09 or 07';
    }
    return '';
  }

  // 2. Starts with +2519 or +2517 -> exactly 8 digits after prefix
  if (/^\+251[97]/.test(trimmed)) {
    const after = trimmed.slice(5);
    if (after.length !== 8 || !/^\d{8}$/.test(after)) {
      return customError || `There must be exactly 8 numbers after +2519 or +2517 (found ${after.length}).`;
    }
    return '';
  }

  // 3. Starts with 2519 or 2517 (numeric inputs without +)
  if (/^251[97]/.test(trimmed)) {
    const after = trimmed.slice(4);
    if (after.length !== 8 || !/^\d{8}$/.test(after)) {
      return customError || `There must be exactly 8 numbers after 2519 or 2517 (found ${after.length}).`;
    }
    return '';
  }

  // 4. Starts with 9 or 7 followed by 8 digits (9 total, if leading 0 stripped)
  if (/^[97]\d{8}$/.test(trimmed)) {
    return '';
  }

  return customError || 'Invalid Ethiopian phone format. Must start with 09, 07, +2519, or +2517 followed by 8 numbers only.';
};

export default {
  ETHIOPIAN_PHONE_REGEX,
  isValidEthiopianPhone,
  normalizeEthiopianPhone,
  validateEthiopianPhone
};
