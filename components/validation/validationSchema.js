/**
 * Custom validation schema for form validation
 */

// Create a validation schema object
export function createValidationSchema() {
    return {
      // Validation rules for fields
      rules: {},
      // Custom error messages
      errors: {},
      // Add a validation rule
      addRule: function(field, validators) {
        this.rules[field] = validators;
        return this;
      },
      // Add custom error messages
      addErrors: function(field, messages) {
        this.errors[field] = messages;
        return this;
      },
      // Validate a specific field
      validateField: function(field, value) {
        if (!this.rules[field]) return { isValid: true };
        
        for (const validator of this.rules[field]) {
          const result = validator.validate(value);
          if (!result.isValid) {
            const errorKey = validator.type;
            const errorMessage = this.errors[field]?.[errorKey] || result.message;
            return { isValid: false, message: errorMessage };
          }
        }
        
        return { isValid: true };
      },
      // Validate the entire form data
      validate: function(data) {
        const errors = {};
        let isValid = true;
        
        Object.keys(this.rules).forEach(field => {
          if (data[field] !== undefined) {
            const result = this.validateField(field, data[field]);
            if (!result.isValid) {
              errors[field] = result.message;
              isValid = false;
            }
          }
        });
        
        return { isValid, errors };
      }
    };
  }
  
  // Validators
  export const validators = {
    required: (message = "This field is required") => ({
      type: 'required',
      validate: (value) => {
        const isValid = value !== undefined && value !== null && value.toString().trim() !== '';
        return { isValid, message };
      }
    }),
    minLength: (min, message) => ({
      type: 'minLength',
      validate: (value) => {
        const isValid = value && value.toString().trim().length >= min;
        return { isValid, message: message || `Minimum length is ${min} characters` };
      }
    }),
    maxLength: (max, message) => ({
      type: 'maxLength',
      validate: (value) => {
        const isValid = !value || value.toString().trim().length <= max;
        return { isValid, message: message || `Maximum length is ${max} characters` };
      }
    }),
    pattern: (regex, message = "Invalid format") => ({
      type: 'pattern',
      validate: (value) => {
        const isValid = !value || regex.test(value);
        return { isValid, message };
      }
    }),
    custom: (validateFn, type = 'custom', message = "Invalid value") => ({
      type,
      validate: (value) => {
        const isValid = validateFn(value);
        return { isValid, message };
      }
    })
  };
  
  // Transform functions
  export const transforms = {
    trim: (value) => value ? value.trim() : value,
    toLowerCase: (value) => value ? value.toLowerCase() : value,
    toUpperCase: (value) => value ? value.toUpperCase() : value
  }; 