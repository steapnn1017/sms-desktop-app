'use client'

import { useEffect, useState } from 'react'
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Star,
  X,
  Save,
  Eye,
  RefreshCw,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { cn, renderTemplate } from '@/lib/utils'
import type { SmsTemplate } from '@/types'

type TemplateFormData = {
  name: string
  content: string
  description: string
  isDefault: boolean
}

const TEMPLATE_VARS = [
  { key: '{zakazka}', label: 'Číslo zakázky' },
  { key: '{cena}', label: 'Cena v Kč' },
  { key: '{poznamka}', label: 'Poznámka' },
  { key: '{telefon}', label: 'Telefon zákazníka' },
]

function TemplateModal({
  template,
  onClose,
  onSave,
}: {
  template?: SmsTemplate | null
  onClose: () => void
  onSave: (data: TemplateFormData) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState('')
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<TemplateFormData>({
    defaultValues: {
      name: template?.name || '',
      content: template?.content || '',
      description: template?.description || '',
      isDefault: Boolean(template?.isDefault) || false,
    },
  })

  const content = watch('content')

  useEffect(() => {
    setPreview(renderTemplate(content, {
      zakazka: '2024-001',
      cena: '1 500',
      poznamka: 'připraveno od pátku',
      telefon: '+420 777 123 456',
    }))
  }, [content])

  const onSubmit = async (data: TemplateFormData) => {
    setSaving(true)
    try {
      await onSave(data)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="app-card w-full max-w-xl mx-4 shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-[#1a1a1a]">
          <h2 className="text-base font-semibold text-[#f5f5f5]">
            {template ? 'Upravit šablonu' : 'Nová šablona'}
          </h2>
          <button onClick={onClose} className="btn-ghost p-2">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs text-[#525252] mb-1.5 block">Název šablony *</label>
            <input
              {...register('name', { required: 'Název je povinný' })}
              className={cn('app-input', errors.name && 'border-red-500/50')}
              placeholder="Zakázka připravena"
            />
            {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-[#525252] mb-1.5 block">Popis (volitelné)</label>
            <input
              {...register('description')}
              className="app-input"
              placeholder="Krátký popis použití šablony"
            />
          </div>

          {/* Content */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-[#525252]">Text zprávy *</label>
              <div className="flex flex-wrap gap-1">
                {TEMPLATE_VARS.map(v => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('template-content') as HTMLTextAreaElement
                      if (el) {
                        const start = el.selectionStart
                        const end = el.selectionEnd
                        const current = watch('content')
                        setValue('content', current.slice(0, start) + v.key + current.slice(end))
                        setTimeout(() => {
                          el.selectionStart = el.selectionEnd = start + v.key.length
                          el.focus()
                        }, 0)
                      }
                    }}
                    className="px-2 py-0.5 rounded-md bg-[#1a1a1a] border border-[#262626] text-[10px] text-[#a3a3a3] hover:text-[#fd8408] hover:border-[#fd8408]/30 transition-all font-mono"
                    title={v.label}
                  >
                    {v.key}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              id="template-content"
              {...register('content', { required: 'Text je povinný' })}
              rows={4}
              className={cn('app-input resize-none font-mono text-sm', errors.content && 'border-red-500/50')}
              placeholder="Dobrý den, Vaše zakázka č. {zakazka} je připravena..."
            />
            {errors.content && <p className="text-xs text-red-400 mt-1">{errors.content.message}</p>}
          </div>

          {/* Preview */}
          {preview && (
            <div className="bg-[#1a1a1a] border border-[#262626] rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Eye className="w-3.5 h-3.5 text-[#525252]" />
                <span className="text-[10px] text-[#525252] uppercase tracking-wider">Náhled</span>
              </div>
              <p className="text-sm text-[#a3a3a3] leading-relaxed">{preview}</p>
            </div>
          )}

          {/* Default checkbox */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setValue('isDefault', !watch('isDefault'))}
              className={cn(
                'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
                watch('isDefault')
                  ? 'bg-[#fd8408] border-[#fd8408]'
                  : 'border-[#404040] hover:border-[#606060]'
              )}
            >
              {watch('isDefault') && <span className="text-black text-xs font-bold">✓</span>}
            </div>
            <span className="text-sm text-[#a3a3a3]">Nastavit jako výchozí šablonu</span>
          </label>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Zrušit
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Ukládám...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="w-4 h-4" /> Uložit
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<SmsTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const isElectron = typeof window !== 'undefined' && !!window.electronAPI

  const loadTemplates = async () => {
    if (!isElectron) { setLoading(false); return }
    setLoading(true)
    try {
      const result = await window.electronAPI.templates.getAll()
      if (result.success) setTemplates(result.data as SmsTemplate[])
    } catch {
      toast.error('Chyba při načítání šablon')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTemplates() }, [])

  const handleSave = async (data: TemplateFormData) => {
    if (!isElectron) return
    try {
      let result
      if (editingTemplate) {
        result = await window.electronAPI.templates.update({ id: editingTemplate.id, ...data })
      } else {
        result = await window.electronAPI.templates.create(data)
      }
      if (result.success) {
        toast.success(editingTemplate ? 'Šablona aktualizována' : 'Šablona vytvořena')
        setModalOpen(false)
        setEditingTemplate(null)
        loadTemplates()
      } else {
        toast.error('Chyba při ukládání', { description: result.error })
      }
    } catch (err) {
      toast.error('Chyba', { description: String(err) })
    }
  }

  const handleDelete = async (id: string) => {
    if (!isElectron) return
    setDeleting(id)
    try {
      const result = await window.electronAPI.templates.delete(id)
      if (result.success) {
        setTemplates(prev => prev.filter(t => t.id !== id))
        toast.success('Šablona smazána')
      } else {
        toast.error('Chyba při mazání', { description: result.error })
      }
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5]">Šablony SMS</h1>
          <p className="text-sm text-[#525252] mt-0.5">{templates.length} šablon</p>
        </div>
        <button
          onClick={() => { setEditingTemplate(null); setModalOpen(true) }}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" /> Nová šablona
        </button>
      </div>

      {/* Variables reference */}
      <div className="app-card p-4">
        <p className="text-xs text-[#525252] mb-2 uppercase tracking-wider">Dostupné proměnné</p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATE_VARS.map(v => (
            <div key={v.key} className="flex items-center gap-1.5 bg-[#1a1a1a] border border-[#262626] rounded-lg px-2.5 py-1.5">
              <span className="text-xs font-mono text-[#fd8408]">{v.key}</span>
              <span className="text-[10px] text-[#525252]">{v.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Templates grid */}
      <div className="grid grid-cols-2 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="app-card p-5 space-y-3">
              <div className="skeleton h-4 w-32 rounded" />
              <div className="skeleton h-16 w-full rounded" />
            </div>
          ))
        ) : templates.length === 0 ? (
          <div className="col-span-2 app-card p-12 text-center">
            <FileText className="w-10 h-10 text-[#262626] mx-auto mb-3" />
            <p className="text-sm text-[#525252]">Žádné šablony</p>
            <button
              onClick={() => setModalOpen(true)}
              className="btn-primary mt-4"
            >
              <Plus className="w-4 h-4" /> Vytvořit první šablonu
            </button>
          </div>
        ) : (
          templates.map(tmpl => (
            <div key={tmpl.id} className="app-card p-5 space-y-3 group hover:border-[#404040] transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {Boolean(tmpl.isDefault) && (
                    <Star className="w-3.5 h-3.5 text-[#fd8408] fill-[#fd8408]" />
                  )}
                  <h3 className="text-sm font-semibold text-[#f5f5f5]">{tmpl.name}</h3>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditingTemplate(tmpl); setModalOpen(true) }}
                    className="w-7 h-7 rounded-lg bg-[#1a1a1a] border border-[#262626] hover:border-[#fd8408]/50 flex items-center justify-center text-[#525252] hover:text-[#fd8408] transition-all"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(tmpl.id)}
                    disabled={deleting === tmpl.id}
                    className="w-7 h-7 rounded-lg bg-[#1a1a1a] border border-[#262626] hover:border-red-500/50 flex items-center justify-center text-[#525252] hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {tmpl.description && (
                <p className="text-xs text-[#525252]">{tmpl.description}</p>
              )}
              <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#1a1a1a]">
                <p className="text-xs text-[#a3a3a3] font-mono leading-relaxed whitespace-pre-wrap">
                  {tmpl.content}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {modalOpen && (
        <TemplateModal
          template={editingTemplate}
          onClose={() => { setModalOpen(false); setEditingTemplate(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
