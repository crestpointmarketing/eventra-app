'use client'

import { use } from 'react'
import Link from 'next/link'
import { useEvent } from '@/hooks/useEvent'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function EventLeadsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { data: event, isLoading } = useEvent(id)

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-40 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
                ))}
            </div>
        )
    }

    if (!event) return <div>Event not found</div>

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {event.leads?.map((lead: any) => (
                <Card key={lead.id} className="p-6 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="font-medium text-zinc-900 dark:text-white">{lead.first_name} {lead.last_name}</p>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">{lead.company || 'No company'}</p>
                        </div>
                        <Badge variant={lead.lead_score >= 80 ? 'lime' : 'secondary'}>
                            {lead.lead_score || 0}
                        </Badge>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">{lead.email}</p>
                    <Link href={`/leads/${lead.id}`}>
                        <Button variant="outline" size="sm" className="w-full">View Lead</Button>
                    </Link>
                </Card>
            ))}
            {(!event.leads || event.leads.length === 0) && (
                <div className="col-span-3 text-center py-12">
                    <p className="text-zinc-500 dark:text-zinc-400">No leads associated with this event yet.</p>
                </div>
            )}
        </div>
    )
}
