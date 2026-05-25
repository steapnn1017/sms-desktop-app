export {}

declare global {
    interface Window {
        electronAPI: {
            window: {
                minimize: () => void
                maximize: () => void
                close: () => void
                quit: () => void
                isMaximized: () => Promise<boolean>
                onNavigate: (callback: (route: string) => void) => void
            }

            sms: {
                send: (params: {
                    phone: string
                    message: string
                    templateId?: string
                    customerId?: string
                    orderNumber?: string
                    price?: string
                }) => Promise<{ success: boolean; messageId?: string; error?: string; historyId?: string }>

                getHistory: (params?: {
                    limit?: number
                    offset?: number
                    search?: string
                    status?: string
                }) => Promise<{ data: unknown[]; total: number }>

                deleteHistory: (id: string) => Promise<{ success: boolean; error?: string }>

                resend: (id: string) => Promise<{ success: boolean; error?: string }>

                getDailyStats: () => Promise<{
                    today: { total: number | bigint; sent: number | bigint; failed: number | bigint; pending: number | bigint }
                    weekChart: Array<{ date: string; count: number | bigint }>
                }>

                testConnection: () => Promise<{
                    connected: boolean
                    deviceName?: string
                    error?: string
                }>
            }

            customers: {
                getAll: (params?: {
                    search?: string
                    limit?: number
                    offset?: number
                }) => Promise<{ data: unknown[]; total: number }>

                getById: (id: string) => Promise<{ customer: unknown; history: unknown[] }>

                create: (data: {
                    name: string
                    phone: string
                    note?: string
                }) => Promise<{ success: boolean; data?: unknown; error?: string }>

                update: (data: {
                    id: string
                    name: string
                    phone: string
                    note?: string
                }) => Promise<{ success: boolean; data?: unknown; error?: string }>

                delete: (id: string) => Promise<{ success: boolean; error?: string }>
            }

            templates: {
                getAll: () => Promise<{ success: boolean; data: unknown[]; error?: string }>

                getById: (id: string) => Promise<{ success: boolean; data: unknown; error?: string }>

                create: (data: {
                    name: string
                    content: string
                    description?: string
                    isDefault?: boolean
                }) => Promise<{ success: boolean; data?: unknown; error?: string }>

                update: (data: {
                    id: string
                    name: string
                    content: string
                    description?: string
                    isDefault?: boolean
                }) => Promise<{ success: boolean; data?: unknown; error?: string }>

                delete: (id: string) => Promise<{ success: boolean; error?: string }>

                preview: (data: {
                    content: string
                    variables: Record<string, string>
                }) => Promise<{ success: boolean; preview: string; error?: string }>
            }

            settings: {
                getAll: () => Promise<{ success: boolean; data: Record<string, string>; error?: string }>

                get: (key: string) => Promise<{ success: boolean; value: string | null }>

                set: (key: string, value: string) => Promise<{ success: boolean; error?: string }>

                saveGateway: (data: {
                    apiUrl: string
                    username: string
                    password: string
                }) => Promise<{ success: boolean; error?: string }>

                getAppInfo: () => Promise<{
                    version: string
                    name: string
                    userDataPath: string
                    dbPath: string
                    platform: string
                    nodeVersion: string
                    electronVersion: string
                }>

                testGateway: (data: {
                    apiUrl: string
                    username: string
                    password: string
                }) => Promise<{ connected: boolean; error?: string }>

                clearHistory: () => Promise<{ success: boolean; error?: string }>
            }

            notification: {
                show: (title: string, body: string) => Promise<void>
            }

            shell: {
                openExternal: (url: string) => Promise<void>
                showItemInFolder: (path: string) => Promise<void>
            }
        }
    }
}