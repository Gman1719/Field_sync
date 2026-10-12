export const ETHIOPIAN_PHONE_REGEX = /^(?:\+251[97]\d{8}|0[97]\d{8})$/;

export const validateEthiopianPhone = (phone?: string | null, required: boolean = false): boolean => {
  if (!phone || phone.trim() === '') return !required;
  const cleanPhone = phone.trim().replace(/\s+/g, '');
  return ETHIOPIAN_PHONE_REGEX.test(cleanPhone);
};

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

export const formatEthiopianPhone = (phone?: string | null): string => {
  if (!phone) return '—';
  const normalized = normalizeEthiopianPhone(phone);
  if (normalized.length === 13) {

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
