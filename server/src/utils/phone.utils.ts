export const ETHIOPIAN_PHONE_REGEX = /^(?:\+251[97]\d{8}|0[97]\d{8})$/;

export const validateEthiopianPhone = (phone?: string | null, required: boolean = false): boolean => {
  if (!phone || phone.trim() === '') return !required;
  const cleanPhone = phone.trim().replace(/[\s\-\.\(\)]/g, '');
  return ETHIOPIAN_PHONE_REGEX.test(cleanPhone);
};

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
