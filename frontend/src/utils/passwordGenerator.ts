export const generatePassword = (length = 10) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*()'
  let res = ''
  for (let i = 0; i < length; i++) res += chars.charAt(Math.floor(Math.random() * chars.length))
  return res
}

export default generatePassword
