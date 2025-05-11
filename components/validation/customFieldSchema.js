import { createValidationSchema, validators, transforms } from './validationSchema';

/**
 * Creates a validation schema for custom fields
 * @param {Function} tValidation - Translation function
 * @returns {Object} Validation schema
 */
export function createCustomFieldSchema(tValidation) {
  return createValidationSchema()
    .addRule('name', [
      validators.required(tValidation('nameRequired')),
      validators.minLength(2, tValidation('nameMin')),
      validators.maxLength(50, tValidation('nameMax'))
    ])
    .addRule('type', [
      validators.required(tValidation('typeRequired')),
      validators.custom((value) => {
        const validTypes = ['LIST', 'OVERVIEW', 'TIMELINE', 'NOTE', 'GANTT', 'CALENDAR', 'AGILE', 'WORKFLOW', 'KANBAN', 'FILES', 'POSTS'];
        return validTypes.includes(value);
      }, 'type_invalid', tValidation('typeInvalid'))
    ])
    .addRule('description', [
      validators.required(tValidation('descriptionRequired')),
      validators.maxLength(100, tValidation('descriptionMax'))
    ])
    .addRule('icon', [
      validators.required(tValidation('iconRequired')),
      validators.maxLength(50, tValidation('iconMax'))
    ]);
}

/**
 * Transforms for form values
 */
export const customFieldFormTransforms = {
  name: transforms.trim,
  type: transforms.toUpperCase,
  description: transforms.trim,
  icon: transforms.trim
}; 