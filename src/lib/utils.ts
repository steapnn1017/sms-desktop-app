import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { cs } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Date formatting ──────────────────────────────────────────────────────────
export function formatDate(date: string | Date): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    return format(d, 'd. M. yyyy', { locale: cs })
  } catch {
    return String(date)
  }
}

export function formatDateTime(date: string | Date): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    return format(d, 'd. M. yyyy HH:mm', { locale: cs })
  } catch {
    return String(date)
  }
}

export function formatRelativeTime(date: string | Date): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    return formatDistanceToNow(d, { addSuffix: true, locale: cs })
  } catch {
    return String(date)
  }
}

// ─── Phone number formatting ──────────────────────────────────────────────────
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '')
  if (cleaned.startsWith('+420') && cleaned.length === 13) {
    const num = cleaned.slice(4)
    return `+420 ${num.slice(0, 3)} ${num.slice(3, 6)} ${num.slice(6)}`
  }
  return phone
}

export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '')
  // Convert Czech national format to international
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `+420${cleaned.slice(1)}`
  }
  // Already international or starts with 420
  if (cleaned.startsWith('420') && cleaned.length === 12) {
    return `+${cleaned}`
  }
  return cleaned
}

export function validatePhone(phone: string): boolean {
  const normalized = normalizePhone(phone)
  // Czech mobile: +420 6xx xxx xxx or +420 7xx xxx xxx
  const czechMobile = /^\+420[67]\d{8}$/
  const czechLandline = /^\+420[2-5]\d{8}$/
  const international = /^\+\d{7,15}$/
  return czechMobile.test(normalized) || czechLandline.test(normalized) || international.test(normalized)
}

// ─── Template rendering ───────────────────────────────────────────────────────
export function renderTemplate(
  template: string,
  variables: Record<string, string | undefined>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return variables[key] !== undefined && variables[key] !== '' ? variables[key]! : match
  })
}

export function extractTemplateVariables(template: string): string[] {
  const matches = template.match(/\{(\w+)\}/g) || []
  return [...new Set(matches.map(m => m.slice(1, -1)))]
}

// ─── Number formatting ────────────────────────────────────────────────────────
export function formatPrice(price: string | number): string {
  const num = typeof price === 'string' ? parseFloat(price) : price
  if (isNaN(num)) return String(price)
  return new Intl.NumberFormat('cs-CZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num)
}

export function toNumber(value: number | bigint): number {
  return typeof value === 'bigint' ? Number(value) : value
}

// ─── Status helpers ───────────────────────────────────────────────────────────
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Čeká',
    sent: 'Odesláno',
    failed: 'Chyba',
    delivered: 'Doručeno',
  }
  return labels[status] || status
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'text-yellow-400',
    sent: 'text-green-400',
    failed: 'text-red-400',
    delivered: 'text-blue-400',
  }
  return colors[status] || 'text-gray-400'
}

export function getStatusBg(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
    sent: 'bg-green-400/10 text-green-400 border-green-400/20',
    failed: 'bg-red-400/10 text-red-400 border-red-400/20',
    delivered: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  }
  return colors[status] || 'bg-gray-400/10 text-gray-400 border-gray-400/20'
}

// ─── Truncate ─────────────────────────────────────────────────────────────────
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

// ─── Sleep ────────────────────────────────────────────────────────────────────
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
