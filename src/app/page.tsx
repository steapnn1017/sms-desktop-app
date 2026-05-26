'use client'

import { useEffect, useState } from 'react'
import {
    Wifi,
    WifiOff,
    Save,
    Eye,
    EyeOff,
    Loader2,
    CheckCircle2,
    XCircle,
    ExternalLink,
    Info,
    Trash2,
    FolderOpen,
    RefreshCw,
    User,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { AppInfo } from '@/types'

type GatewayFormData = {
    name: string
    apiUrl: string
    username: string
    password: string
}

type ConnectionStatus = 'unknown' | 'success' | 'error' | 'loading'

function GatewayForm({
                         gatewayNumber,
                         defaultName,
                         initialData,
                         onSave,
                     }: {
    gatewayNumber: 1 | 2
    defaultName: string
    initialData: GatewayFormData
    onSave: (data: GatewayFormData) => Promise<boolean>
}) {
    const [saving, setSaving] = useState(false)
    const [testing, setTesting] = useState(false)
    const [status, setStatus] = useState<ConnectionStatus>('unknown')
    const [statusError, setStatusError] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    const isElectron = typeof window !== 'undefined' && !!window.electronAPI

    const { register, handleSubmit, getValues, reset, formState: { errors } } = useForm<GatewayFormData>({
        defaultValues: initialData,
    })

    useEffect(() => {
        reset(initialData)
    }, [initialData, reset])

    const handleTest = async () => {
        if (!isElectron) return
        setTesting(true)
        setStatus('loading')
        setStatusError('')
        try {
            const data = getValues()
            const result = await window.electronAPI.settings.testGateway(data)
            if (result.connected) {
                setStatus('success')
                toast.success(`Gateway ${gatewayNumber} online!`)
            } else {
                setStatus('error')
                setStatusError(result.error || 'Neznámá chyba')
                toast.error(`Gateway ${gatewayNumber} offline`, { description: result.error })
            }
        } catch (err) {
            setStatus('error')
            toast.error('Chyba při testování', { description: String(err) })
        } finally {
            setTesting(false)
        }
    }

    const handleSave = async (data: GatewayFormData) => {
        setSaving(true)
        try {
            const ok = await onSave(data)
            if (ok) {
                toast.success(`Gateway ${gatewayNumber} uložena`)
                reset(data, { keepValues: true })
            }
        } finally {
            setSaving(false)
        }
    }

    const statusColor = {
        unknown: 'text-[#525252]',
        loading: 'text-yellow-400',
        success: 'text-green-400',
        error: 'text-red-400',
    }[status]

    return (
        <div className="app-card p-5 space-y-4">
            <div className="flex items-center gap-2">
                <div className={cn(
                    'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold',
                    gatewayNumber === 1 ? 'bg-[#fd8408]/20 text-[#fd8408]' : 'bg-blue-500/20 text-blue-400'
                )}>
                    {gatewayNumber}
                </div>
                <User className="w-4 h-4 text-[#525252]" />
                <h2 className="text-sm font-semibold text-[#f5f5f5]">
                    SMS Gateway {gatewayNumber}
                    {gatewayNumber === 1 && <span className="ml-2 text-xs text-[#fd8408] font-normal">(prioritní)</span>}
                </h2>
                <div className={cn('ml-auto flex items-center gap-1.5 text-xs', statusColor)}>
                    {status === 'loading' && <Loader2 className="w-3 h-3 animate-spin" />}
                    {status === 'success' && <Wifi className="w-3 h-3" />}
                    {(status === 'error' || status === 'unknown') && <WifiOff className="w-3 h-3" />}
                    <span>
                        {status === 'success' ? 'Online' :
                            status === 'error' ? 'Offline' :
                                status === 'loading' ? 'Testuji...' : 'Netestováno'}
                    </span>
                </div>
            </div>

            <form onSubmit={handleSubmit(handleSave)} className="space-y-3">
                <div>
                    <label className="text-xs text-[#525252] mb-1.5 block">Jméno zaměstnance</label>
                    <input
                        {...register('name')}
                        className="app-input"
                        placeholder={defaultName}
                    />
                </div>

                <div>
                    <label className="text-xs text-[#525252] mb-1.5 block">API URL</label>
                    <input
                        {...register('apiUrl', { required: true })}
                        className="app-input font-mono text-sm"
                        placeholder="https://api.sms-gate.app/3rdparty/v1"
                    />
                </div>

                <div>
                    <label className="text-xs text-[#525252] mb-1.5 block">Uživatelské jméno *</label>
                    <input
                        {...register('username', { required: 'Povinné pole' })}
                        className={cn('app-input', errors.username && 'border-red-500/50')}
                        placeholder="váš@email.cz"
                        autoComplete="off"
                    />
                    {errors.username && <p className="text-xs text-red-400 mt-1">{errors.username.message}</p>}
                </div>

                <div>
                    <label className="text-xs text-[#525252] mb-1.5 block">Heslo *</label>
                    <div className="relative">
                        <input
                            {...register('password', { required: 'Povinné pole' })}
                            type={showPassword ? 'text' : 'password'}
                            className={cn('app-input pr-10', errors.password && 'border-red-500/50')}
                            placeholder="••••••••"
                            autoComplete="off"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(p => !p)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#525252] hover:text-[#a3a3a3] transition-colors"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
                </div>

                {status === 'error' && statusError && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <XCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{statusError}</span>
                    </div>
                )}
                {status === 'success' && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                        <span>Připojení úspěšné — gateway je online</span>
                    </div>
                )}

                <div className="flex gap-3 pt-1">
                    <button type="button" onClick={handleTest} disabled={testing} className="btn-secondary flex-1">
                        {testing ? <><Loader2 className="w-4 h-4 animate-spin" /> Testuji...</> : <><Wifi className="w-4 h-4" /> Test připojení</>}
                    </button>
                    <button type="submit" disabled={saving} className="btn-primary flex-1">
                        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Ukládám...</> : <><Save className="w-4 h-4" /> Uložit</>}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default function SettingsPage() {
    const [loading, setLoading] = useState(true)
    const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
    const [clearingHistory, setClearingHistory] = useState(false)

    const [gw1, setGw1] = useState<GatewayFormData>({
        name: 'Zaměstnanec 1',
        apiUrl: 'https://api.sms-gate.app/3rdparty/v1',
        username: '',
        password: '',
    })
    const [gw2, setGw2] = useState<GatewayFormData>({
        name: 'Zaměstnanec 2',
        apiUrl: 'https://api.sms-gate.app/3rdparty/v1',
        username: '',
        password: '',
    })

    const isElectron = typeof window !== 'undefined' && !!window.electronAPI

    useEffect(() => {
        if (!isElectron) { setLoading(false); return }
        Promise.all([
            window.electronAPI.settings.getAll(),
            window.electronAPI.settings.getAppInfo(),
        ]).then(([settingsResult, info]) => {
            if (settingsResult.success) {
                const s = settingsResult.data
                setGw1({
                    name: s.gateway_1_name || 'Zaměstnanec 1',
                    apiUrl: s.gateway_1_api_url || 'https://api.sms-gate.app/3rdparty/v1',
                    username: s.gateway_1_username || '',
                    password: s.gateway_1_password_masked || '',
                })
                setGw2({
                    name: s.gateway_2_name || 'Zaměstnanec 2',
                    apiUrl: s.gateway_2_api_url || 'https://api.sms-gate.app/3rdparty/v1',
                    username: s.gateway_2_username || '',
                    password: s.gateway_2_password_masked || '',
                })
            }
            setAppInfo(info as AppInfo)
        }).finally(() => setLoading(false))
    }, [isElectron])

    const saveGateway1 = async (data: GatewayFormData): Promise<boolean> => {
        if (!isElectron) return false
        const result = await window.electronAPI.settings.saveGateway1(data)
        if (!result.success) toast.error('Chyba při ukládání', { description: result.error })
        return result.success
    }

    const saveGateway2 = async (data: GatewayFormData): Promise<boolean> => {
        if (!isElectron) return false
        const result = await window.electronAPI.settings.saveGateway2(data)
        if (!result.success) toast.error('Chyba při ukládání', { description: result.error })
        return result.success
    }

    const handleClearHistory = async () => {
        if (!isElectron) return
        if (!confirm('Opravdu smazat celou historii SMS? Tato akce je nevratná.')) return
        setClearingHistory(true)
        try {
            const result = await window.electronAPI.settings.clearHistory()
            if (result.success) toast.success('Historie smazána')
            else toast.error('Chyba při mazání')
        } finally {
            setClearingHistory(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 animate-spin text-[#525252]" />
            </div>
        )
    }

    return (
        <div className="max-w-2xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[#f5f5f5]">Nastavení</h1>
                <p className="text-sm text-[#525252] mt-0.5">Konfigurace SMS Gateway a aplikace</p>
            </div>

            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-xs font-medium text-blue-300">Jak nastavit SMS Gateway</p>
                    <ol className="text-xs text-[#525252] space-y-0.5 list-decimal list-inside">
                        <li>Nainstalujte <strong className="text-[#a3a3a3]">SMS Gateway</strong> na Android telefon (GitHub: capcom6/android-sms-gateway)</li>
                        <li>Vytvořte účet na <strong className="text-[#a3a3a3]">app.sms-gate.app</strong></li>
                        <li>V aplikaci aktivujte Cloud relay a přihlaste se</li>
                        <li>Zadejte údaje níže pro každého zaměstnance zvlášť</li>
                    </ol>
                    <p className="text-xs text-blue-300 mt-2">
                        Při odesílání se automaticky použije ta gateway, která je zrovna online. Gateway 1 má prioritu.
                    </p>
                    <button
                        onClick={() => window.electronAPI?.shell.openExternal('https://sms-gate.app')}
                        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors mt-1"
                    >
                        <ExternalLink className="w-3 h-3" />
                        sms-gate.app
                    </button>
                </div>
            </div>

            <GatewayForm gatewayNumber={1} defaultName="Zaměstnanec 1" initialData={gw1} onSave={saveGateway1} />
            <GatewayForm gatewayNumber={2} defaultName="Zaměstnanec 2" initialData={gw2} onSave={saveGateway2} />

            {appInfo && (
                <div className="app-card p-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-[#fd8408]" />
                        <h2 className="text-sm font-semibold text-[#f5f5f5]">Informace o aplikaci</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Verze', value: appInfo.version },
                            { label: 'Platforma', value: appInfo.platform },
                            { label: 'Electron', value: appInfo.electronVersion },
                            { label: 'Node.js', value: appInfo.nodeVersion },
                        ].map(item => (
                            <div key={item.label} className="bg-[#1a1a1a] rounded-xl p-3">
                                <p className="text-xs text-[#525252]">{item.label}</p>
                                <p className="text-sm font-mono text-[#f5f5f5] mt-0.5">{item.value}</p>
                            </div>
                        ))}
                    </div>
                    <div className="bg-[#1a1a1a] rounded-xl p-3">
                        <p className="text-xs text-[#525252] mb-1">Databáze</p>
                        <div className="flex items-center gap-2">
                            <p className="text-xs font-mono text-[#a3a3a3] flex-1 truncate">{appInfo.dbPath}</p>
                            <button
                                onClick={() => window.electronAPI?.shell.showItemInFolder(appInfo.dbPath)}
                                className="btn-ghost py-1 px-2 text-xs"
                            >
                                <FolderOpen className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="app-card p-5 space-y-4 border-red-500/10">
                <div className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <h2 className="text-sm font-semibold text-red-400">Nebezpečná zóna</h2>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
                    <div>
                        <p className="text-sm font-medium text-[#f5f5f5]">Smazat celou historii SMS</p>
                        <p className="text-xs text-[#525252]">Smaže všechny záznamy z historii. Tato akce je nevratná.</p>
                    </div>
                    <button onClick={handleClearHistory} disabled={clearingHistory} className="btn-danger ml-4">
                        {clearingHistory
                            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Mažu...</>
                            : <><Trash2 className="w-4 h-4" /> Smazat historii</>
                        }
                    </button>
                </div>
            </div>
        </div>
    )
}