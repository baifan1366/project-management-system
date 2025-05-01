import { createValidationSchema, validators, transforms } from './validationSchema';

/**
 * Create a validation schema for the task form
 * @param {Function} tValidation - Translation function
 * @returns {Object} Validation schema
 */
export function createTaskValidationSchema(tValidation) {
  return createValidationSchema()
    .addRule('taskName', [
      validators.required(tValidation('taskNameRequired')),
      validators.minLength(2, tValidation('taskNameMin')),
      validators.maxLength(50, tValidation('taskNameMax'))
    ])
    .addRule('startDate', [
      validators.required(tValidation('startDateRequired'))
    ])
    .addRule('duration', [
      validators.required(tValidation('durationRequired')),
    ]);
}

/**
 * Transforms for form values
 */
export const taskFormTransforms = {
  taskName: (value) => typeof value === 'string' ? value.trim() : value,
  startDate: (value) => {
    // 保持日期对象不变，只处理字符串
    if (typeof value === 'string') return value.trim();
    return value;
  },
  duration: (value) => {
    // 如果是字符串，先去空格再转数字；如果是数字，则原样返回
    if (typeof value === 'string') return value.trim();
    return value;
  }
}; 