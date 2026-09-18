'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CreateTaskDialog } from '@/components/tasks/create-task-dialog'
import { LeadNotes } from '@/components/leads/lead-notes'
import { useLead } from '@/hooks/useLead'
import { X } from 'lucide-react'

export function LeadDetailPanel({ lead: initialLead, onClose }: { lead: any; onClose: () => void }) {
    const [createTaskOpen, setCreateTaskOpen] = useState(false)
    const { data } = useLead(initialLead.id)
    const lead = data || initialLead
    return <section className="flex h-[min(800px,80vh)] min-h-[420px] w-full min-w-0 flex-col rounded-xl border border-border bg-card">
        <header className="flex items-start justify-between gap-3 border-b border-border p-4">
            <div className="min-w-0 break-words"><h2 className="font-semibold">{lead.first_name} {lead.last_name}</h2><p className="text-sm text-muted-foreground">{lead.company || 'Company unknown'} · {lead.job_title || 'Role unknown'}</p><p className="text-sm text-muted-foreground">{lead.location || 'Location unknown'}</p></div>
            <Button variant="ghost" size="icon" aria-label="Close lead details" onClick={onClose}><X className="h-4 w-4" /></Button>
        </header>
        <ScrollArea className="min-h-0 flex-1"><div className="p-4"><LeadNotes leadId={lead.id} /></div></ScrollArea>
        <footer className="flex flex-wrap gap-2 border-t border-border p-4">
            <Button variant="outline" asChild><Link href={`/leads/${lead.id}`}>View Full Intelligence Page</Link></Button>
            <Button variant="outline" asChild><Link href={`/leads/${lead.id}?tab=email`}>Draft Email</Link></Button>
            <Button onClick={() => setCreateTaskOpen(true)}>Create Task</Button>
        </footer>
        <CreateTaskDialog open={createTaskOpen} onOpenChange={setCreateTaskOpen} eventId={lead.event_id || ''} initialTitle={`Follow up with ${lead.first_name} ${lead.last_name}`} initialDescription={`Lead: ${lead.first_name} ${lead.last_name}\nCompany: ${lead.company || 'Unknown'}`} />
    </section>
}
