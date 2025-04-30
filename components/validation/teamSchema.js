import { createValidationSchema, validators, transforms } from './validationSchema';

/**
 * Create a validation schema for the team form
 * @param {Function} tValidation - Translation function
 * @returns {Object} Validation schema
 */
export function createTeamValidationSchema(tValidation) {
  return createValidationSchema()
    .addRule('teamName', [
      validators.required(tValidation('teamNameRequired')),
      validators.minLength(2, tValidation('teamNameMin')),
      validators.maxLength(50, tValidation('teamNameMax'))
    ])
    .addRule('teamAccess', [
      validators.required(tValidation('teamAccessRequired')),
      validators.custom(
        (value) => ['invite_only', 'can_edit', 'can_check', 'can_view'].includes(value),
        'invalid',
        tValidation('teamAccessInvalid')
      )
    ]);
}

/**
 * Transforms for form values
 */
export const teamFormTransforms = {
  teamName: transforms.trim,
  teamAccess: transforms.toLowerCase
}; 