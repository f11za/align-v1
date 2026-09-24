export const getFormattedId = (name: string, uuid: string) => {
  const safeUuid = uuid || '000000'
  const randomStr = safeUuid.substring(0, 6).toUpperCase()

  if (!name || name.trim() === '') return `UNKNOWN_PATIENT_${randomStr}`

  const formattedName = name.trim().replace(/\s+/g, '_').toLowerCase()
  return `${formattedName}_${randomStr}`
}
