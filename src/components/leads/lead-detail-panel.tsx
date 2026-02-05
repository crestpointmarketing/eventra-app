
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import {
    X,
    Mail,
    Phone,
    MapPin,
    Bot,
    MoreHorizontal,
    Send,
    CheckCircle2,
    Calendar,
    Paperclip,
    ArrowRight,
    Clock
} from 'lucide-react'
import { toast } from 'sonner'
import { CreateTaskDialog } from '@/components/tasks/create-task-dialog'
import { useLead } from '@/hooks/useLead'
import { useCachedLeadScore } from '@/hooks/useAI'

interface LeadDetailPanelProps {
    lead: any
    onClose: () => void
}

export function LeadDetailPanel({ lead: initialLead, onClose }: LeadDetailPanelProps) {
    const [createTaskOpen, setCreateTaskOpen] = useState(false)
    const router = useRouter()

    const { data: fetchedLead } = useLead(initialLead.id)
    const lead = fetchedLead || initialLead

    // Initials for avatar
    const initials = `${lead.first_name?.[0] || ''}${lead.last_name?.[0] || ''}`.toUpperCase()

    const handleSchedule = () => {
        const title = `Meeting with ${lead.first_name} ${lead.last_name}`
        const details = `Lead Context:\n${lead.metadata?.ai_intelligence?.summary || ''}\n\nCompany: ${lead.company}`
        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&details=${encodeURIComponent(details)}&add=${encodeURIComponent(lead.email)}`
        window.open(url, '_blank')
    }

    return (
        <div className="h-full flex flex-col bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-xl w-full max-w-md">
            {/* Header */}
            <div className="p-6 pb-2">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-4">
                        <Avatar className="h-14 w-14 bg-indigo-50 text-indigo-600 border border-indigo-100">
                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${initials}`} />
                            <AvatarFallback className="bg-indigo-50 text-indigo-600">{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                                {lead.first_name} {lead.last_name}
                            </h2>
                            <p className="text-sm text-zinc-500 mb-2">
                                {lead.job_title} at {lead.company}
                            </p>
                            <div className="flex gap-2">
                                <Badge variant="secondary" className="bg-white border border-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 font-normal rounded-full px-2 py-0.5 h-6 flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-zinc-400" /> {lead.location || 'San Francisco'}
                                </Badge>
                                <Badge variant="secondary" className="bg-white border border-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 font-normal rounded-full px-2 py-0.5 h-6 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-zinc-400" /> 10:42 AM
                                </Badge>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-zinc-200 dark:border-zinc-700" onClick={() => window.location.href = `mailto:${lead.email}`}>
                            <Mail className="w-4 h-4 text-zinc-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-zinc-200 dark:border-zinc-700" onClick={() => window.location.href = `tel:${lead.phone}`}>
                            <Phone className="w-4 h-4 text-zinc-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-zinc-200 dark:border-zinc-700">
                            <MoreHorizontal className="w-4 h-4 text-zinc-500" />
                        </Button>
                    </div>
                </div>
            </div>

            <ScrollArea className="flex-1 px-6">
                <div className="space-y-6 pb-6">
                    {/* AI Suggested Step */}
                    <div className="bg-[#f2fce5] dark:bg-lime-900/10 rounded-3xl p-5 border border-[#e0f5c6] dark:border-lime-900/20">
                        <div className="flex items-center gap-2 mb-2 text-[#4d7c0f] dark:text-lime-400 text-xs font-semibold uppercase tracking-wider">
                            <div className="bg-[#d9f99d] dark:bg-lime-900/40 p-1 rounded">
                                <Bot className="w-3 h-3" />
                            </div>
                            Suggested Next Step
                        </div>
                        <p className="text-lg font-medium text-[#365314] dark:text-lime-100 mb-4 leading-normal">
                            Send contract draft v2 based on Tuesday's feedback regarding the venue capacity clause.
                        </p>
                        <div className="flex gap-3">
                            <Button size="sm" className="bg-white text-black border border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-white dark:border-zinc-700 rounded-full font-medium h-8 shadow-sm">
                                Generate Draft
                            </Button>
                            <Button size="sm" variant="ghost" className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white h-8">
                                Dismiss
                            </Button>
                        </div>
                    </div>

                    {/* Activity Timeline */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-zinc-900 dark:text-white">Activity Timeline</h3>
                            <button className="text-xs text-[#84cc16] hover:underline font-medium">View All</button>
                        </div>

                        <div className="relative pl-2 space-y-8 border-l border-zinc-200 dark:border-zinc-800 ml-2">
                            {/* Item 1 */}
                            <div className="relative pl-6">
                                <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-[#84cc16] bg-white dark:bg-zinc-900" />
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-medium text-zinc-900 dark:text-white text-sm">Email Sent: Proposal Attached</span>
                                    <span className="text-xs text-zinc-400">2h ago</span>
                                </div>
                                <p className="text-xs text-zinc-500 leading-relaxed">
                                    Sent the revised Q3 event proposal PDF. Included note about flexible cancellation policy.
                                </p>
                            </div>

                            {/* Item 2 */}
                            <div className="relative pl-6">
                                <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-[#a3e635] bg-white dark:bg-zinc-900" />
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-medium text-zinc-900 dark:text-white text-sm">Call Logged</span>
                                    <span className="text-xs text-zinc-400">Yesterday</span>
                                </div>
                                <p className="text-xs text-zinc-500 leading-relaxed mb-2">
                                    Duration: 14m. Discussed initial budget constraints. Sarah seems positive but needs board approval for &gt;$50k.
                                </p>
                                <div className="flex gap-1.5">
                                    <Badge variant="secondary" className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[10px] font-medium border-0 px-1.5 h-5">Budget</Badge>
                                    <Badge variant="secondary" className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[10px] font-medium border-0 px-1.5 h-5">Discovery</Badge>
                                </div>
                            </div>

                            {/* Item 3 */}
                            <div className="relative pl-6">
                                <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900" />
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-medium text-zinc-900 dark:text-white text-sm">Lead Status Changed</span>
                                    <span className="text-xs text-zinc-400">Oct 24</span>
                                </div>
                                <p className="text-xs text-zinc-500 leading-relaxed">
                                    Changed from <span className="font-medium text-zinc-700 dark:text-zinc-300">New</span> to <span className="font-medium text-zinc-700 dark:text-zinc-300">Negotiation</span>.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </ScrollArea>

            {/* Bottom Input Area */}
            <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800">

                {/* Navigation Link requested by User */}
                <div className="mb-3 flex justify-end">
                    <Button
                        variant="link"
                        className="text-indigo-600 dark:text-indigo-400 h-auto p-0 text-xs font-semibold flex items-center gap-1 hover:text-indigo-700"
                        onClick={() => router.push(`/leads/${lead.id}`)}
                    >
                        View Full Intelligence Page <ArrowRight className="w-3 h-3" />
                    </Button>
                </div>

                <div className="relative">
                    <Input
                        className="bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 rounded-xl pl-4 pr-10 py-6 text-sm placeholder:text-zinc-400 focus-visible:ring-indigo-500"
                        placeholder="Add a note or log activity..."
                    />
                    <Button
                        size="icon"
                        className="absolute right-1.5 top-1.5 h-9 w-9 bg-transparent hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[#84cc16]"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
                <div className="flex items-center gap-4 mt-3 ml-1">
                    <button className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors" onClick={() => router.push(`/leads/${lead.id}?tab=email`)}>
                        <Mail className="w-3.5 h-3.5 text-[#65a30d]" />
                        Draft Email
                    </button>
                    <button className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors" onClick={() => setCreateTaskOpen(true)}>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#65a30d]" />
                        Create Task
                    </button>
                    <button className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors" onClick={handleSchedule}>
                        <Clock className="w-3.5 h-3.5 text-[#65a30d]" />
                        Schedule
                    </button>
                    <button className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors">
                        <Paperclip className="w-3.5 h-3.5" />
                        Attach
                    </button>
                </div>

                <CreateTaskDialog
                    open={createTaskOpen}
                    onOpenChange={setCreateTaskOpen}
                    eventId={lead.event_id || ''}
                    initialTitle={`Follow up with ${lead.first_name} ${lead.last_name}`}
                    initialDescription={`Lead: ${lead.first_name} ${lead.last_name}\nCompany: ${lead.company}\n\nKey Context:\n- ${lead.metadata?.ai_intelligence?.summary || 'No AI Summary'}`}
                />
            </div>
        </div>
    )
}
