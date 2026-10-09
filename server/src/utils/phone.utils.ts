// server/src/utils/phone.utils.ts
// Ethiopian Phone Number Validation and Normalization Utilities

export const ETHIOPIAN_PHONE_REGEX = /^(?:\+251[97]\d{8}|0[97]\d{8})$/;

/**
 * Validates whether a phone number matches standard Ethiopian mobile format:
 * +2519XXXXXXXX, +2517XXXXXXXX, 09XXXXXXXX, or 07XXXXXXXX
 */
export const validateEthiopianPhone = (phone?: string | null, required: boolean = false): boolean => {
  if (!phone || phone.trim() === '') return !required;
  const cleanPhone = phone.trim().replace(/[\s\-\.\(\)]/g, '');
  return ETHIOPIAN_PHONE_REGEX.test(cleanPhone);
};

/**
 * Normalizes an Ethiopian phone number to international format:
 * 0912345678 -> +251912345678
 * 0712345678 -> +251712345678
 * +251912345678 -> +251912345678
 */
export const normalizeEthiopianPhone = (phone?: string | null): string | null => {
  if (!phone) return null;
  const cleanPhone = phone.trim().replace(/[\s\-\.\(\)]/g, '');
  if (!cleanPhone) return null;

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

export default {
  ETHIOPIAN_PHONE_REGEX,
  validateEthiopianPhone,
  normalizeEthiopianPhone,
};
