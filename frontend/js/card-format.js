export function cardFormatError(name, number, expiry, cvv, today = new Date()) {
  if (!name.trim()) return 'Enter the cardholder name.'
  if (!/^[\d -]+$/.test(number) || !/^\d{13,19}$/.test(number.replace(/[ -]/g, ''))) return 'Enter a card number with 13 to 19 digits.'
  const match = expiry.trim().match(/^(0[1-9]|1[0-2])\/(\d{2})$/)
  if (!match || 2000 + Number(match[2]) < today.getFullYear() ||
    (2000 + Number(match[2]) === today.getFullYear() && Number(match[1]) < today.getMonth() + 1)) return 'Enter a future expiry in MM/YY format.'
  if (!/^\d{3,4}$/.test(cvv)) return 'Enter the 3 or 4 digit CVV from the back of the card.'
  return null
}
