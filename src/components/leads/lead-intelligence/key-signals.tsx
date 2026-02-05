'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Zap } from 'lucide-react'

interface KeySignalsProps {
    lead: any
}

export function KeySignals({ lead }: KeySignalsProps) {
    // Use real data from metadata or fallback to empty array
    const signals = lead.metadata?.ai_intelligence?.key_signals || []

    return (
        <Card>
            <CardContent className="pt-6">
                <h3 className="text-xs font-semibold uppercase text-zinc-500 mb-3 tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3 h-3" /> Key Signals
                </h3>
                <div className="flex flex-wrap gap-2">
                    {signals.length > 0 ? (
                        signals.map((signal: string) => (
                            <Badge
                                key={signal}
                                variant="secondary"
                                className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-normal border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 h-7"
                            >
                                <span className="mr-1 opacity-50">#</span>
                                {signal}
                            </Badge>
                        ))
                    ) : (
                        <p className="text-xs text-zinc-400 italic">No key signals detected in recent analysis.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
