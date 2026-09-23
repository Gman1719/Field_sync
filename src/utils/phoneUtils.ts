// src/utils/phoneUtils.ts
// Ethiopian Phone Number Validation and Normalization Utilities (Frontend)

export const ETHIOPIAN_PHONE_REGEX = /^(?:\+251[97]\d{8}|0[97]\d{8})$/;

/**
 * Validates whether a phone number matches standard Ethiopian mobile format:
 * +2519XXXXXXXX, +2517XXXXXXXX, 09XXXXXXXX, or 07XXXXXXXX
 * Returns true if empty (since phone is optional).
 */
export const validateEthiopianPhone = (phone?: string | null): boolean => {
  if (!phone || phone.trim() === '') return true; // Phone is optional
  const cleanPhone = phone.trim().replace(/\s+/g, '');
  return ETHIOPIAN_PHONE_REGEX.test(cleanPhone);
};

/**
 * Normalizes an Ethiopian phone number to international format:
 * 0912345678 -> +251912345678
 * 0712345678 -> +251712345678
 * +251912345678 -> +251912345678
 */
export const normalizeEthiopianPhone = (phone?: string | null): string => {
  if (!phone) return '';
  const cleanPhone = phone.trim().replace(/\s+/g, '');
  if (!cleanPhone) return '';

  if (cleanPhone.startsWith('09')) {
    return '+2519' + cleanPhone.slice(2);
  }
  if (cleanPhone.startsWith('07')) {
    return '+2517' + cleanPhone.slice(2);
  }
  if (cleanPhone.startsWith('+251')) {
    return cleanPhone;
  }

  return cleanPhone;
};

/**
 * Formats a phone number cleanly for UI display
 */
export const formatEthiopianPhone = (phone?: string | null): string => {
  if (!phone) return '—';
  const normalized = normalizeEthiopianPhone(phone);
  if (normalized.length === 13) {
    // Format: +251 91 234 5678
    return `${normalized.slice(0, 4)} ${normalized.slice(4, 6)} ${normalized.slice(6, 9)} ${normalized.slice(9)}`;
  }
  return normalized || phone;
};

export default {
  ETHIOPIAN_PHONE_REGEX,
  validateEthiopianPhone,
  normalizeEthiopianPhone,
  formatEthiopianPhone,
};
