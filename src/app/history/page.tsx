'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  History,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  Send,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatDateTime, getStatusBg, getStatusLabel, truncate } from '@/lib/utils'
import type { SmsHistory } from '@/types'

const STATUS_OPTIONS = [
  { value: 'all', label: 'Všechny' },
  { value: 'sent', label: 'Odeslané' },
  { value: 'failed', label: 'Chyby' },
  { value: 'pending', label: 'Čeká' },
  { value: 'delivered', label: 'Doručeno' },
]

const PAGE_SIZE = 20

export default function HistoryPage() {
  const [history, setHistory] = useState<SmsHistory[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState<string | null>(null)
  const [resending, setResending] = useState<string | null>(null)

  const isElectron = typeof window !== 'undefined' && !!window.electronAPI

  const loadHistory = useCallback(async () => {
    if (!isElectron) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const result = await window.electronAPI.sms.getHistory({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      })
      setHistory((result.data as SmsHistory[]) || [])
      setTotal(result.total || 0)
    } catch {
      toast.error('Chyba při načítání historie')
    } finally {
      setLoading(false)
    }
  }, [isElectron, page, search, statusFilter])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // Reset page on filter change
  useEffect(() => {
    setPage(0)
  }, [search, statusFilter])

  const handleDelete = async (id: string) => {
    if (!isElectron) return
    setDeleting(id)
    try {
      const result = await window.electronAPI.sms.deleteHistory(id)
      if (result.success) {
        setHistory(prev => prev.filter(h => h.id !== id))
        setTotal(prev => prev - 1)
        toast.success('Záznam smazán')
      } else {
        toast.error('Nepodařilo se smazat záznam')
      }
    } finally {
      setDeleting(null)
    }
  }

  const handleResend = async (id: string) => {
    if (!isElectron) return
    const sms = history.find(h => h.id === id)
    if (!sms) return

    setResending(id)
    try {
      const result = await window.electronAPI.sms.send({
        phone: sms.phone,
        message: sms.message,
        templateId: sms.templateId || undefined,
        orderNumber: sms.orderNumber || undefined,
        price: sms.price || undefined,
      })
      if (result.success) {
        toast.success('SMS znovu odeslána')
        loadHistory()
      } else {
        toast.error('Chyba při opětovném odeslání', { description: result.error })
      }
    } finally {
      setResending(null)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5]">Historie SMS</h1>
          <p className="text-sm text-[#525252] mt-0.5">{total} záznamů celkem</p>
        </div>
        <button onClick={loadHistory} className="btn-ghost">
          <RefreshCw className="w-4 h-4" />
          Obnovit
        </button>
      </div>

      {/* Filters */}
      <div className="app-card p-4 flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#525252]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Hledat dle čísla, zprávy..."
            className="app-input pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#525252] hover:text-[#a3a3a3]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-[#525252]" />
          <div className="flex gap-1">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                  statusFilter === opt.value
                    ? 'bg-[#fd8408] text-black'
                    : 'bg-[#1a1a1a] text-[#a3a3a3] hover:text-[#f5f5f5] border border-[#262626]'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="app-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1a1a1a]">
                <th className="text-left text-xs font-medium text-[#525252] px-4 py-3 uppercase tracking-wider">
                  Datum
                </th>
                <th className="text-left text-xs font-medium text-[#525252] px-4 py-3 uppercase tracking-wider">
                  Číslo
                </th>
                <th className="text-left text-xs font-medium text-[#525252] px-4 py-3 uppercase tracking-wider">
                  Zakázka
                </th>
                <th className="text-left text-xs font-medium text-[#525252] px-4 py-3 uppercase tracking-wider">
                  Zpráva
                </th>
                <th className="text-left text-xs font-medium text-[#525252] px-4 py-3 uppercase tracking-wider">
                  Stav
                </th>
                <th className="text-left text-xs font-medium text-[#525252] px-4 py-3 uppercase tracking-wider">
                  Šablona
                </th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#1a1a1a]">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="skeleton h-4 w-full rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <History className="w-8 h-8 text-[#262626] mx-auto mb-2" />
                    <p className="text-sm text-[#525252]">
                      {search || statusFilter !== 'all' ? 'Žádné výsledky' : 'Zatím žádná historia'}
                    </p>
                  </td>
                </tr>
              ) : (
                history.map(sms => (
                  <tr
                    key={sms.id}
                    className="border-b border-[#1a1a1a] last:border-0 table-row-hover"
                  >
                    <td className="px-4 py-3 text-xs text-[#525252] whitespace-nowrap">
                      {formatDateTime(sms.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-[#f5f5f5]">{sms.phone}</span>
                      {sms.customerName && (
                        <p className="text-[10px] text-[#525252]">{sms.customerName}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#a3a3a3]">
                      {sms.orderNumber ? (
                        <span className="font-mono">#{sms.orderNumber}</span>
                      ) : (
                        <span className="text-[#404040]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-xs text-[#a3a3a3] truncate">{truncate(sms.message, 60)}</p>
                      {sms.errorMsg && (
                        <p className="text-[10px] text-red-400 mt-0.5">{sms.errorMsg}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('status-badge', getStatusBg(sms.status))}>
                        {getStatusLabel(sms.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#525252]">
                      {sms.templateName || <span className="text-[#404040]">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => handleResend(sms.id)}
                          disabled={resending === sms.id}
                          className="w-7 h-7 rounded-lg bg-[#1a1a1a] border border-[#262626] hover:border-[#fd8408]/50 flex items-center justify-center text-[#525252] hover:text-[#fd8408] transition-all"
                          title="Znovu odeslat"
                        >
                          <Send className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(sms.id)}
                          disabled={deleting === sms.id}
                          className="w-7 h-7 rounded-lg bg-[#1a1a1a] border border-[#262626] hover:border-red-500/50 flex items-center justify-center text-[#525252] hover:text-red-400 transition-all"
                          title="Smazat"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#1a1a1a]">
            <p className="text-xs text-[#525252]">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} z {total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 0}
                className="btn-ghost py-1.5 px-2 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-[#a3a3a3] px-2">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages - 1}
                className="btn-ghost py-1.5 px-2 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
