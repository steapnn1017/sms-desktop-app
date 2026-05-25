'use client'

import { useEffect, useState } from 'react'
import {
  Settings,
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
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { AppInfo } from '@/types'

type GatewayFormData = {
  apiUrl: string
  username: string
  password: string
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown')
  const [connectionError, setConnectionError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [clearingHistory, setClearingHistory] = useState(false)

  const isElectron = typeof window !== 'undefined' && !!window.electronAPI

  const { register, handleSubmit, reset, getValues, formState: { errors, isDirty } } = useForm<GatewayFormData>({
    defaultValues: {
      apiUrl: 'https://app.sms-gate.app/api/v1',
      username: '',
      password: '',
    },
  })

  useEffect(() => {
    if (!isElectron) { setLoading(false); return }
    Promise.all([
      window.electronAPI.settings.getAll(),
      window.electronAPI.settings.getAppInfo(),
    ]).then(([settingsResult, info]) => {
      if (settingsResult.success) {
        const s = settingsResult.data
        reset({
          apiUrl: s.gateway_api_url || 'https://app.sms-gate.app/api/v1',
          username: s.gateway_username || '',
          password: s.gateway_password_masked || '',
        })
      }
      setAppInfo(info as AppInfo)
    }).finally(() => setLoading(false))
  }, [isElectron, reset])

  const handleSave = async (data: GatewayFormData) => {
    if (!isElectron) return
    setSaving(true)
    try {
      const result = await window.electronAPI.settings.saveGateway(data)
      if (result.success) {
        toast.success('Nastavení uloženo')
        reset(data, { keepValues: true })
      } else {
        toast.error('Chyba při ukládání', { description: result.error })
      }
    } catch (err) {
      toast.error('Chyba', { description: String(err) })
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!isElectron) return
    setTesting(true)
    setConnectionStatus('unknown')
    setConnectionError('')
    try {
      const data = getValues()
      const result = await window.electronAPI.settings.testGateway(data)
      if (result.connected) {
        setConnectionStatus('success')
        toast.success('Připojení úspěšné!', {
          description: 'SMS Gateway je dostupná a přihlašovací údaje jsou správné.',
        })
      } else {
        setConnectionStatus('error')
        setConnectionError(result.error || 'Neznámá chyba')
        toast.error('Připojení selhalo', { description: result.error })
      }
    } catch (err) {
      setConnectionStatus('error')
      toast.error('Chyba při testování', { description: String(err) })
    } finally {
      setTesting(false)
    }
  }

  const handleClearHistory = async () => {
    if (!isElectron) return
    if (!confirm('Opravdu smazat celou historii SMS? Tato akce je nevratná.')) return
    setClearingHistory(true)
    try {
      const result = await window.electronAPI.settings.clearHistory()
      if (result.success) {
        toast.success('Historie smazána')
      } else {
        toast.error('Chyba při mazání')
      }
    } finally {
      setClearingHistory(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#f5f5f5]">Nastavení</h1>
        <p className="text-sm text-[#525252] mt-0.5">Konfigurace SMS Gateway a aplikace</p>
      </div>

      {/* Gateway setup */}
      <div className="app-card p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4 text-[#fd8408]" />
          <h2 className="text-sm font-semibold text-[#f5f5f5]">SMS Gateway (sms-gate.app)</h2>
          <button
            type="button"
            onClick={() => window.electronAPI?.shell.openExternal('https://sms-gate.app')}
            className="ml-auto flex items-center gap-1 text-xs text-[#525252] hover:text-[#fd8408] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            sms-gate.app
          </button>
        </div>

        {/* Info box */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex gap-3">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-medium text-blue-300">Jak nastavit SMS Gateway</p>
            <ol className="text-xs text-[#525252] space-y-0.5 list-decimal list-inside">
              <li>Nainstalujte aplikaci <strong className="text-[#a3a3a3]">SMS Gateway</strong> z Google Play na Android telefon</li>
              <li>Vytvořte účet na <strong className="text-[#a3a3a3]">app.sms-gate.app</strong></li>
              <li>V aplikaci se přihlaste ke svému účtu a aktivujte Cloud relay</li>
              <li>Zadejte své přihlašovací údaje níže a klikněte na Test připojení</li>
            </ol>
          </div>
        </div>

        <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
          {/* API URL */}
          <div>
            <label className="text-xs text-[#525252] mb-1.5 block">API URL</label>
            <input
              {...register('apiUrl', { required: true })}
              className="app-input font-mono text-sm"
              placeholder="https://app.sms-gate.app/api/v1"
            />
            <p className="text-[10px] text-[#404040] mt-1">
              Výchozí URL pro Cloud API. Změňte pouze při použití Local relay.
            </p>
          </div>

          {/* Username */}
          <div>
            <label className="text-xs text-[#525252] mb-1.5 block">Uživatelské jméno *</label>
            <input
              {...register('username', { required: 'Uživatelské jméno je povinné' })}
              className={cn('app-input', errors.username && 'border-red-500/50')}
              placeholder="váš@email.cz nebo username"
              autoComplete="username"
            />
            {errors.username && <p className="text-xs text-red-400 mt-1">{errors.username.message}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="text-xs text-[#525252] mb-1.5 block">Heslo *</label>
            <div className="relative">
              <input
                {...register('password', { required: 'Heslo je povinné' })}
                type={showPassword ? 'text' : 'password'}
                className={cn('app-input pr-10', errors.password && 'border-red-500/50')}
                placeholder="••••••••"
                autoComplete="current-password"
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

          {/* Connection status */}
          {connectionStatus !== 'unknown' && (
            <div className={cn(
              'flex items-center gap-2.5 p-3 rounded-xl text-sm',
              connectionStatus === 'success'
                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            )}>
              {connectionStatus === 'success' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              <span>
                {connectionStatus === 'success'
                  ? 'Připojení úspěšné — gateway je online'
                  : `Chyba: ${connectionError}`}
              </span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || loading}
              className="btn-secondary flex-1"
            >
              {testing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Testuji...</>
              ) : connectionStatus === 'success' ? (
                <><Wifi className="w-4 h-4 text-green-400" /> Online</>
              ) : connectionStatus === 'error' ? (
                <><WifiOff className="w-4 h-4 text-red-400" /> Zkusit znovu</>
              ) : (
                <><Wifi className="w-4 h-4" /> Test připojení</>
              )}
            </button>
            <button
              type="submit"
              disabled={saving || loading}
              className="btn-primary flex-1"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Ukládám...</>
              ) : (
                <><Save className="w-4 h-4" /> Uložit nastavení</>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* App info */}
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

      {/* Danger zone */}
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
          <button
            onClick={handleClearHistory}
            disabled={clearingHistory}
            className="btn-danger ml-4"
          >
            {clearingHistory ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Mažu...</>
            ) : (
              <><Trash2 className="w-4 h-4" /> Smazat historii</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
