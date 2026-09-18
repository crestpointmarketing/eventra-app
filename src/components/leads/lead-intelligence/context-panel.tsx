'use client'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function ContextPanel({ lead }: { lead: any }) {
    return <div className="space-y-4 min-w-0">
        <Card><CardHeader><CardTitle>Contact details</CardTitle></CardHeader><CardContent className="space-y-3 break-words">
            <p>{lead.email || 'Email not provided'}</p><p>{lead.phone || 'Phone not provided'}</p><p>{lead.location || 'Location unknown'}</p>
            <div className="flex flex-wrap gap-2">{lead.email && <Button variant="outline" asChild><a href={`mailto:${lead.email}`}>Email</a></Button>}{lead.phone && <Button variant="outline" asChild><a href={`tel:${lead.phone}`}>Call</a></Button>}</div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Company profile</CardTitle></CardHeader><CardContent className="space-y-3 break-words"><p>{lead.company || 'Company unknown'}</p><p className="text-sm text-muted-foreground">Industry: {lead.industry || 'Unknown'}</p><p className="text-sm text-muted-foreground">Size: {lead.company_size || 'Unknown'}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Related event</CardTitle></CardHeader><CardContent>{lead.event_id && lead.events ? <Link className="text-sm text-blue-600 hover:underline break-words" href={`/events/${lead.event_id}`}>{lead.events.name}</Link> : <p className="text-sm text-muted-foreground">No event linked.</p>}</CardContent></Card>
    </div>
}
