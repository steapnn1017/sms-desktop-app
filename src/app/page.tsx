'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  TrendingUp,
  Users,
  Zap,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import { cn, formatDateTime, formatRelativeTime, getStatusBg, toNumber, truncate } from '@/lib/utils'
import type { DailyStats, SmsHistory, WeekChartEntry } from '@/types'
import { toast } from 'sonner'

interface StatsData {
  today: DailyStats
  weekChart: WeekChartEntry[]
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  delay = 0,
}: {
  label: string
  value: number | string
  icon: React.ElementType
  color: string
  delay?: number
}) {
  return (
    <div
      className="stat-card animate-fade-in"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#525252] uppercase tracking-wider">{label}</span>
        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', color)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-3xl font-bold text-[#f5f5f5] tabular-nums">{value}</div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="stat-card">
      <div className="skeleton h-4 w-24 rounded" />
      <div className="skeleton h-9 w-16 rounded mt-1" />
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<StatsData | null>(null)
  const [recentSms, setRecentSms] = useState<SmsHistory[]>([])
  const [loading, setLoading] = useState(true)
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI

  const loadData = async () => {
    if (!isElectron) {
      // Mock data for browser preview
      setStats({
        today: { total: 12, sent: 10, failed: 1, pending: 1 },
        weekChart: [],
      })
      setRecentSms([])
      setLoading(false)
      return
    }

    try {
      const [statsData, historyData] = await Promise.all([
        window.electronAPI.sms.getDailyStats(),
        window.electronAPI.sms.getHistory({ limit: 8, offset: 0 }),
      ])
      setStats(statsData)
      setRecentSms((historyData.data as SmsHistory[]) || [])
    } catch (error) {
      toast.error('Chyba při načítání dat')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const quickActions = [
    {
      label: 'Zakázka připravena',
      icon: CheckCircle2,
      color: 'text-green-400',
      bg: 'bg-green-400/10 border-green-400/20 hover:border-green-400/40',
      templateId: 'tpl_ready',
    },
    {
      label: 'Zakázka přijata',
      icon: MessageSquare,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10 border-blue-400/20 hover:border-blue-400/40',
      templateId: 'tpl_received',
    },
    {
      label: 'Připomínka',
      icon: Clock,
      color: 'text-yellow-400',
      bg: 'bg-yellow-400/10 border-yellow-400/20 hover:border-yellow-400/40',
      templateId: 'tpl_reminder',
    },
    {
      label: 'Vlastní zpráva',
      icon: Zap,
      color: 'text-[#fd8408]',
      bg: 'bg-[#fd8408]/10 border-[#fd8408]/20 hover:border-[#fd8408]/40',
      templateId: 'tpl_custom',
    },
  ]

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5]">Dashboard</h1>
          <p className="text-sm text-[#525252] mt-0.5">
            {new Date().toLocaleDateString('cs-CZ', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <button
          onClick={loadData}
          className="btn-ghost text-[#525252] hover:text-[#a3a3a3]"
          title="Obnovit"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard
              label="SMS dnes"
              value={toNumber(stats?.today.total ?? 0)}
              icon={Send}
              color="bg-[#fd8408]/10 text-[#fd8408]"
              delay={0}
            />
            <StatCard
              label="Odesláno"
              value={toNumber(stats?.today.sent ?? 0)}
              icon={CheckCircle2}
              color="bg-green-400/10 text-green-400"
              delay={60}
            />
            <StatCard
              label="Chyby"
              value={toNumber(stats?.today.failed ?? 0)}
              icon={XCircle}
              color="bg-red-400/10 text-red-400"
              delay={120}
            />
            <StatCard
              label="Čeká"
              value={toNumber(stats?.today.pending ?? 0)}
              icon={Clock}
              color="bg-yellow-400/10 text-yellow-400"
              delay={180}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-5 gap-4">
        {/* Quick actions */}
        <div className="col-span-2 app-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#fd8408]" />
            <h2 className="text-sm font-semibold text-[#f5f5f5]">Rychlé akce</h2>
          </div>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <button
                key={action.templateId}
                onClick={() =>
                  router.push(`/send?templateId=${action.templateId}`)
                }
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-150 text-left',
                  action.bg
                )}
              >
                <action.icon className={cn('w-4 h-4 flex-shrink-0', action.color)} />
                <span className="text-sm font-medium text-[#f5f5f5]">{action.label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#525252] ml-auto" />
              </button>
            ))}
          </div>
        </div>

        {/* Recent messages */}
        <div className="col-span-3 app-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#fd8408]" />
              <h2 className="text-sm font-semibold text-[#f5f5f5]">Poslední zprávy</h2>
            </div>
            <button
              onClick={() => router.push('/history')}
              className="text-xs text-[#525252] hover:text-[#fd8408] transition-colors flex items-center gap-1"
            >
              Vše <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : recentSms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="w-8 h-8 text-[#262626] mb-2" />
              <p className="text-sm text-[#525252]">Zatím žádné zprávy</p>
              <button
                onClick={() => router.push('/send')}
                className="btn-primary mt-3 text-xs py-2 px-4"
              >
                Odeslat první SMS
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {recentSms.map((sms) => (
                <div
                  key={sms.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#1a1a1a] transition-colors cursor-default"
                >
                  <div className="flex-shrink-0">
                    <span className={cn('status-badge text-[10px]', getStatusBg(sms.status))}>
                      {sms.status === 'sent' || sms.status === 'delivered'
                        ? '✓'
                        : sms.status === 'failed'
                        ? '✗'
                        : '…'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[#f5f5f5] font-mono">
                        {sms.phone}
                      </span>
                      {sms.orderNumber && (
                        <span className="text-[10px] text-[#525252]">#{sms.orderNumber}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#525252] truncate">{truncate(sms.message, 60)}</p>
                  </div>
                  <span className="text-[10px] text-[#404040] flex-shrink-0">
                    {formatRelativeTime(sms.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => router.push('/send')}
          className="app-card p-5 flex items-center gap-4 hover:border-[#fd8408]/40 transition-all duration-200 group text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-[#fd8408]/10 flex items-center justify-center group-hover:bg-[#fd8408]/20 transition-colors">
            <Send className="w-5 h-5 text-[#fd8408]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#f5f5f5]">Odeslat SMS</p>
            <p className="text-xs text-[#525252]">Nová zpráva zákazníkovi</p>
          </div>
          <ArrowRight className="w-4 h-4 text-[#525252] ml-auto group-hover:text-[#fd8408] transition-colors" />
        </button>

        <button
          onClick={() => router.push('/customers')}
          className="app-card p-5 flex items-center gap-4 hover:border-[#404040] transition-all duration-200 group text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-400/10 flex items-center justify-center group-hover:bg-blue-400/20 transition-colors">
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#f5f5f5]">Zákazníci</p>
            <p className="text-xs text-[#525252]">Správa kontaktů</p>
          </div>
          <ArrowRight className="w-4 h-4 text-[#525252] ml-auto group-hover:text-blue-400 transition-colors" />
        </button>
      </div>
    </div>
  )
}
