import dayjs from 'dayjs'
import 'dayjs/locale/fr'

export const LOCALE = 'fr'
export const CURRENCY = 'MGA'
export const CURRENCY_SYMBOL = 'Ar'
export const DATE_FORMAT = 'DD/MM/YYYY'
export const TIME_FORMAT = 'HH:mm'

dayjs.locale('fr')

export default {
  LOCALE,
  CURRENCY,
  CURRENCY_SYMBOL,
  DATE_FORMAT,
  TIME_FORMAT,
}
