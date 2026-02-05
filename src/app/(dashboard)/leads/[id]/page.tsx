'use client'

import { use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLead } from '@/hooks/useLead'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Mail, Phone, Calendar, CheckCircle2, MoreHorizontal, FileEdit } from 'lucide-react'
import { toast } from 'sonner'
import { AILeadOverview } from '@/components/leads/lead-intelligence/ai-overview'
import { ProductFitAnalysis } from '@/components/leads/lead-intelligence/product-fit-analysis'
import { ActivityTimeline } from '@/components/leads/lead-intelligence/activity-timeline'
import { AIRecommendations } from '@/components/leads/lead-intelligence/ai-recommendations'
import { ContextPanel } from '@/components/leads/lead-intelligence/context-panel'
import { LeadStatusCard } from '@/components/leads/lead-intelligence/lead-status-card'
import { KeySignals } from '@/components/leads/lead-intelligence/key-signals'
import { CreateTaskDialog } from '@/components/tasks/create-task-dialog'
import { EmailComposer } from '@/components/email/email-composer'
import { useState } from 'react'

export default function LeadIntelligencePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const searchParams = useSearchParams()
    const [createTaskOpen, setCreateTaskOpen] = useState(false)
    const { data: lead, isLoading, error } = useLead(id)

    // Get tab from URL parameter (e.g., ?tab=email)
    const defaultTab = searchParams.get('tab') || 'intelligence'

    if (isLoading) {
        return <div className="p-8 text-center text-zinc-500">Loading Intelligence Workspace...</div>
    }

    if (error || !lead) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-500 mb-4">Lead not found</p>
                <Button onClick={() => router.push('/leads')}>Return to Leads</Button>
            </div>
        )
    }

    const score = lead.lead_score || 0
    const isHot = score >= 80

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-20">
            {/* Top Bar / Navigation */}
            <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-30 px-6 py-3 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.push('/leads')} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800" />
                    <div className="flex items-center gap-2">
                        <h1 className="font-semibold text-lg text-zinc-900 dark:text-white">
                            {lead.first_name} {lead.last_name}
                        </h1>
                        <Badge variant="outline" className="font-normal text-zinc-500">
                            {lead.job_title || 'No Title'}
                        </Badge>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end mr-4">
                        <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">Lead Score</span>
                        <div className="flex items-center gap-1.5 leading-none">
                            <span className={`text-xl font-semibold ${isHot ? 'text-lime-600' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                {score}
                            </span>
                            <Badge variant={isHot ? 'default' : 'secondary'} className={`h-5 text-[10px] px-1.5 ${isHot ? 'bg-lime-500 hover:bg-lime-600' : ''}`}>
                                {isHot ? 'HOT' : 'WARM'}
                            </Badge>
                            <Badge variant="outline" className="h-5 text-[10px] px-1.5 text-zinc-500 border-zinc-300 dark:border-zinc-700 ml-1">
                                ICP: Strong
                            </Badge>
                        </div>
                    </div>

                    <Button size="sm" variant="outline" onClick={() => window.location.href = `mailto:${lead.email}`}>
                        <Mail className="w-4 h-4 mr-2" /> Email
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => window.location.href = `tel:${lead.phone}`}>
                        <Phone className="w-4 h-4 mr-2" /> Call
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                        const title = `Meeting with ${lead.first_name} ${lead.last_name}`
                        const details = `Lead Context:\n${lead.metadata?.ai_intelligence?.summary || ''}\n\nCompany: ${lead.company}`
                        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&details=${encodeURIComponent(details)}&add=${encodeURIComponent(lead.email)}`
                        window.open(url, '_blank')
                    }}>
                        <Calendar className="w-4 h-4 mr-2" /> Schedule
                    </Button>
                    <Button size="sm" className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900" onClick={() => setCreateTaskOpen(true)}>
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Create Task
                    </Button>
                </div>
            </div>

            <CreateTaskDialog
                open={createTaskOpen}
                onOpenChange={setCreateTaskOpen}
                eventId={lead.event_id || ''}
                initialTitle={`Follow up with ${lead.first_name} ${lead.last_name}`}
                initialDescription={`Lead: ${lead.first_name} ${lead.last_name} (${lead.company})\nTitle: ${lead.job_title}\n\nIntelligence Summary:\n${lead.metadata?.ai_intelligence?.summary || ''}`}
            />

            <main className="max-w-[1600px] mx-auto p-6 md:p-8">
                <Tabs defaultValue={defaultTab} className="space-y-6">
                    <TabsList className="grid w-full max-w-md grid-cols-2 gap-2">
                        <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
                        <TabsTrigger value="email">Email</TabsTrigger>
                    </TabsList>

                    {/* Intelligence Tab */}
                    <TabsContent value="intelligence" className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 bg-white dark:bg-zinc-900">
                        <div className="grid grid-cols-12 gap-8">
                            {/* Main Content (Left Column) */}
                            <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">

                                {/* 1. Status Grid */}
                                <LeadStatusCard lead={lead} />

                                {/* 2. AI Overview */}
                                <AILeadOverview lead={lead} />

                                {/* 3. Key Signals */}
                                <KeySignals lead={lead} />

                                {/* 4. Product Fit */}
                                <ProductFitAnalysis lead={lead} />

                                {/* 5. Recommended Actions */}
                                <AIRecommendations lead={lead} />

                                {/* 6. Activity Timeline */}
                                <ActivityTimeline lead={lead} />

                                {/* 7. Notes & Collaboration */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-lg flex items-center gap-2">
                                            <FileEdit className="w-5 h-5 text-zinc-400" />
                                            Notes & Context
                                        </h3>
                                        <Button variant="ghost" size="sm" className="text-zinc-500">View All Notes</Button>
                                    </div>
                                    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
                                        <Textarea
                                            placeholder="Add a note, call log, or strategic insight..."
                                            className="resize-none border-0 focus-visible:ring-0 p-0 text-base shadow-none min-h-[80px]"
                                        />
                                        <div className="flex justify-between items-center pt-2 mt-2 border-t border-zinc-100 dark:border-zinc-800">
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400"><MoreHorizontal className="w-4 h-4" /></Button>
                                            </div>
                                            <Button size="sm" onClick={() => toast.success('Note added')}>Save Note</Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar Context (Right Column) */}
                            <div className="col-span-12 lg:col-span-4 space-y-6">
                                <ContextPanel lead={lead} />
                            </div>
                        </div>
                    </TabsContent>

                    {/* Email Tab */}
                    <TabsContent value="email" className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 bg-white dark:bg-zinc-900">
                        <div className="max-w-4xl mx-auto">
                            <EmailComposer leadId={id} lead={lead} />
                        </div>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    )
}

