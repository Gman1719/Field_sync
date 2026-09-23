import { useState } from 'react';

export const useValidation = (initialValues, validationRules) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validate = (fieldValues = values) => {
    const tempErrors = {};
    
    Object.keys(validationRules).forEach(key => {
      const value = fieldValues[key];
      const rules = validationRules[key];
      
      if (rules.required && !value) {
        tempErrors[key] = `${key} is required`;
      } else if (rules.minLength && value && value.length < rules.minLength) {
        tempErrors[key] = `${key} must be at least ${rules.minLength} characters`;
      } else if (rules.maxLength && value && value.length > rules.maxLength) {
        tempErrors[key] = `${key} must be less than ${rules.maxLength} characters`;
      } else if (rules.pattern && value && !rules.pattern.test(value)) {
        tempErrors[key] = rules.message || `${key} is invalid`;
      } else if (rules.min && value && Number(value) < rules.min) {
        tempErrors[key] = `${key} must be at least ${rules.min}`;
      } else if (rules.max && value && Number(value) > rules.max) {
        tempErrors[key] = `${key} must be less than ${rules.max}`;
      } else if (rules.custom && !rules.custom(value)) {
        tempErrors[key] = rules.message || `${key} is invalid`;
      }
    });
    
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    
    setValues(prev => ({ ...prev, [name]: val }));
    
    // Validate on change
    const fieldValues = { ...values, [name]: val };
    validate(fieldValues);
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    validate();
  };

  const handleSubmit = (callback) => (e) => {
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
    validate
  };
};