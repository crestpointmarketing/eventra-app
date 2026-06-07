'use client'

import Link from 'next/link'
import { Mail, Plus, Send, Sparkles, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useEmailTemplates } from '@/hooks/useEmailTemplates'
import { useEvent } from '@/hooks/useEvent'

interface EventEmailTabProps {
    eventId: string
    eventName: string
}

function getLeadName(lead: any) {
    const name = `${lead.first_name ?? ''} ${lead.last_name ?? ''}`.trim()
    return name || lead.email || 'Unnamed lead'
}

function getScoreLabel(score: number) {
    if (score >= 80) return 'Hot'
    if (score >= 50) return 'Warm'
    return 'Cold'
}

export function EventEmailTab({ eventId, eventName }: EventEmailTabProps) {
    const { data: event, isLoading: isLoadingEvent } = useEvent(eventId)
    const { data: templates, isLoading: isLoadingTemplates } = useEmailTemplates({ status: 'active' })

    const leads = event?.leads ?? []
    const recommended = templates?.slice(0, 3) ?? []
    const hotLeads = leads.filter((lead: any) => (lead.lead_score ?? 0) >= 80).length
    const contacted = leads.filter((lead: any) => lead.last_contacted_at).length

    return (
        <div className="space-y-6">
            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#CBFB45]/25 text-zinc-900">
                            <Mail className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                Outreach Queue
                            </h3>
                            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                Select a lead from {eventName}, generate a draft, then copy or mark it as sent.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline">
                            <Link href={`/events/${eventId}/leads`}>
                                <Users className="mr-2 h-4 w-4" />
                                Manage Leads
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link href="/email-templates">
                                <Plus className="mr-2 h-4 w-4" />
                                Templates
                            </Link>
                        </Button>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Target Leads</p>
                    <p className="mt-2 text-3xl font-semibold text-zinc-900 dark:text-white">{leads.length}</p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">attached to this event</p>
                </Card>
                <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Hot Leads</p>
                    <p className="mt-2 text-3xl font-semibold text-lime-500">{hotLeads}</p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">highest outreach priority</p>
                </Card>
                <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Contacted</p>
                    <p className="mt-2 text-3xl font-semibold text-zinc-900 dark:text-white">{contacted}</p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">marked with last contact</p>
                </Card>
            </div>

            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-5 py-4">
                    <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-white">Lead Outreach</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Open a lead to generate and track a personalized email.
                        </p>
                    </div>
                    <Badge variant="secondary">{leads.length} leads</Badge>
                </div>

                {isLoadingEvent ? (
                    <div className="p-8 text-sm text-zinc-500">Loading leads...</div>
                ) : leads.length === 0 ? (
                    <div className="p-10 text-center">
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">No leads are attached to this event yet.</p>
                        <Button asChild className="mt-4">
                            <Link href={`/events/${eventId}/leads`}>
                                <Users className="mr-2 h-4 w-4" />
                                Add Leads
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {leads.map((lead: any) => {
                            const score = lead.lead_score ?? 0
                            return (
                                <div key={lead.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-medium text-zinc-900 dark:text-white">{getLeadName(lead)}</p>
                                            <Badge variant="secondary">{getScoreLabel(score)}</Badge>
                                            {lead.lead_status && <Badge variant="outline" className="capitalize">{lead.lead_status}</Badge>}
                                        </div>
                                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                            {[lead.job_title, lead.company, lead.email].filter(Boolean).join(' - ') || 'No company or email set'}
                                        </p>
                                    </div>

                                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                                        <Button asChild variant="outline" size="sm">
                                            <Link href={`/leads/${lead.id}`}>
                                                View
                                            </Link>
                                        </Button>
                                        <Button asChild size="sm">
                                            <Link href={`/leads/${lead.id}?tab=email`}>
                                                <Send className="mr-2 h-4 w-4" />
                                                Compose
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </Card>

            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-white">Recommended Templates</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Active templates available for event outreach.
                        </p>
                    </div>
                    <Link href="/email-templates" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
                        Open library
                    </Link>
                </div>

                {isLoadingTemplates ? (
                    <p className="text-sm text-zinc-500">Loading templates...</p>
                ) : recommended.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        {recommended.map((template) => (
                            <div key={template.id} className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
                                <div className="mb-2 flex items-center gap-2">
                                    <Badge variant="secondary">{template.category.replace('_', ' ')}</Badge>
                                    <span className="text-xs text-zinc-400">v{template.version}</span>
                                </div>
                                <p className="font-medium text-zinc-900 dark:text-white">{template.name}</p>
                                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                    Goal: {template.goal.replace('_', ' ')}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center">
                        <Sparkles className="mx-auto h-5 w-5 text-zinc-400" />
                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">No active templates yet.</p>
                        <Button asChild className="mt-4">
                            <Link href="/email-templates">Create Template</Link>
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    )
}
