/**
 * Checks if an object is empty
 *
 * @param objectName Object to check
 * @returns {boolean} boolean
 */
export const isEmptyObject = (objectName: object): boolean => {
  return objectName && Object.keys(objectName).length === 0 && objectName.constructor === Object
}

/**
 * Validates kebab-case string (lowercase, numbers, hyphens)
 *
 * @param value String to validate
 * @returns {string | undefined} Error message or undefined if valid
 */
export const validateKebabCase = (value: string): string | undefined => {
  if (!value || value.length === 0) return undefined
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)) {
    return 'Name must be kebab-case (lowercase, numbers, hyphens)'
  }
  return undefined
}

/**
 * Validates semver format (x.y.z)
 *
 * @param value String to validate
 * @returns {string | undefined} Error message or undefined if valid
 */
export const validateSemver = (value: string): string | undefined => {
  if (!value || value.length === 0) return undefined
  if (!/^\d+\.\d+\.\d+/.test(value)) {
    return 'Must be semver format (x.y.z)'
  }
  return undefined
}

/**
 * Validates calver format (YYYY.M.PATCH)
 *
 * @param value String to validate
 * @returns {string | undefined} Error message or undefined if valid
 */
export const validateCalver = (value: string): string | undefined => {
  if (!value || value.length === 0) return undefined
  if (!/^\d{4}\.\d{1,2}\.\d+/.test(value)) {
    return 'Must be calver format (YYYY.M.PATCH)'
  }
  return undefined
}

/**
 * Gets current date in calver format (YYYY.MM.DD)
 *
 * @param date Date to format (defaults to now)
 * @returns {string} Formatted calver string
 */
export const getCalver = (date: Date = new Date()): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}.${month}.${day}`
}
