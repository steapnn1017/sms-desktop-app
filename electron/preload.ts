import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
    window: {
        minimize: () => ipcRenderer.send('window:minimize'),
        maximize: () => ipcRenderer.send('window:maximize'),
        close: () => ipcRenderer.send('window:close'),
        quit: () => ipcRenderer.send('window:quit'),
        isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
        onNavigate: (callback: (route: string) => void) => {
            ipcRenderer.on('navigate', (_event, route) => callback(route))
        },
    },

    sms: {
        send: (params: {
            phone: string
            message: string
            templateId?: string
            customerId?: string
            orderNumber?: string
            price?: string
        }) => ipcRenderer.invoke('sms:send', params),
        getHistory: (params?: { limit?: number; offset?: number; search?: string; status?: string }) =>
            ipcRenderer.invoke('sms:getHistory', params),
        deleteHistory: (id: string) => ipcRenderer.invoke('sms:deleteHistory', id),
        resend: (id: string) => ipcRenderer.invoke('sms:resend', id),
        getDailyStats: () => ipcRenderer.invoke('sms:getDailyStats'),
        testConnection: () => ipcRenderer.invoke('sms:testConnection'),
    },

    customers: {
        getAll: (params?: { search?: string; limit?: number; offset?: number }) =>
            ipcRenderer.invoke('customers:getAll', params),
        getById: (id: string) => ipcRenderer.invoke('customers:getById', id),
        create: (data: { name: string; phone: string; note?: string }) =>
            ipcRenderer.invoke('customers:create', data),
        update: (data: { id: string; name: string; phone: string; note?: string }) =>
            ipcRenderer.invoke('customers:update', data),
        delete: (id: string) => ipcRenderer.invoke('customers:delete', id),
    },

    templates: {
        getAll: () => ipcRenderer.invoke('templates:getAll'),
        getById: (id: string) => ipcRenderer.invoke('templates:getById', id),
        create: (data: { name: string; content: string; description?: string; isDefault?: boolean }) =>
            ipcRenderer.invoke('templates:create', data),
        update: (data: { id: string; name: string; content: string; description?: string; isDefault?: boolean }) =>
            ipcRenderer.invoke('templates:update', data),
        delete: (id: string) => ipcRenderer.invoke('templates:delete', id),
        preview: (data: { content: string; variables: Record<string, string> }) =>
            ipcRenderer.invoke('templates:preview', data),
    },

    settings: {
        getAll: () => ipcRenderer.invoke('settings:getAll'),
        get: (key: string) => ipcRenderer.invoke('settings:get', key),
        set: (key: string, value: string) => ipcRenderer.invoke('settings:set', { key, value }),

        saveGateway: (data: { apiUrl: string; username: string; password: string }) =>
            ipcRenderer.invoke('settings:saveGateway', data),

        saveGateway1: (data: { name: string; apiUrl: string; username: string; password: string }) =>
            ipcRenderer.invoke('settings:saveGateway1', data),

        saveGateway2: (data: { name: string; apiUrl: string; username: string; password: string }) =>
            ipcRenderer.invoke('settings:saveGateway2', data),

        getAppInfo: () => ipcRenderer.invoke('settings:getAppInfo'),

        testGateway: (data: { apiUrl: string; username: string; password: string }) =>
            ipcRenderer.invoke('settings:testGateway', data),

        testBothGateways: () => ipcRenderer.invoke('settings:testBothGateways'),

        clearHistory: () => ipcRenderer.invoke('settings:clearHistory'),
    },

    notification: {
        show: (title: string, body: string) =>
            ipcRenderer.invoke('notification:show', { title, body }),
    },

    shell: {
        openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
        showItemInFolder: (path: string) => ipcRenderer.invoke('shell:showItemInFolder', path),
    },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

declare global {
    interface Window {
        electronAPI: typeof electronAPI
    }
}