'use client'

import { AIScoreBadge } from '@/components/ai/ai-score-display'
import { Badge } from '@/components/ui/badge'

interface LeadScoreCellProps {
    score: number
}

export default function LeadScoreCell({ score }: LeadScoreCellProps) {
    if (!score) {
        return <span className="text-xs text-zinc-400">-</span>
    }

    return <AIScoreBadge score={score} size="sm" showLabel={false} />
}
