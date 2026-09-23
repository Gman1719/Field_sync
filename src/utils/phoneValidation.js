// src/utils/phoneValidation.js - Shared Ethiopian phone validation
export const ETHIOPIAN_PHONE_REGEX = /^(?:\+251[97]\d{8}|0[97]\d{8})$/;

/**
 * Checks if a string is a valid Ethiopian phone number.
 * Accepts formats: +2519XXXXXXXX, +2517XXXXXXXX, 09XXXXXXXX, 07XXXXXXXX
 */
export const isValidEthiopianPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  return ETHIOPIAN_PHONE_REGEX.test(phone.trim());
};

/**
 * Normalizes an Ethiopian phone number to canonical international format +251XXXXXXXXX
 */
export const normalizeEthiopianPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return '';
  const trimmed = phone.trim();
  if (trimmed.startsWith('0')) {
    return '+251' + trimmed.slice(1);
  }
  return trimmed;
};

/**
 * Form validation helper returning friendly error string or empty string
 */
export const validateEthiopianPhone = (phone, required = true, customError = null) => {
  const trimmed = (phone || '').trim();
  if (!trimmed) {
    return required ? 'Phone number is required' : '';
  }
  if (!isValidEthiopianPhone(trimmed)) {
    return customError || 'Phone must be valid Ethiopian format (+2519/7XXXXXXXX or 09/7XXXXXXXX)';
  }
  return '';
};

export default {
  ETHIOPIAN_PHONE_REGEX,
  isValidEthiopianPhone,
  normalizeEthiopianPhone,
  validateEthiopianPhone
};
