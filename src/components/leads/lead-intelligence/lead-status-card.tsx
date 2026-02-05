'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface LeadStatusCardProps {
    lead: any
}

export function LeadStatusCard({ lead }: LeadStatusCardProps) {
    return (
        <Card>
            <CardContent className="flex items-center justify-between p-4 h-full">
                <div className="flex-1 px-4">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1">Status</span>
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-500">
                        {lead.lead_status || 'Contacted'}
                    </span>
                </div>
                <Separator orientation="vertical" className="h-8" />
                <div className="flex-1 px-4">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1">Owner</span>
                    <span className="text-sm font-medium text-zinc-900 dark:text-white">
                        {lead.owner_name || 'Vivian'}
                    </span>
                </div>
                <Separator orientation="vertical" className="h-8" />
                <div className="flex-1 px-4">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1">Stage</span>
                    <span className="text-sm font-medium text-zinc-900 dark:text-white">
                        Disc
                    </span>
                </div>
                <Separator orientation="vertical" className="h-8" />
                <div className="flex-1 px-4">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1">Last Contact</span>
                    <span className="text-sm font-medium text-zinc-900 dark:text-white">
                        2h ago
                    </span>
                </div>
            </CardContent>
        </Card>
    )
}
