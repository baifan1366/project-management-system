import { createValidationSchema, validators, transforms } from './validationSchema';

/**
 * Create a validation schema for the project form
 * @param {Function} tValidation - Translation function
 * @returns {Object} Validation schema
 */
export function createProjectValidationSchema(tValidation) {
  return createValidationSchema()
    .addRule('projectName', [
      validators.required(tValidation('projectNameRequired')),
      validators.minLength(2, tValidation('projectNameMin')),
      validators.maxLength(50, tValidation('projectNameMax'))
    ])
    .addRule('visibility', [
      validators.required(tValidation('visibilityRequired')),
      validators.custom(
        (value) => ['private', 'public'].includes(value),
        'invalid',
        tValidation('visibilityInvalid')
      )
    ])
    .addRule('buttonVariant', [
      validators.required(tValidation('themeColorRequired')),
      validators.custom(
        (value) => ['black', 'red', 'orange', 'green', 'blue', 'purple', 'pink'].includes(value),
        'invalid',
        tValidation('themeColorInvalid')
      )
    ]);
}

/**
 * Transforms for form values
 */
export const projectFormTransforms = {
  projectName: transforms.trim,
  visibility: transforms.toLowerCase,
  buttonVariant: transforms.toLowerCase
}; 