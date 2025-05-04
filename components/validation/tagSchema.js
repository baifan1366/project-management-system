import { createValidationSchema, validators, transforms } from './validationSchema';

/**
 * Create a validation schema for the tag form
 * @param {Function} tValidation - Translation function
 * @param {Object} options - Options for validation schema
 * @param {boolean} options.requireDescription - Whether description is required
 * @returns {Object} Validation schema
 */
export function createTagValidationSchema(tValidation, options = { requireDescription: false }) {
  const schema = createValidationSchema()
    .addRule('name', [
      validators.required(tValidation('fieldNameRequired')),
      validators.minLength(2, tValidation('fieldNameMin')),
      validators.maxLength(50, tValidation('fieldNameMax'))
    ])
    .addRule('type', [
      validators.required(tValidation('fieldTypeRequired'))
    ]);
    
  if (options.requireDescription) {
    schema.addRule('description', [
      validators.required(tValidation('descriptionRequired')),
      validators.minLength(10, tValidation('descriptionMin')),
      validators.maxLength(100, tValidation('descriptionMax'))
    ]);
  } else {
    schema.addRule('description', [
      validators.maxLength(100, tValidation('descriptionMax'))
    ]);
  }
  
  return schema;
}

/**
 * Transforms for form values
 */
export const tagFormTransforms = {
  name: transforms.trim,
  type: transforms.toUpperCase,
  description: transforms.trim
}; 