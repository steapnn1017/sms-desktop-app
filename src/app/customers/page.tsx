'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Send,
  X,
  Save,
  RefreshCw,
  Phone,
  StickyNote,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn, formatDate, validatePhone } from '@/lib/utils'
import type { Customer } from '@/types'

type CustomerFormData = {
  name: string
  phone: string
  note: string
}

function CustomerModal({
  customer,
  onClose,
  onSave,
}: {
  customer?: Customer | null
  onClose: () => void
  onSave: (data: CustomerFormData) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<CustomerFormData>({
    defaultValues: {
      name: customer?.name || '',
      phone: customer?.phone || '',
      note: customer?.note || '',
    },
  })

  const onSubmit = async (data: CustomerFormData) => {
    setSaving(true)
    try { await onSave(data) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="app-card w-full max-w-md mx-4 shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-[#1a1a1a]">
          <h2 className="text-base font-semibold text-[#f5f5f5]">
            {customer ? 'Upravit zákazníka' : 'Nový zákazník'}
          </h2>
          <button onClick={onClose} className="btn-ghost p-2">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="text-xs text-[#525252] mb-1.5 block">Jméno / název *</label>
            <input
              {...register('name', { required: 'Jméno je povinné' })}
              className={cn('app-input', errors.name && 'border-red-500/50')}
              placeholder="Jan Novák"
            />
            {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="text-xs text-[#525252] mb-1.5 block">Telefonní číslo *</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#525252]" />
              <input
                {...register('phone', {
                  required: 'Telefon je povinný',
                  validate: v => validatePhone(v) || 'Neplatný formát čísla',
                })}
                className={cn('app-input pl-9', errors.phone && 'border-red-500/50')}
                placeholder="+420 777 123 456"
              />
            </div>
            {errors.phone && <p className="text-xs text-red-400 mt-1">{errors.phone.message}</p>}
          </div>
          <div>
            <label className="text-xs text-[#525252] mb-1.5 block">Poznámka</label>
            <div className="relative">
              <StickyNote className="absolute left-3 top-3 w-4 h-4 text-[#525252]" />
              <textarea
                {...register('note')}
                rows={2}
                className="app-input pl-9 resize-none"
                placeholder="Volitelná poznámka..."
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Zrušit</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Ukládám...</> : <><Save className="w-4 h-4" /> Uložit</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const isElectron = typeof window !== 'undefined' && !!window.electronAPI

  const loadCustomers = useCallback(async () => {
    if (!isElectron) { setLoading(false); return }
    setLoading(true)
    try {
      const result = await window.electronAPI.customers.getAll({ search: search || undefined, limit: 100 })
      setCustomers(result.data as Customer[] || [])
      setTotal(result.total || 0)
    } catch { toast.error('Chyba při načítání zákazníků') }
    finally { setLoading(false) }
  }, [isElectron, search])

  useEffect(() => { loadCustomers() }, [loadCustomers])

  const handleSave = async (data: CustomerFormData) => {
    if (!isElectron) return
    try {
      let result
      if (editingCustomer) {
        result = await window.electronAPI.customers.update({ id: editingCustomer.id, ...data })
      } else {
        result = await window.electronAPI.customers.create(data)
      }
      if (result.success) {
        toast.success(editingCustomer ? 'Zákazník aktualizován' : 'Zákazník přidán')
        setModalOpen(false)
        setEditingCustomer(null)
        loadCustomers()
      } else {
        toast.error('Chyba při ukládání', { description: result.error })
      }
    } catch (err) { toast.error('Chyba', { description: String(err) }) }
  }

  const handleDelete = async (id: string) => {
    if (!isElectron) return
    setDeleting(id)
    try {
      const result = await window.electronAPI.customers.delete(id)
      if (result.success) {
        setCustomers(prev => prev.filter(c => c.id !== id))
        toast.success('Zákazník smazán')
      } else {
        toast.error('Chyba při mazání')
      }
    } finally { setDeleting(null) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5]">Zákazníci</h1>
          <p className="text-sm text-[#525252] mt-0.5">{total} zákazníků v databázi</p>
        </div>
        <button onClick={() => { setEditingCustomer(null); setModalOpen(true) }} className="btn-primary">
          <Plus className="w-4 h-4" /> Přidat zákazníka
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#525252]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Hledat zákazníka..."
          className="app-input pl-9"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-3.5 h-3.5 text-[#525252]" />
          </button>
        )}
      </div>

      {/* Customer grid */}
      <div className="grid grid-cols-3 gap-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="app-card p-4 space-y-2">
              <div className="skeleton h-4 w-32 rounded" />
              <div className="skeleton h-3 w-24 rounded" />
            </div>
          ))
        ) : customers.length === 0 ? (
          <div className="col-span-3 app-card p-12 text-center">
            <Users className="w-10 h-10 text-[#262626] mx-auto mb-3" />
            <p className="text-sm text-[#525252]">{search ? 'Žádné výsledky' : 'Zatím žádní zákazníci'}</p>
            {!search && (
              <button onClick={() => setModalOpen(true)} className="btn-primary mt-4">
                <Plus className="w-4 h-4" /> Přidat zákazníka
              </button>
            )}
          </div>
        ) : (
          customers.map(c => (
            <div key={c.id} className="app-card p-4 group hover:border-[#404040] transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-[#262626] flex items-center justify-center text-sm font-bold text-[#a3a3a3]">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#f5f5f5]">{c.name}</p>
                    <p className="text-xs font-mono text-[#525252]">{c.phone}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditingCustomer(c); setModalOpen(true) }}
                    className="w-7 h-7 rounded-lg bg-[#1a1a1a] border border-[#262626] hover:border-[#fd8408]/50 flex items-center justify-center text-[#525252] hover:text-[#fd8408] transition-all"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={deleting === c.id}
                    className="w-7 h-7 rounded-lg bg-[#1a1a1a] border border-[#262626] hover:border-red-500/50 flex items-center justify-center text-[#525252] hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {c.note && <p className="text-xs text-[#525252] truncate">{c.note}</p>}
              <div className="flex items-center justify-between mt-3">
                <span className="text-[10px] text-[#404040]">
                  Od {formatDate(c.createdAt)}
                </span>
                <button
                  onClick={() => router.push(`/send?phone=${encodeURIComponent(c.phone)}&customerId=${c.id}`)}
                  className="flex items-center gap-1.5 text-[10px] font-medium text-[#525252] hover:text-[#fd8408] transition-colors"
                >
                  <Send className="w-3 h-3" /> Odeslat SMS
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {modalOpen && (
        <CustomerModal
          customer={editingCustomer}
          onClose={() => { setModalOpen(false); setEditingCustomer(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
