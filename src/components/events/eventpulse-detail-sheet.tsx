'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ExternalLink, Save } from 'lucide-react'
import {
    Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { EventComments } from '@/components/events/event-comments'

const SECTORS = [
    'GENERAL AI', 'AI IN HEALTHCARE', 'AI IN EDUCATION',
    'AI ETHICS / GOVERNANCE', 'AI IN DATA / MLOPS', 'AI IN FINANCE',
    'AI IN LIFE SCIENCES / BIO', 'AI IN ROBOTICS', 'AI INFRASTRUCTURE / SYSTEMS',
    'AI IN VISION / IMAGING', 'AI IN INDUSTRY / ENTERPRISE',
    'AI IN INSURANCE', 'AI IN SECURITY', 'CONSUMER AI',
]

const PRIORITY_COLOR: Record<string, string> = {
    Sponsor: 'text-rose-600',
    Attend:  'text-amber-600',
    Follow:  'text-blue-600',
}

type Event = Record<string, any>

interface Props {
    event: Event | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-[10px] uppercase font-semibold text-zinc-400 tracking-widest mb-1">{label}</p>
            {children}
        </div>
    )
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
        <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 text-sm border border-violet-200 rounded-md bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-violet-200"
        />
    )
}

export function EventPulseDetailSheet({ event, open, onOpenChange }: Props) {
    const queryClient = useQueryClient()
    const [form, setForm] = useState<Event>({})
    const [dirty, setDirty] = useState(false)

    useEffect(() => {
        if (event) {
            setForm({ ...event })
            setDirty(false)
        }
    }, [event])

    const set = (key: string, value: any) => {
        setForm(prev => ({ ...prev, [key]: value }))
        setDirty(true)
    }

    const { mutate: save, isPending: saving } = useMutation({
        mutationFn: async () => {
            const supabase = createClient()
            const { error } = await supabase.from('events').update({
                name:               form.name,
                website_url:        form.website_url,
                focus_area:         form.focus_area,
                discovery_priority: form.discovery_priority,
                expected_attendees: form.expected_attendees ? Number(form.expected_attendees) : null,
                target_audience:    form.target_audience,
                start_date:         form.start_date,
                end_date:           form.end_date,
                location:           form.location,
                description:        form.description,
            }).eq('id', form.id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['discover-events'] })
            queryClient.invalidateQueries({ queryKey: ['eventpulse-events'] })
            toast.success('Changes saved')
            setDirty(false)
        },
        onError: () => toast.error('Failed to save'),
    })

    if (!event) return null

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto p-0 bg-[#f8f7ff] border-l border-violet-100" side="right">
                {/* Header */}
                <SheetHeader className="px-6 py-5 border-b border-violet-100 sticky top-0 bg-[#f8f7ff] z-10">
                    <SheetTitle className="text-lg font-bold text-zinc-900 pr-6">
                        {form.name}
                    </SheetTitle>
                    {dirty && (
                        <button
                            onClick={() => save()}
                            disabled={saving}
                            className="absolute top-4 right-12 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#CBFB45] hover:bg-[#b8e33d] text-zinc-900 text-xs font-semibold rounded-md transition-colors disabled:opacity-40"
                        >
                            <Save className="h-3 w-3" />
                            {saving ? 'Saving…' : 'Save'}
                        </button>
                    )}
                </SheetHeader>

                <div className="px-6 py-6 space-y-8">
                    {/* Intel Foundation */}
                    <section>
                        <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest mb-4">Intel Foundation</p>
                        <div className="space-y-4">
                            <Field label="Official URL">
                                <div className="flex gap-2 items-center">
                                    <TextInput value={form.website_url ?? ''} onChange={v => set('website_url', v)} placeholder="https://" />
                                    {form.website_url && (
                                        <a href={form.website_url} target="_blank" rel="noopener noreferrer"
                                            className="text-zinc-400 hover:text-zinc-700 flex-shrink-0">
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    )}
                                </div>
                            </Field>
                            <Field label="Event Focus">
                                <TextInput value={form.focus_area ?? ''} onChange={v => set('focus_area', v)} placeholder="e.g. Medical AI / Healthcare" />
                            </Field>
                        </div>
                    </section>

                    {/* Taxonomy */}
                    <section>
                        <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest mb-4">Taxonomy</p>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Sector Category">
                                <select
                                    value={form.focus_area?.split(',')[0]?.trim() ?? 'GENERAL AI'}
                                    onChange={e => set('focus_area', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-violet-200 rounded-md bg-white text-zinc-900 focus:outline-none"
                                >
                                    {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </Field>
                            <Field label="Strategic Priority">
                                <select
                                    value={form.discovery_priority ?? 'Follow'}
                                    onChange={e => set('discovery_priority', e.target.value)}
                                    className={`w-full px-3 py-2 text-sm border border-violet-200 rounded-md bg-white focus:outline-none font-semibold ${PRIORITY_COLOR[form.discovery_priority ?? 'Follow']}`}
                                >
                                    <option value="Sponsor">Sponsor</option>
                                    <option value="Attend">Attend</option>
                                    <option value="Follow">Follow</option>
                                </select>
                            </Field>
                        </div>
                    </section>

                    {/* Demographics */}
                    <section>
                        <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest mb-4">Demographics & Scope</p>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Audience Size">
                                <TextInput value={form.expected_attendees ?? ''} onChange={v => set('expected_attendees', v)} placeholder="e.g. 5000" />
                            </Field>
                            <Field label="Target Audience">
                                <TextInput value={form.target_audience ?? ''} onChange={v => set('target_audience', v)} placeholder="e.g. Executives" />
                            </Field>
                        </div>
                    </section>

                    {/* Chronology */}
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest">Chronology & Logistics</p>
                            {form.source === 'ai_discovered' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-600">
                                    Dates may be estimated — verify before use
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <Field label="Start Date">
                                <input type="date" value={form.start_date ?? ''} onChange={e => set('start_date', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-violet-200 rounded-md bg-white text-zinc-900 focus:outline-none" />
                            </Field>
                            <Field label="End Date">
                                <input type="date" value={form.end_date ?? ''} onChange={e => set('end_date', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-violet-200 rounded-md bg-white text-zinc-900 focus:outline-none" />
                            </Field>
                        </div>
                        <Field label="Location">
                            <TextInput value={form.location ?? ''} onChange={v => set('location', v)} placeholder="City, Country" />
                        </Field>
                    </section>

                    {/* Technical Intel Brief */}
                    <section>
                        <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest mb-4">Technical Intel Brief</p>
                        <textarea
                            value={form.description ?? ''}
                            onChange={e => set('description', e.target.value)}
                            rows={5}
                            className="w-full px-3 py-2 text-sm border border-violet-200 rounded-md bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-violet-200 resize-none leading-relaxed"
                        />
                    </section>

                    {/* Team Internal Notes */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-[10px] uppercase font-bold text-[#6366f1] tracking-widest">Team Internal Notes</p>
                        </div>
                        <EventComments eventId={form.id} />
                    </section>
                </div>
            </SheetContent>
        </Sheet>
    )
}
