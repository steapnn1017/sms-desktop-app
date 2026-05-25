'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
    Send, User, Hash, DollarSign, MessageSquare,
    CheckCircle2, Loader2, FileText, Phone, StickyNote,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, normalizePhone, validatePhone, renderTemplate, formatPhone } from '@/lib/utils'
import type { SmsTemplate, Customer } from '@/types'

const schema = z.object({
    phone: z.string().min(1, 'Zadejte telefonní číslo').refine(
        (v) => validatePhone(v), 'Neplatný formát čísla (např. +420 777 123 456)'
    ),
    orderNumber: z.string().optional(),
    price: z.string().optional(),
    note: z.string().optional(),
    templateId: z.string().min(1, 'Vyberte šablonu'),
    message: z.string().min(1, 'Zpráva nesmí být prázdná').max(800, 'Max 800 znaků'),
    customerId: z.string().optional(),
})

type FormData = z.infer<typeof schema>

function SendSmsForm() {
    const searchParams = useSearchParams()
    const presetTemplateId = searchParams.get('templateId')

    const [templates, setTemplates] = useState<SmsTemplate[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)
    const [customerSearch, setCustomerSearch] = useState('')
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

    const isElectron = typeof window !== 'undefined' && !!window.electronAPI

    const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            templateId: presetTemplateId || '',
            phone: '',
            orderNumber: '',
            price: '',
            note: '',
            message: '',
        },
    })

    const watchedValues = watch(['templateId', 'orderNumber', 'price', 'note', 'phone'])
    const [selectedTemplateId, orderNumber, price, note, phone] = watchedValues

    useEffect(() => {
        if (!isElectron) return
        Promise.all([
            window.electronAPI.templates.getAll(),
            window.electronAPI.customers.getAll({ limit: 200 }),
        ]).then(([tmplResult, custResult]) => {
            if (tmplResult.success) setTemplates(tmplResult.data as SmsTemplate[])
            if (custResult.data) setCustomers(custResult.data as Customer[])
        })
    }, [isElectron])

    const generateMessage = useCallback(() => {
        const template = templates.find((t) => t.id === selectedTemplateId)
        if (!template) return
        const vars: Record<string, string> = {
            zakazka: orderNumber || '',
            cena: price || '',
            poznamka: note || '',
            telefon: normalizePhone(phone || ''),
        }
        setValue('message', renderTemplate(template.content, vars))
    }, [templates, selectedTemplateId, orderNumber, price, note, phone, setValue])

    useEffect(() => { generateMessage() }, [generateMessage])

    useEffect(() => {
        if (presetTemplateId && templates.length > 0) setValue('templateId', presetTemplateId)
    }, [presetTemplateId, templates, setValue])

    const filteredCustomers = customers.filter(
        (c) => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch)
    )

    const selectCustomer = (customer: Customer) => {
        setValue('phone', customer.phone)
        setValue('customerId', customer.id)
        setCustomerSearch(customer.name)
        setShowCustomerDropdown(false)
    }

    const onSubmit = async (data: FormData) => {
        if (!isElectron) { toast.error('Nejste v Electron prostředí'); return }
        setSending(true)
        try {
            const result = await window.electronAPI.sms.send({
                phone: normalizePhone(data.phone),
                message: data.message,
                templateId: data.templateId || undefined,
                customerId: data.customerId || undefined,
                orderNumber: data.orderNumber || undefined,
                price: data.price || undefined,
            })
            if (result.success) {
                toast.success('SMS úspěšně odeslána!', { description: `Na číslo ${formatPhone(normalizePhone(data.phone))}` })
                setSent(true)
                setTimeout(() => {
                    setSent(false)
                    reset({ templateId: data.templateId, phone: '', orderNumber: '', price: '', note: '', message: '' })
                    setCustomerSearch('')
                }, 2000)
                window.electronAPI.notification.show('SMS odeslána', `Zpráva na ${formatPhone(normalizePhone(data.phone))} byla odeslána.`)
            } else {
                toast.error('Chyba při odesílání SMS', { description: result.error || 'Neznámá chyba' })
            }
        } catch (error) {
            toast.error('Chyba', { description: String(error) })
        } finally {
            setSending(false)
        }
    }

    const messageValue = watch('message')
    const charCount = messageValue?.length || 0
    const smsCount = Math.ceil(charCount / 160) || 1

    return (
        <div className="max-w-2xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[#f5f5f5]">Odeslat SMS</h1>
                <p className="text-sm text-[#525252] mt-0.5">Vyberte šablonu a vyplňte údaje zakázky</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Template selector */}
                <div className="app-card p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-[#fd8408]" />
                        <span className="text-sm font-semibold text-[#f5f5f5]">Šablona zprávy</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {templates.length === 0 ? (
                            <div className="col-span-2 text-sm text-[#525252] py-2">Načítání šablon...</div>
                        ) : (
                            templates.map((tmpl) => (
                                <button
                                    key={tmpl.id}
                                    type="button"
                                    onClick={() => setValue('templateId', tmpl.id)}
                                    className={cn(
                                        'p-3 rounded-xl border text-left transition-all duration-150',
                                        selectedTemplateId === tmpl.id
                                            ? 'border-[#fd8408]/50 bg-[#fd8408]/10 text-[#f5f5f5]'
                                            : 'border-[#262626] bg-[#1a1a1a] text-[#a3a3a3] hover:border-[#404040] hover:text-[#f5f5f5]'
                                    )}
                                >
                                    <p className="text-xs font-semibold">{tmpl.name}</p>
                                    {tmpl.description && <p className="text-[10px] mt-0.5 opacity-60">{tmpl.description}</p>}
                                </button>
                            ))
                        )}
                    </div>
                    {errors.templateId && <p className="text-xs text-red-400">{errors.templateId.message}</p>}
                </div>

                {/* Phone / Customer */}
                <div className="app-card p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Phone className="w-4 h-4 text-[#fd8408]" />
                        <span className="text-sm font-semibold text-[#f5f5f5]">Příjemce</span>
                    </div>
                    <div className="relative">
                        <label className="text-xs text-[#525252] mb-1.5 block">Zákazník (volitelné)</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#525252]" />
                            <input
                                type="text"
                                value={customerSearch}
                                onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(e.target.value.length > 0) }}
                                onFocus={() => setShowCustomerDropdown(customerSearch.length > 0)}
                                onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                                placeholder="Hledat zákazníka..."
                                className="app-input pl-9"
                            />
                        </div>
                        {showCustomerDropdown && filteredCustomers.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 app-card border-[#262626] shadow-xl max-h-48 overflow-y-auto">
                                {filteredCustomers.slice(0, 8).map((c) => (
                                    <button key={c.id} type="button" onMouseDown={() => selectCustomer(c)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#1a1a1a] transition-colors text-left">
                                        <div className="w-7 h-7 rounded-full bg-[#262626] flex items-center justify-center text-xs font-bold text-[#a3a3a3]">
                                            {c.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-[#f5f5f5]">{c.name}</p>
                                            <p className="text-xs text-[#525252] font-mono">{c.phone}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="text-xs text-[#525252] mb-1.5 block">Telefonní číslo *</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#525252]" />
                            <input {...register('phone')} type="tel" placeholder="+420 777 123 456"
                                   className={cn('app-input pl-9', errors.phone && 'border-red-500/50')} />
                        </div>
                        {errors.phone && <p className="text-xs text-red-400 mt-1">{errors.phone.message}</p>}
                    </div>
                </div>

                {/* Order details */}
                <div className="app-card p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Hash className="w-4 h-4 text-[#fd8408]" />
                        <span className="text-sm font-semibold text-[#f5f5f5]">Údaje zakázky</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-[#525252] mb-1.5 block">Číslo zakázky</label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#525252]" />
                                <input {...register('orderNumber')} type="text" placeholder="2024-001" className="app-input pl-9" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-[#525252] mb-1.5 block">Cena (Kč)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#525252]" />
                                <input {...register('price')} type="text" placeholder="1 200" className="app-input pl-9" />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-[#525252] mb-1.5 block">Poznámka / vlastní text</label>
                        <div className="relative">
                            <StickyNote className="absolute left-3 top-3 w-4 h-4 text-[#525252]" />
                            <textarea {...register('note')} rows={2} placeholder="Volitelná poznámka..." className="app-input pl-9 resize-none" />
                        </div>
                    </div>
                </div>

                {/* Message preview */}
                <div className="app-card p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-[#fd8408]" />
                            <span className="text-sm font-semibold text-[#f5f5f5]">Text zprávy</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#525252]">
                            <span className={cn(charCount > 160 && 'text-yellow-400')}>{charCount} znaků</span>
                            <span>•</span>
                            <span>{smsCount} SMS</span>
                        </div>
                    </div>
                    <textarea {...register('message')} rows={4} placeholder="Text zprávy se vygeneruje automaticky..."
                              className={cn('app-input resize-none font-mono text-sm leading-relaxed', errors.message && 'border-red-500/50')} />
                    {errors.message && <p className="text-xs text-red-400">{errors.message.message}</p>}
                    <p className="text-xs text-[#525252]">Zpráva se automaticky vygeneruje z vybrané šablony. Můžete ji ručně upravit.</p>
                </div>

                {/* Submit */}
                <button type="submit" disabled={sending || sent}
                        className={cn('w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200',
                            sent ? 'bg-green-500/20 border border-green-500/30 text-green-400' : 'btn-primary')}>
                    {sending ? <><Loader2 className="w-4 h-4 animate-spin" />Odesílám...</>
                        : sent ? <><CheckCircle2 className="w-4 h-4" />Odesláno!</>
                            : <><Send className="w-4 h-4" />Odeslat SMS</>}
                </button>
            </form>
        </div>
    )
}

export default function SendSmsPage() {
    return (
        <Suspense fallback={
            <div className="max-w-2xl space-y-6">
                <div className="skeleton h-8 w-48 rounded" />
                <div className="app-card p-5 skeleton h-32 w-full" />
            </div>
        }>
            <SendSmsForm />
        </Suspense>
    )
}