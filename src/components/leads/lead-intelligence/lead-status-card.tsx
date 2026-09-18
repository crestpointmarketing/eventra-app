'use client'
import { Card, CardContent } from '@/components/ui/card'
export function LeadStatusCard({ lead }: { lead: any }) {
    return <Card><CardContent className="grid grid-cols-2 gap-4 p-4">{[
        ['Status',lead.lead_status || 'Unknown'],['Owner',lead.owner_name || 'Not available'],['Stage',lead.stage || 'Unknown'],['Last contact',lead.last_contacted_at ? new Date(lead.last_contacted_at).toLocaleDateString() : 'Not recorded'],
    ].map(([label,value])=><div key={label} className="min-w-0 break-words"><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium">{value}</p></div>)}</CardContent></Card>
}
