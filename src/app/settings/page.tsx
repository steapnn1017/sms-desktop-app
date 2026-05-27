'use client'

import { useEffect, useState } from 'react'
import {
    Wifi, WifiOff, Save, Eye, EyeOff, Loader2, CheckCircle2,
    XCircle, ExternalLink, Info, Trash2, FolderOpen, RefreshCw, User,
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
                         gatewayNumber, defaultName, initialData, onSave,
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

    useEffect(() => { reset(initialData) }, [initialData, reset])

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
        } finally { setSaving(false) }
    }

    return (
        <div className="app-card p-5 space-y-4">
            <div className="flex items-center gap-3">
                <div className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                    gatewayNumber === 1 ? 'bg-[#fff4ea] text-[#f07820]' : 'bg-blue-50 text-blue-600'
                )}>
                    {gatewayNumber}
                </div>
                <User className="w-4 h-4 text-[#9ca3af]" />
                <h2 className="text-sm font-semibold text-[#111827]">
                    SMS Gateway {gatewayNumber}
                    {gatewayNumber === 1 && <span className="ml-2 text-xs text-[#f07820] font-normal">(prioritní)</span>}
                </h2>
                <div className={cn(
                    'ml-auto flex items-center gap-1.5 text-xs font-medium',
                    status === 'success' ? 'text-green-600' :
                        status === 'error' ? 'text-red-500' :
                            status === 'loading' ? 'text-amber-500' : 'text-[#9ca3af]'
                )}>
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
                    <label className="text-xs text-[#6b7280] mb-1.5 block font-medium">Jméno zaměstnance</label>
                    <input {...register('name')} className="app-input" placeholder={defaultName} />
                </div>
                <div>
                    <label className="text-xs text-[#6b7280] mb-1.5 block font-medium">API URL</label>
                    <input
                        {...register('apiUrl', { required: true })}
                        className="app-input font-mono text-sm"
                        placeholder="https://api.sms-gate.app/3rdparty/v1"
                    />
                </div>
                <div>
                    <label className="text-xs text-[#6b7280] mb-1.5 block font-medium">Uživatelské jméno *</label>
                    <input
                        {...register('username', { required: 'Povinné pole' })}
                        className={cn('app-input', errors.username && 'border-red-400')}
                        placeholder="váš@email.cz"
                        autoComplete="off"
                    />
                    {errors.username && <p className="text-xs text-red-500 mt-1">{errors.username.message}</p>}
                </div>
                <div>
                    <label className="text-xs text-[#6b7280] mb-1.5 block font-medium">Heslo *</label>
                    <div className="relative">
                        <input
                            {...register('password', { required: 'Povinné pole' })}
                            type={showPassword ? 'text' : 'password'}
                            className={cn('app-input pr-10', errors.password && 'border-red-400')}
                            placeholder="••••••••"
                            autoComplete="off"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(p => !p)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280]"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
                </div>

                {status === 'error' && statusError && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                        <XCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{statusError}</span>
                    </div>
                )}
                {status === 'success' && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                        <span>Připojení úspěšné — gateway je online</span>
                    </div>
                )}

                <div className="flex gap-3 pt-1">
                    <button type="button" onClick={handleTest} disabled={testing} className="btn-secondary flex-1">
                        {testing
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Testuji...</>
                            : <><Wifi className="w-4 h-4" /> Test připojení</>
                        }
                    </button>
                    <button type="submit" disabled={saving} className="btn-primary flex-1">
                        {saving
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Ukládám...</>
                            : <><Save className="w-4 h-4" /> Uložit</>
                        }
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
        } finally { setClearingHistory(false) }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 animate-spin text-[#9ca3af]" />
            </div>
        )
    }

    return (
        <div className="max-w-2xl space-y-5">
            <div>
                <h1 className="text-xl font-bold text-[#111827]">Nastavení</h1>
                <p className="text-sm text-[#6b7280] mt-0.5">Konfigurace SMS Gateway</p>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-xs font-semibold text-blue-700">Jak nastavit SMS Gateway</p>
                    <ol className="text-xs text-blue-600/80 space-y-0.5 list-decimal list-inside">
                        <li>Nainstalujte <strong>SMS Gateway</strong> na Android telefon (GitHub: capcom6/android-sms-gateway)</li>
                        <li>Vytvořte účet na <strong>app.sms-gate.app</strong></li>
                        <li>V aplikaci aktivujte Cloud relay a přihlaste se</li>
                        <li>Zadejte přihlašovací údaje níže</li>
                    </ol>
                    <p className="text-xs text-blue-600 mt-1">
                        Při odesílání se automaticky použije gateway, která je zrovna online. Gateway 1 má prioritu.
                    </p>
                    <button
                        onClick={() => window.electronAPI?.shell.openExternal('https://sms-gate.app')}
                        className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition-colors mt-1"
                    >
                        <ExternalLink className="w-3 h-3" /> sms-gate.app
                    </button>
                </div>
            </div>

            <GatewayForm gatewayNumber={1} defaultName="Zaměstnanec 1" initialData={gw1} onSave={saveGateway1} />
            <GatewayForm gatewayNumber={2} defaultName="Zaměstnanec 2" initialData={gw2} onSave={saveGateway2} />

            {appInfo && (
                <div className="app-card p-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-[#9ca3af]" />
                        <h2 className="text-sm font-semibold text-[#111827]">Informace o aplikaci</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { label: 'Verze', value: appInfo.version },
                            { label: 'Platforma', value: appInfo.platform },
                            { label: 'Electron', value: appInfo.electronVersion },
                            { label: 'Node.js', value: appInfo.nodeVersion },
                        ].map(item => (
                            <div key={item.label} className="bg-[#f9fafb] border border-[#f3f4f6] rounded-xl p-3">
                                <p className="text-xs text-[#9ca3af]">{item.label}</p>
                                <p className="text-sm font-mono text-[#374151] mt-0.5">{item.value}</p>
                            </div>
                        ))}
                    </div>
                    <div className="bg-[#f9fafb] border border-[#f3f4f6] rounded-xl p-3">
                        <p className="text-xs text-[#9ca3af] mb-1">Databáze</p>
                        <div className="flex items-center gap-2">
                            <p className="text-xs font-mono text-[#6b7280] flex-1 truncate">{appInfo.dbPath}</p>
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

            <div className="app-card p-5 space-y-3 border-red-100">
                <div className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-red-500" />
                    <h2 className="text-sm font-semibold text-red-600">Nebezpečná zóna</h2>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-xl">
                    <div>
                        <p className="text-sm font-medium text-[#111827]">Smazat celou historii SMS</p>
                        <p className="text-xs text-[#6b7280]">Smaže všechny záznamy. Tato akce je nevratná.</p>
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