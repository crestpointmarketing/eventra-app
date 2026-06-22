import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { MapPin, Calendar, Globe, Users, Target } from 'lucide-react'
import { formatDateOnly } from '@/lib/date-only'
import { normalizeEventPriority } from '@/lib/events/priority'
import { normalizeEngagementType } from '@/lib/events/taxonomy'

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params
    const supabase = await createClient()

    const { data: event } = await supabase
        .from('events')
        .select('*')
        .eq('share_token', token)
        .single()

    if (!event) notFound()

    const fmt = (d: string | null) =>
        d ? formatDateOnly(d, { month: 'long', day: 'numeric', year: 'numeric' }) : null

    const startFmt = fmt(event.start_date)
    const endFmt   = fmt(event.end_date)
    const dateStr  = startFmt
        ? endFmt && endFmt !== startFmt ? `${startFmt} – ${endFmt}` : startFmt
        : 'Date TBD'

    return (
        <div className="min-h-screen bg-zinc-50">
            {/* Header bar */}
            <div className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-zinc-900">Eventra</span>
                    <span className="text-zinc-300">·</span>
                    <span className="text-sm text-zinc-500">Shared Event View</span>
                </div>
                <span className="text-xs text-zinc-400">Read-only</span>
            </div>

            <div className="max-w-3xl mx-auto px-6 py-12">
                {/* Event header */}
                <div className="mb-8">
                    {event.status && (
                        <span className="inline-block mb-3 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest bg-[#CBFB45] text-zinc-900">
                            {event.status}
                        </span>
                    )}
                    <h1 className="text-4xl font-bold text-zinc-900 mb-4">{event.name}</h1>

                    <div className="flex flex-wrap gap-4 text-sm text-zinc-600">
                        <span className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-zinc-400" />
                            {dateStr}
                        </span>
                        {event.location && (
                            <span className="flex items-center gap-1.5">
                                <MapPin className="h-4 w-4 text-zinc-400" />
                                {event.location}
                            </span>
                        )}
                        {event.website_url && (
                            <a
                                href={event.website_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-indigo-600 hover:underline"
                            >
                                <Globe className="h-4 w-4" />
                                Official Website
                            </a>
                        )}
                    </div>
                </div>

                {/* Cards */}
                <div className="space-y-4">
                    {event.description && (
                        <div className="bg-white border border-zinc-200 rounded-xl p-6">
                            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">About This Event</h2>
                            <p className="text-zinc-700 leading-relaxed">{event.description}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        {event.focus_area && (
                            <div className="bg-white border border-zinc-200 rounded-xl p-6">
                                <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">Focus Area</h2>
                                <p className="text-zinc-800 font-medium">{event.focus_area}</p>
                            </div>
                        )}
                        {event.target_audience && (
                            <div className="bg-white border border-zinc-200 rounded-xl p-6">
                                <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">Target Audience</h2>
                                <p className="text-zinc-800 font-medium">{event.target_audience}</p>
                            </div>
                        )}
                        {event.expected_attendees && (
                            <div className="bg-white border border-zinc-200 rounded-xl p-6 flex items-center gap-3">
                                <Users className="h-5 w-5 text-zinc-400" />
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1">Expected Attendees</p>
                                    <p className="text-zinc-800 font-medium">{event.expected_attendees.toLocaleString()}+</p>
                                </div>
                            </div>
                        )}
                        {event.discovery_priority && (
                            <div className="bg-white border border-zinc-200 rounded-xl p-6 flex items-center gap-3">
                                <Target className="h-5 w-5 text-zinc-400" />
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1">Priority</p>
                                    <p className="text-zinc-800 font-medium">{normalizeEventPriority(event.discovery_priority)}</p>
                                </div>
                            </div>
                        )}
                        {event.engagement_type && (
                            <div className="bg-white border border-zinc-200 rounded-xl p-6 flex items-center gap-3">
                                <Target className="h-5 w-5 text-zinc-400" />
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1">Engagement</p>
                                    <p className="text-zinc-800 font-medium">{normalizeEngagementType(event.engagement_type)}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <p className="mt-12 text-center text-xs text-zinc-400">
                    Shared via Eventra · This link is view-only
                </p>
            </div>
        </div>
    )
}
