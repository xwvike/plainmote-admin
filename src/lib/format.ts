import { useTranslation } from 'react-i18next'
import { localeOf } from '@/i18n'

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

/** Sizes in powers of 1024, as PlainMote itself reports them. */
export function formatBytes(bytes: number, locale: string): string {
  let value = bytes
  let unit = 0
  while (Math.abs(value) >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit++
  }
  const digits = unit === 0 || value >= 100 ? 0 : 1
  return `${value.toLocaleString(locale, { maximumFractionDigits: digits })} ${UNITS[unit]}`
}

const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 30],
  ['month', 12],
  ['year', Infinity],
]

export function formatRelative(iso: string, locale: string, now = Date.now()): string {
  let value = (new Date(iso).getTime() - now) / 1000
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  for (const [unit, size] of RELATIVE_STEPS) {
    if (Math.abs(value) < size) return format.format(Math.round(value), unit)
    value /= size
  }
  return format.format(Math.round(value), 'year')
}

/** Formatters bound to the interface language. Times show in local time; titles carry the UTC original. */
export function useFormat() {
  const { i18n } = useTranslation()
  const locale = localeOf(i18n.resolvedLanguage)
  const dateTime = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' })
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
  return {
    locale,
    bytes: (n: number) => formatBytes(n, locale),
    number: (n: number) => n.toLocaleString(locale),
    dateTime: (iso: string) => dateTime.format(new Date(iso)),
    date: (iso: string) => date.format(new Date(iso)),
    relative: (iso: string) => formatRelative(iso, locale),
  }
}
