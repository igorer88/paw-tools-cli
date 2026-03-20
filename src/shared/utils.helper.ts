/**
 * Checks if an object is empty
 *
 * @param objectName Object to check
 * @returns {boolean} boolean
 */
export const isEmptyObject = (objectName: object): boolean => {
  return (
    objectName &&
    Object.keys(objectName).length === 0 &&
    objectName.constructor === Object
  )
}
