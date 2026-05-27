'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
    Send, User, Hash, DollarSign, MessageSquare,
    CheckCircle2, Loader2, Phone, StickyNote, PenLine,
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
    const presetPhone = searchParams.get('phone')
    const presetCustomerId = searchParams.get('customerId')
    const presetName = searchParams.get('name')

    const [templates, setTemplates] = useState<SmsTemplate[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)
    const [customerSearch, setCustomerSearch] = useState(presetName || '')
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

    const isElectron = typeof window !== 'undefined' && !!window.electronAPI

    const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            templateId: presetTemplateId || '',
            phone: presetPhone || '',
            orderNumber: '',
            price: '',
            note: '',
            message: '',
            customerId: presetCustomerId || '',
        },
    })

    const watchedValues = watch(['templateId', 'orderNumber', 'price', 'note', 'phone'])
    const [selectedTemplateId, orderNumber, price, note, phone] = watchedValues
    const isCustomTemplate = selectedTemplateId === 'tpl_custom'

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

    useEffect(() => {
        if (presetPhone) setValue('phone', presetPhone)
        if (presetCustomerId) setValue('customerId', presetCustomerId)
        if (presetName) setCustomerSearch(presetName)
    }, [presetPhone, presetCustomerId, presetName, setValue])

    const generateMessage = useCallback(() => {
        if (isCustomTemplate) return
        const template = templates.find((t) => t.id === selectedTemplateId)
        if (!template) return
        const vars: Record<string, string> = {
            zakazka: orderNumber || '',
            cena: price || '',
            poznamka: note ? '\n' + note : '',
            telefon: normalizePhone(phone || ''),
        }
        setValue('message', renderTemplate(template.content, vars).trim())
    }, [templates, selectedTemplateId, orderNumber, price, note, phone, setValue, isCustomTemplate])

    useEffect(() => { generateMessage() }, [generateMessage])

    useEffect(() => {
        if (presetTemplateId && templates.length > 0) setValue('templateId', presetTemplateId)
    }, [presetTemplateId, templates, setValue])

    useEffect(() => {
        if (isCustomTemplate) setValue('message', '')
    }, [isCustomTemplate, setValue])

    const filteredCustomers = customers.filter(
        (c) => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch)
    )

    const selectCustomer = (customer: Customer) => {
        setValue('phone', customer.phone)
        setValue('customerId', customer.id)
        setCustomerSearch(customer.name)
        setShowCustomerDropdown(false)
    }

    const autoSaveCustomer = async (phone: string, name: string) => {
        if (!isElectron) return
        try {
            const existing = await window.electronAPI.customers.getAll({ search: phone, limit: 5 })
            const found = (existing.data as Customer[]).find(c => normalizePhone(c.phone) === phone)
            if (!found) {
                await window.electronAPI.customers.create({ name: name.trim() || phone, phone })
            }
        } catch { /* silently fail */ }
    }

    const onSubmit = async (data: FormData) => {
        if (!isElectron) { toast.error('Nejste v Electron prostředí'); return }
        setSending(true)
        try {
            const normalizedPhone = normalizePhone(data.phone)
            const result = await window.electronAPI.sms.send({
                phone: normalizedPhone,
                message: data.message,
                templateId: data.templateId || undefined,
                customerId: data.customerId || undefined,
                orderNumber: data.orderNumber || undefined,
                price: data.price || undefined,
            })
            if (result.success) {
                if (!data.customerId) {
                    await autoSaveCustomer(normalizedPhone, customerSearch)
                }
                toast.success('SMS úspěšně odeslána!', { description: `Na číslo ${formatPhone(normalizedPhone)}` })
                setSent(true)
                setTimeout(() => {
                    setSent(false)
                    reset({ templateId: data.templateId, phone: '', orderNumber: '', price: '', note: '', message: '', customerId: '' })
                    setCustomerSearch('')
                }, 2000)
                window.electronAPI.notification.show('SMS odeslána', `Zpráva na ${formatPhone(normalizedPhone)} byla odeslána.`)
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
        <div className="max-w-2xl space-y-5">
            <div>
                <h1 className="text-xl font-bold text-[#111827]">Odeslat SMS</h1>
                <p className="text-sm text-[#6b7280] mt-0.5">Vyberte šablonu a vyplňte údaje</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Template selector */}
                <div className="app-card p-4 space-y-3">
                    <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider">Šablona</p>
                    <div className="grid grid-cols-3 gap-2">
                        {templates.length === 0 ? (
                            <div className="col-span-3 text-sm text-[#9ca3af] py-2">Načítání...</div>
                        ) : (
                            templates.map((tmpl) => (
                                <button
                                    key={tmpl.id}
                                    type="button"
                                    onClick={() => setValue('templateId', tmpl.id)}
                                    className={cn(
                                        'p-3 rounded-xl border text-left transition-all duration-150 text-sm font-medium',
                                        selectedTemplateId === tmpl.id
                                            ? 'border-[#f07820] bg-[#fff4ea] text-[#f07820]'
                                            : 'border-[#e5e7eb] bg-[#f9fafb] text-[#374151] hover:border-[#d1d5db] hover:bg-white'
                                    )}
                                >
                                    {tmpl.name}
                                </button>
                            ))
                        )}
                    </div>
                    {errors.templateId && <p className="text-xs text-red-500">{errors.templateId.message}</p>}
                </div>

                {/* Recipient */}
                <div className="app-card p-4 space-y-3">
                    <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider">Příjemce</p>
                    <div className="relative">
                        <label className="text-xs text-[#9ca3af] mb-1.5 block">Hledat zákazníka</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                            <input
                                type="text"
                                value={customerSearch}
                                onChange={(e) => {
                                    setCustomerSearch(e.target.value)
                                    setValue('customerId', '')
                                    setShowCustomerDropdown(e.target.value.length > 0)
                                }}
                                onFocus={() => setShowCustomerDropdown(customerSearch.length > 0)}
                                onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 150)}
                                placeholder="Jméno nebo číslo zákazníka..."
                                className="app-input pl-9"
                            />
                        </div>
                        {showCustomerDropdown && filteredCustomers.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-[#e5e7eb] rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                {filteredCustomers.slice(0, 8).map((c) => (
                                    <button key={c.id} type="button" onMouseDown={() => selectCustomer(c)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#f9fafb] transition-colors text-left">
                                        <div className="w-7 h-7 rounded-full bg-[#fff4ea] flex items-center justify-center text-xs font-bold text-[#f07820]">
                                            {c.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-[#111827]">{c.name}</p>
                                            <p className="text-xs text-[#9ca3af] font-mono">{c.phone}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="text-xs text-[#9ca3af] mb-1.5 block">Telefonní číslo *</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                            <input {...register('phone')} type="tel" placeholder="+420 777 123 456"
                                   className={cn('app-input pl-9', errors.phone && 'border-red-400')} />
                        </div>
                        {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
                    </div>
                </div>

                {/* Order details — hidden for custom template */}
                {!isCustomTemplate && (
                    <div className="app-card p-4 space-y-3">
                        <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider">Údaje zakázky</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-[#9ca3af] mb-1.5 block">Číslo zakázky</label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                                    <input {...register('orderNumber')} type="text" placeholder="2024-001" className="app-input pl-9" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-[#9ca3af] mb-1.5 block">Cena (Kč)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                                    <input {...register('price')} type="text" placeholder="1 200" className="app-input pl-9" />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-[#9ca3af] mb-1.5 block">Vlastní poznámka (přidá se ke zprávě)</label>
                            <div className="relative">
                                <StickyNote className="absolute left-3 top-3 w-4 h-4 text-[#9ca3af]" />
                                <textarea {...register('note')} rows={2} placeholder="Např. připraveno od pátku..."
                                          className="app-input pl-9 resize-none" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Message */}
                <div className="app-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {isCustomTemplate
                                ? <PenLine className="w-4 h-4 text-[#f07820]" />
                                : <MessageSquare className="w-4 h-4 text-[#f07820]" />
                            }
                            <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
                                {isCustomTemplate ? 'Napište zprávu' : 'Náhled zprávy'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#9ca3af]">
                            <span className={cn(charCount > 160 && 'text-amber-500 font-medium')}>{charCount} znaků</span>
                            <span>·</span>
                            <span>{smsCount} SMS</span>
                        </div>
                    </div>
                    <textarea
                        {...register('message')}
                        rows={isCustomTemplate ? 5 : 4}
                        placeholder={isCustomTemplate ? 'Napište vlastní text zprávy...' : 'Text se vygeneruje automaticky...'}
                        className={cn('app-input resize-none font-mono text-sm leading-relaxed', errors.message && 'border-red-400',
                            !isCustomTemplate && 'bg-[#f3f4f6] text-[#374151]')}
                        readOnly={!isCustomTemplate}
                    />
                    {errors.message && <p className="text-xs text-red-500">{errors.message.message}</p>}
                    {!isCustomTemplate && (
                        <p className="text-xs text-[#9ca3af]">Zpráva se generuje automaticky. Přidejte poznámku výše pro vlastní text.</p>
                    )}
                </div>

                <button type="submit" disabled={sending || sent}
                        className={cn('w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200',
                            sent ? 'bg-green-50 border border-green-200 text-green-700' : 'btn-primary')}>
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
        <Suspense fallback={<div className="max-w-2xl space-y-5"><div className="skeleton h-7 w-40 rounded" /></div>}>
            <SendSmsForm />
        </Suspense>
    )
}