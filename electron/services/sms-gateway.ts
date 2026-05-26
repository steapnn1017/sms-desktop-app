import log from 'electron-log'

export interface SendSmsParams {
    phoneNumbers: string[]
    message: string
}

export interface SendSmsResult {
    success: boolean
    messageId?: string
    error?: string
    usedGateway?: number
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
    name?: string
}

const DEFAULT_API_URL = 'https://api.sms-gate.app/3rdparty/v1'

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
            log.info('Sending SMS to:', params.phoneNumbers, 'via', this.config.name || this.getApiUrl())

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
            log.info('Testing SMS Gateway connection...', this.config.name || this.getApiUrl())

            // Step 1: Check credentials via /health (quick auth check)
            const healthResponse = await fetch(`${this.getApiUrl()}/health`, {
                headers: {
                    Authorization: this.getAuthHeader(),
                },
                signal: AbortSignal.timeout(8000),
            })

            if (healthResponse.status === 401) {
                return { connected: false, error: 'Neplatné přihlašovací údaje' }
            }

            // Step 2: Check actual device online status via /devices
            const devicesResponse = await fetch(`${this.getApiUrl()}/devices`, {
                headers: {
                    Authorization: this.getAuthHeader(),
                },
                signal: AbortSignal.timeout(8000),
            })

            if (devicesResponse.status === 401) {
                return { connected: false, error: 'Neplatné přihlašovací údaje' }
            }

            if (!devicesResponse.ok) {
                return { connected: false, error: `HTTP ${devicesResponse.status}` }
            }

            const devices = await devicesResponse.json() as Array<{ online?: boolean; name?: string; [key: string]: unknown }>

            if (!Array.isArray(devices) || devices.length === 0) {
                return { connected: false, error: 'Žádné zařízení nenalezeno (spusťte SMS Gateway aplikaci na telefonu)' }
            }

            const onlineDevice = devices.find(d => d.online === true)

            if (onlineDevice) {
                log.info('SMS Gateway connection OK, online device:', onlineDevice.name || 'unknown')
                return { connected: true, deviceName: onlineDevice.name as string | undefined }
            }

            log.warn('All devices offline:', devices.map(d => d.name || 'unknown').join(', '))
            return {
                connected: false,
                error: 'Telefon je offline — otevřete SMS Gateway aplikaci na telefonu',
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

// ─── Multi-gateway support ────────────────────────────────────────────────────

export async function getActiveGatewayService(
    configs: [SmsGatewayConfig, SmsGatewayConfig | null]
): Promise<{ service: SmsGatewayService; gatewayIndex: number }> {
    const [cfg1, cfg2] = configs

    const hasGateway1 = cfg1.username && cfg1.password
    const hasGateway2 = cfg2 && cfg2.username && cfg2.password

    if (!hasGateway1 && !hasGateway2) {
        return { service: new SmsGatewayService(cfg1), gatewayIndex: 1 }
    }

    if (hasGateway1 && !hasGateway2) {
        return { service: new SmsGatewayService(cfg1), gatewayIndex: 1 }
    }

    if (!hasGateway1 && hasGateway2) {
        return { service: new SmsGatewayService(cfg2!), gatewayIndex: 2 }
    }

    const svc1 = new SmsGatewayService(cfg1)
    const svc2 = new SmsGatewayService(cfg2!)

    const [status1, status2] = await Promise.all([
        svc1.testConnection().catch(() => ({ connected: false })),
        svc2.testConnection().catch(() => ({ connected: false })),
    ])

    log.info(`Gateway 1 (${cfg1.name || 'Gateway 1'}): ${status1.connected ? 'online' : 'offline'}`)
    log.info(`Gateway 2 (${cfg2!.name || 'Gateway 2'}): ${status2.connected ? 'online' : 'offline'}`)

    if (status1.connected) {
        return { service: svc1, gatewayIndex: 1 }
    }

    if (status2.connected) {
        return { service: svc2, gatewayIndex: 2 }
    }

    log.warn('Both gateways offline, falling back to gateway 1')
    return { service: svc1, gatewayIndex: 1 }
}

// ─── Legacy helpers ───────────────────────────────────────────────────────────

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