/**
 * Formatting utilities for prices, currencies, and dates
 * All functions handle internationalization and currency-specific rules
 */

interface CurrencyInfo {
  symbol: string
  decimals: number
  minorUnitName: string
}

const CURRENCY_INFO: Record<string, CurrencyInfo> = {
  USD: { symbol: "$", decimals: 2, minorUnitName: "cents" },
  EUR: { symbol: "€", decimals: 2, minorUnitName: "cents" },
  ILS: { symbol: "₪", decimals: 2, minorUnitName: "agorot" },
  GBP: { symbol: "£", decimals: 2, minorUnitName: "pence" },
  JPY: { symbol: "¥", decimals: 0, minorUnitName: "yen" },
}

/**
 * Format price in minor currency units to human-readable string
 * @param priceInMinorUnits - Price in smallest currency unit (e.g., cents for USD)
 * @param currency - ISO currency code (USD, EUR, ILS, GBP, JPY)
 * @returns Formatted price string with currency symbol
 * @example
 * ```ts
 * formatPrice(15000, "USD") // "$150.00"
 * formatPrice(15000, "JPY") // "¥15000" (no decimals)
 * formatPrice(15000, "ILS") // "₪150.00"
 * ```
 */
export function formatPrice(priceInMinorUnits: number, currency: string = "USD"): string {
  const info = CURRENCY_INFO[currency] || CURRENCY_INFO.USD

  if (info.decimals === 0) {
    return `${info.symbol}${priceInMinorUnits}`
  }

  const majorUnits = priceInMinorUnits / Math.pow(10, info.decimals)
  return `${info.symbol}${majorUnits.toFixed(info.decimals)}`
}

/**
 * Get currency configuration information
 * @param currency - ISO currency code
 * @returns Currency info with symbol, decimals, and minor unit name
 * @example
 * ```ts
 * const info = getCurrencyInfo("USD")
 * // { symbol: "$", decimals: 2, minorUnitName: "cents" }
 * ```
 */
export function getCurrencyInfo(currency: string): CurrencyInfo {
  return CURRENCY_INFO[currency] || CURRENCY_INFO.USD
}

/**
 * Format a date as a readable string
 * @param date Date object or ISO string
 * @returns Formatted date (e.g., "Mar 25, 2026")
 */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}
