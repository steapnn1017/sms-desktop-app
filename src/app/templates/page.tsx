'use client'

import { useEffect, useState } from 'react'
import {
    FileText, Plus, Edit2, Trash2, Star, X, Save, Eye, RefreshCw,
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

function TemplateModal({ template, onClose, onSave }: {
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
        try { await onSave(data) } finally { setSaving(false) }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-2xl w-full max-w-xl mx-4 animate-fade-in">
                <div className="flex items-center justify-between p-5 border-b border-[#f3f4f6]">
                    <h2 className="text-base font-semibold text-[#111827]">
                        {template ? 'Upravit šablonu' : 'Nová šablona'}
                    </h2>
                    <button onClick={onClose} className="btn-ghost p-2"><X className="w-4 h-4" /></button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
                    <div>
                        <label className="text-xs text-[#6b7280] mb-1.5 block font-medium">Název šablony *</label>
                        <input
                            {...register('name', { required: 'Název je povinný' })}
                            className={cn('app-input', errors.name && 'border-red-400')}
                            placeholder="Zakázka připravena"
                        />
                        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                    </div>

                    <div>
                        <label className="text-xs text-[#6b7280] mb-1.5 block font-medium">Popis (volitelné)</label>
                        <input
                            {...register('description')}
                            className="app-input"
                            placeholder="Krátký popis použití šablony"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs text-[#6b7280] font-medium">Text zprávy *</label>
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
                                        className="px-2 py-0.5 rounded-md bg-[#fff4ea] border border-[#f07820]/20 text-[10px] text-[#f07820] hover:bg-[#f07820] hover:text-white transition-all font-mono"
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
                            className={cn('app-input resize-none font-mono text-sm', errors.content && 'border-red-400')}
                            placeholder="Dobrý den, Vaše zakázka č. {zakazka} je připravena..."
                        />
                        {errors.content && <p className="text-xs text-red-500 mt-1">{errors.content.message}</p>}
                    </div>

                    {preview && (
                        <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-xl p-3">
                            <div className="flex items-center gap-1.5 mb-2">
                                <Eye className="w-3.5 h-3.5 text-[#9ca3af]" />
                                <span className="text-[10px] text-[#9ca3af] uppercase tracking-wider font-medium">Náhled</span>
                            </div>
                            <p className="text-sm text-[#374151] leading-relaxed whitespace-pre-wrap">{preview}</p>
                        </div>
                    )}

                    <label className="flex items-center gap-3 cursor-pointer py-1">
                        <div
                            onClick={() => setValue('isDefault', !watch('isDefault'))}
                            className={cn(
                                'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0',
                                watch('isDefault')
                                    ? 'bg-[#f07820] border-[#f07820]'
                                    : 'border-[#d1d5db] hover:border-[#f07820]/50'
                            )}
                        >
                            {watch('isDefault') && <span className="text-white text-xs font-bold leading-none">✓</span>}
                        </div>
                        <span className="text-sm text-[#374151]">Nastavit jako výchozí šablonu</span>
                    </label>

                    <div className="flex gap-2 pt-1">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1">Zrušit</button>
                        <button type="submit" disabled={saving} className="btn-primary flex-1">
                            {saving
                                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Ukládám...</>
                                : <><Save className="w-4 h-4" /> Uložit</>
                            }
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
        } catch { toast.error('Chyba při načítání šablon') }
        finally { setLoading(false) }
    }

    useEffect(() => { loadTemplates() }, [])

    const handleSave = async (data: TemplateFormData) => {
        if (!isElectron) return
        try {
            const result = editingTemplate
                ? await window.electronAPI.templates.update({ id: editingTemplate.id, ...data })
                : await window.electronAPI.templates.create(data)
            if (result.success) {
                toast.success(editingTemplate ? 'Šablona aktualizována' : 'Šablona vytvořena')
                setModalOpen(false); setEditingTemplate(null); loadTemplates()
            } else { toast.error('Chyba při ukládání', { description: result.error }) }
        } catch (err) { toast.error('Chyba', { description: String(err) }) }
    }

    const handleDelete = async (id: string) => {
        if (!isElectron) return
        setDeleting(id)
        try {
            const result = await window.electronAPI.templates.delete(id)
            if (result.success) { setTemplates(prev => prev.filter(t => t.id !== id)); toast.success('Šablona smazána') }
            else { toast.error('Chyba při mazání', { description: result.error }) }
        } finally { setDeleting(null) }
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-[#111827]">Šablony SMS</h1>
                    <p className="text-sm text-[#6b7280] mt-0.5">{templates.length} šablon</p>
                </div>
                <button onClick={() => { setEditingTemplate(null); setModalOpen(true) }} className="btn-primary">
                    <Plus className="w-4 h-4" /> Nová šablona
                </button>
            </div>

            {/* Variables reference */}
            <div className="app-card p-4">
                <p className="text-xs text-[#9ca3af] mb-3 uppercase tracking-wider font-medium">Dostupné proměnné</p>
                <div className="flex flex-wrap gap-2">
                    {TEMPLATE_VARS.map(v => (
                        <div key={v.key} className="flex items-center gap-1.5 bg-[#fff4ea] border border-[#f07820]/20 rounded-lg px-3 py-1.5">
                            <span className="text-xs font-mono text-[#f07820] font-semibold">{v.key}</span>
                            <span className="text-[10px] text-[#9ca3af]">{v.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Templates grid */}
            <div className="grid grid-cols-2 gap-4">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="app-card p-5 space-y-3">
                            <div className="skeleton h-4 w-32 rounded" />
                            <div className="skeleton h-16 w-full rounded" />
                        </div>
                    ))
                ) : templates.length === 0 ? (
                    <div className="col-span-2 app-card p-12 text-center">
                        <FileText className="w-10 h-10 text-[#e5e7eb] mx-auto mb-3" />
                        <p className="text-sm text-[#6b7280]">Žádné šablony</p>
                        <button onClick={() => setModalOpen(true)} className="btn-primary mt-4">
                            <Plus className="w-4 h-4" /> Vytvořit první šablonu
                        </button>
                    </div>
                ) : (
                    templates.map(tmpl => (
                        <div key={tmpl.id} className="app-card p-5 space-y-3 group hover:border-[#d1d5db] hover:shadow-md transition-all duration-150">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                    {Boolean(tmpl.isDefault) && (
                                        <Star className="w-3.5 h-3.5 text-[#f07820] fill-[#f07820] flex-shrink-0" />
                                    )}
                                    <h3 className="text-sm font-semibold text-[#111827]">{tmpl.name}</h3>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => { setEditingTemplate(tmpl); setModalOpen(true) }}
                                        className="icon-btn-orange"
                                    >
                                        <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(tmpl.id)}
                                        disabled={deleting === tmpl.id}
                                        className="icon-btn-red"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                            {tmpl.description && (
                                <p className="text-xs text-[#9ca3af]">{tmpl.description}</p>
                            )}
                            <div className="bg-[#f9fafb] rounded-xl p-3 border border-[#f3f4f6]">
                                <p className="text-xs text-[#374151] font-mono leading-relaxed whitespace-pre-wrap">
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