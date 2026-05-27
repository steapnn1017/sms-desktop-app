'use client'

import { useEffect, useState, useCallback } from 'react'
import {
    History, Search, RefreshCw, Trash2, Send, ChevronLeft, ChevronRight, X,
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
    const [deleting, setDeleting] = useState<string | null>(null)
    const [resending, setResending] = useState<string | null>(null)
    const isElectron = typeof window !== 'undefined' && !!window.electronAPI

    const loadHistory = useCallback(async () => {
        if (!isElectron) { setLoading(false); return }
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
        } catch { toast.error('Chyba při načítání historie') }
        finally { setLoading(false) }
    }, [isElectron, page, search, statusFilter])

    useEffect(() => { loadHistory() }, [loadHistory])
    useEffect(() => { setPage(0) }, [search, statusFilter])

    const handleDelete = async (id: string) => {
        if (!isElectron) return
        setDeleting(id)
        try {
            const result = await window.electronAPI.sms.deleteHistory(id)
            if (result.success) {
                setHistory(prev => prev.filter(h => h.id !== id))
                setTotal(prev => prev - 1)
                toast.success('Záznam smazán')
            } else { toast.error('Nepodařilo se smazat záznam') }
        } finally { setDeleting(null) }
    }

    const handleResend = async (id: string) => {
        if (!isElectron) return
        const sms = history.find(h => h.id === id)
        if (!sms) return
        setResending(id)
        try {
            const result = await window.electronAPI.sms.send({
                phone: sms.phone, message: sms.message,
                templateId: sms.templateId || undefined,
                orderNumber: sms.orderNumber || undefined,
                price: sms.price || undefined,
            })
            if (result.success) { toast.success('SMS znovu odeslána'); loadHistory() }
            else { toast.error('Chyba při opětovném odeslání', { description: result.error }) }
        } finally { setResending(null) }
    }

    const totalPages = Math.ceil(total / PAGE_SIZE)

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-[#111827]">Historie SMS</h1>
                    <p className="text-sm text-[#6b7280] mt-0.5">{total} záznamů celkem</p>
                </div>
                <button onClick={loadHistory} className="btn-ghost">
                    <RefreshCw className="w-4 h-4" /> Obnovit
                </button>
            </div>

            {/* Filters */}
            <div className="app-card p-3 flex items-center gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Hledat dle čísla, zprávy..."
                        className="app-input pl-9"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280]">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                    {STATUS_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setStatusFilter(opt.value)}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                                statusFilter === opt.value
                                    ? 'bg-[#f07820] text-white shadow-sm'
                                    : 'bg-[#f9fafb] text-[#6b7280] hover:text-[#111827] border border-[#e5e7eb] hover:border-[#d1d5db]'
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="app-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                        <tr className="border-b border-[#f3f4f6] bg-[#fafafa]">
                            <th className="text-left text-[10px] font-semibold text-[#9ca3af] px-4 py-3 uppercase tracking-wider">Datum</th>
                            <th className="text-left text-[10px] font-semibold text-[#9ca3af] px-4 py-3 uppercase tracking-wider">Číslo</th>
                            <th className="text-left text-[10px] font-semibold text-[#9ca3af] px-4 py-3 uppercase tracking-wider">Zakázka</th>
                            <th className="text-left text-[10px] font-semibold text-[#9ca3af] px-4 py-3 uppercase tracking-wider">Zpráva</th>
                            <th className="text-left text-[10px] font-semibold text-[#9ca3af] px-4 py-3 uppercase tracking-wider">Stav</th>
                            <th className="text-left text-[10px] font-semibold text-[#9ca3af] px-4 py-3 uppercase tracking-wider">Šablona</th>
                            <th className="px-4 py-3 w-20" />
                        </tr>
                        </thead>
                        <tbody>
                        {loading ? (
                            Array.from({ length: 8 }).map((_, i) => (
                                <tr key={i} className="border-b border-[#f3f4f6]">
                                    {Array.from({ length: 7 }).map((_, j) => (
                                        <td key={j} className="px-4 py-3">
                                            <div className="skeleton h-3.5 w-full rounded" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : history.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-14 text-center">
                                    <History className="w-8 h-8 text-[#e5e7eb] mx-auto mb-2" />
                                    <p className="text-sm text-[#9ca3af]">
                                        {search || statusFilter !== 'all' ? 'Žádné výsledky' : 'Zatím žádná historie'}
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            history.map(sms => (
                                <tr key={sms.id} className="border-b border-[#f3f4f6] last:border-0 table-row-hover">
                                    <td className="px-4 py-3 text-xs text-[#9ca3af] whitespace-nowrap">
                                        {formatDateTime(sms.createdAt)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs font-mono text-[#111827] font-medium">{sms.phone}</span>
                                        {sms.customerName && (
                                            <p className="text-[10px] text-[#9ca3af] mt-0.5">{sms.customerName}</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-[#6b7280]">
                                        {sms.orderNumber
                                            ? <span className="font-mono font-medium text-[#374151]">#{sms.orderNumber}</span>
                                            : <span className="text-[#d1d5db]">—</span>
                                        }
                                    </td>
                                    <td className="px-4 py-3 max-w-xs">
                                        <p className="text-xs text-[#6b7280] truncate">{truncate(sms.message, 60)}</p>
                                        {sms.errorMsg && (
                                            <p className="text-[10px] text-red-500 mt-0.5">{sms.errorMsg}</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                            <span className={cn('status-badge', getStatusBg(sms.status))}>
                                                {getStatusLabel(sms.status)}
                                            </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-[#6b7280]">
                                        {sms.templateName || <span className="text-[#d1d5db]">—</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5 justify-end">
                                            <button
                                                onClick={() => handleResend(sms.id)}
                                                disabled={resending === sms.id}
                                                className="icon-btn-orange"
                                                title="Znovu odeslat"
                                            >
                                                {resending === sms.id
                                                    ? <RefreshCw className="w-3 h-3 animate-spin" />
                                                    : <Send className="w-3 h-3" />
                                                }
                                            </button>
                                            <button
                                                onClick={() => handleDelete(sms.id)}
                                                disabled={deleting === sms.id}
                                                className="icon-btn-red"
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

                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-[#f3f4f6] bg-[#fafafa]">
                        <p className="text-xs text-[#9ca3af]">
                            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} z {total}
                        </p>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setPage(p => p - 1)} disabled={page === 0} className="btn-ghost py-1.5 px-2 disabled:opacity-40">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs text-[#6b7280] px-2 font-medium">{page + 1} / {totalPages}</span>
                            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} className="btn-ghost py-1.5 px-2 disabled:opacity-40">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}