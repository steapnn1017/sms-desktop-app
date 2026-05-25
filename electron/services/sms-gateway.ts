import log from 'electron-log'

export interface SendSmsParams {
  phoneNumbers: string[]
  message: string
}

export interface SendSmsResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface GatewayStatus {
  connected: boolean
  deviceName?: string
  batteryLevel?: number
  signalLevel?: number
  error?: string
}

export interface SmsGatewayConfig {
  apiUrl: string
  username: string
  password: string
}

// Default cloud API URL for sms-gate.app
const DEFAULT_API_URL = 'https://app.sms-gate.app/api/v1'

export class SmsGatewayService {
  private config: SmsGatewayConfig

  constructor(config: SmsGatewayConfig) {
    this.config = config
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(
      `${this.config.username}:${this.config.password}`
    ).toString('base64')
    return `Basic ${credentials}`
  }

  private getApiUrl(): string {
    return this.config.apiUrl || DEFAULT_API_URL
  }

  async sendSms(params: SendSmsParams): Promise<SendSmsResult> {
    try {
      log.info('Sending SMS to:', params.phoneNumbers)

      const response = await fetch(`${this.getApiUrl()}/message`, {
        method: 'POST',
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumbers: params.phoneNumbers,
          message: params.message,
        }),
        signal: AbortSignal.timeout(15000),
      })

      if (!response.ok) {
        const errorText = await response.text()
        log.error('SMS Gateway error:', response.status, errorText)
        return {
          success: false,
          error: `Gateway error ${response.status}: ${errorText}`,
        }
      }

      const data = await response.json() as { id?: string; [key: string]: unknown }
      log.info('SMS sent successfully:', data)

      return {
        success: true,
        messageId: data.id as string | undefined,
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      log.error('SMS send error:', errorMsg)
      return {
        success: false,
        error: errorMsg,
      }
    }
  }

  async checkMessageStatus(messageId: string): Promise<{ status: string; error?: string }> {
    try {
      const response = await fetch(`${this.getApiUrl()}/message/${messageId}`, {
        headers: {
          Authorization: this.getAuthHeader(),
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        return { status: 'unknown', error: `HTTP ${response.status}` }
      }

      const data = await response.json() as { state?: string; [key: string]: unknown }
      return { status: (data.state as string) || 'unknown' }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      return { status: 'unknown', error: errorMsg }
    }
  }

  async testConnection(): Promise<GatewayStatus> {
    try {
      log.info('Testing SMS Gateway connection...')

      const response = await fetch(`${this.getApiUrl()}/health`, {
        headers: {
          Authorization: this.getAuthHeader(),
        },
        signal: AbortSignal.timeout(10000),
      })

      if (response.ok) {
        log.info('SMS Gateway connection OK')
        return { connected: true }
      }

      if (response.status === 401) {
        return { connected: false, error: 'Neplatné přihlašovací údaje' }
      }

      // Try devices endpoint as fallback
      const devicesResponse = await fetch(`${this.getApiUrl()}/devices`, {
        headers: {
          Authorization: this.getAuthHeader(),
        },
        signal: AbortSignal.timeout(10000),
      })

      if (devicesResponse.ok) {
        return { connected: true }
      }

      return {
        connected: false,
        error: `HTTP ${response.status}`,
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Chyba připojení'
      log.error('Gateway connection test failed:', errorMsg)

      if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('ENOTFOUND')) {
        return { connected: false, error: 'Nelze se připojit k serveru SMS Gateway' }
      }

      return { connected: false, error: errorMsg }
    }
  }

  updateConfig(config: Partial<SmsGatewayConfig>) {
    this.config = { ...this.config, ...config }
  }
}

let gatewayInstance: SmsGatewayService | null = null

export function getGatewayService(config?: SmsGatewayConfig): SmsGatewayService {
  if (!gatewayInstance) {
    gatewayInstance = new SmsGatewayService(
      config || { apiUrl: DEFAULT_API_URL, username: '', password: '' }
    )
  } else if (config) {
    gatewayInstance.updateConfig(config)
  }
  return gatewayInstance
}

export function resetGatewayService() {
  gatewayInstance = null
}
