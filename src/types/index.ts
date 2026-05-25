// ─── SMS History ──────────────────────────────────────────────────────────────
export type SmsStatus = 'pending' | 'sent' | 'failed' | 'delivered'

export interface SmsHistory {
  id: string
  phone: string
  message: string
  status: SmsStatus
  errorMsg?: string | null
  templateId?: string | null
  customerId?: string | null
  orderNumber?: string | null
  price?: string | null
  gatewayMsgId?: string | null
  sentAt?: string | null
  createdAt: string
  updatedAt: string
  // Joined fields
  templateName?: string | null
  customerName?: string | null
}

// ─── Customer ─────────────────────────────────────────────────────────────────
export interface Customer {
  id: string
  name: string
  phone: string
  note?: string | null
  createdAt: string
  updatedAt: string
}

// ─── SMS Template ─────────────────────────────────────────────────────────────
export interface SmsTemplate {
  id: string
  name: string
  content: string
  description?: string | null
  isDefault: boolean | number
  createdAt: string
  updatedAt: string
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export interface AppSettings {
  gateway_api_url?: string
  gateway_username?: string
  gateway_password?: string
  gateway_password_masked?: string
  autostart?: string
  [key: string]: string | undefined
}

// ─── Stats ────────────────────────────────────────────────────────────────────
export interface DailyStats {
  total: number | bigint
  sent: number | bigint
  failed: number | bigint
  pending: number | bigint
}

export interface WeekChartEntry {
  date: string
  count: number | bigint
}

// ─── Gateway ─────────────────────────────────────────────────────────────────
export interface GatewayStatus {
  connected: boolean
  deviceName?: string
  batteryLevel?: number
  signalLevel?: number
  error?: string
}

// ─── Send SMS form ────────────────────────────────────────────────────────────
export interface SendSmsFormData {
  phone: string
  orderNumber: string
  price: string
  note: string
  templateId: string
  message: string
  customerId?: string
}

// ─── Template variables ───────────────────────────────────────────────────────
export interface TemplateVariables {
  zakazka?: string
  cena?: string
  poznamka?: string
  telefon?: string
  [key: string]: string | undefined
}

// ─── App info ─────────────────────────────────────────────────────────────────
export interface AppInfo {
  version: string
  name: string
  userDataPath: string
  dbPath: string
  platform: string
  nodeVersion: string
  electronVersion: string
}
