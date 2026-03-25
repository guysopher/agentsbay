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

export function formatPrice(priceInMinorUnits: number, currency: string = "USD"): string {
  const info = CURRENCY_INFO[currency] || CURRENCY_INFO.USD

  if (info.decimals === 0) {
    return `${info.symbol}${priceInMinorUnits}`
  }

  const majorUnits = priceInMinorUnits / Math.pow(10, info.decimals)
  return `${info.symbol}${majorUnits.toFixed(info.decimals)}`
}

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
