import { useState, type ChangeEvent, type FormEvent } from 'react';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
  message?: string;
  custom?: (value: any) => boolean;
}

export type ValidationRules<T> = Partial<Record<keyof T, ValidationRule>>;

export function useValidation<T extends Record<string, any>>(
  initialValues: T,
  validationRules: ValidationRules<T>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const validate = (fieldValues: T = values): boolean => {
    const tempErrors: Partial<Record<keyof T, string>> = {};

    (Object.keys(validationRules) as Array<keyof T>).forEach((key) => {
      const value = fieldValues[key];
      const rules = validationRules[key];
      if (!rules) return;

      if (rules.required && !value) {
        tempErrors[key] = `${String(key)} is required`;
      } else if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
        tempErrors[key] = `${String(key)} must be at least ${rules.minLength} characters`;
      } else if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
        tempErrors[key] = `${String(key)} must be less than ${rules.maxLength} characters`;
      } else if (rules.pattern && value && !rules.pattern.test(String(value))) {
        tempErrors[key] = rules.message || `${String(key)} is invalid`;
      } else if (rules.min !== undefined && value && Number(value) < rules.min) {
        tempErrors[key] = `${String(key)} must be at least ${rules.min}`;
      } else if (rules.max !== undefined && value && Number(value) > rules.max) {
        tempErrors[key] = `${String(key)} must be less than ${rules.max}`;
      } else if (rules.custom && !rules.custom(value)) {
        tempErrors[key] = rules.message || `${String(key)} is invalid`;
      }
    });

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    const val = type === 'checkbox' ? checked : value;

    setValues((prev) => ({ ...prev, [name]: val }));
    const fieldValues = { ...values, [name]: val };
    validate(fieldValues);
  };

  const handleBlur = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    validate();
  };

  const handleSubmit = (callback: (data: T) => void) => (e: FormEvent) => {
    e.preventDefault();
    if (validate()) {
      callback(values);
    }
  };

  return {
    values,
    setValues,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    validate,
  };
}

export default useValidation;
