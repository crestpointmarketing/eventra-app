'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Brain, CheckCircle2, AlertTriangle, XCircle, Sparkles } from 'lucide-react'
import { useQualifyLead, type LeadQualification } from '@/hooks/useAI'
import { motion } from 'framer-motion'
import { Progress } from '@/components/ui/progress'

interface LeadQualificationBadgeProps {
    leadId: string
    leadName: string
}

export function LeadQualificationBadge({ leadId, leadName }: LeadQualificationBadgeProps) {
    const [qualification, setQualification] = useState<LeadQualification | null>(null)
    const [isOpen, setIsOpen] = useState(false)

    const { mutate: qualifyLead, isPending } = useQualifyLead()

    const handleQualify = () => {
        qualifyLead(leadId, {
            onSuccess: (data) => {
                setQualification(data.qualification)
                setIsOpen(true)
            }
        })
    }

    const getFitColor = (score: number) => {
        if (score >= 80) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-300 dark:border-green-700'
        if (score >= 60) return 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300 border-lime-300 dark:border-lime-700'
        if (score >= 40) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700'
        if (score >= 20) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-300 dark:border-orange-700'
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-300 dark:border-red-700'
    }

    const getQualificationIcon = (qual: string) => {
        switch (qual) {
            case 'high':
                return <CheckCircle2 className="w-3 h-3" />
            case 'medium':
                return <AlertTriangle className="w-3 h-3" />
            case 'low':
            case 'not_qualified':
                return <XCircle className="w-3 h-3" />
            default:
                return null
        }
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleQualify}
                    disabled={isPending}
                    className="h-8 px-2"
                >
                    {isPending ? (
                        <Sparkles className="w-4 h-4 mr-1 animate-pulse text-indigo-600" />
                    ) : qualification ? (
                        <Badge className={`${getFitColor(qualification.fitScore)} flex items-center gap-1`}>
                            {getQualificationIcon(qualification.qualification)}
                            {qualification.fitScore}%
                        </Badge>
                    ) : (
                        <>
                            <Brain className="w-4 h-4 mr-1 text-indigo-600" />
                            <span className="text-xs">Qualify</span>
                        </>
                    )}
                </Button>
            </PopoverTrigger>

            {qualification && (
                <PopoverContent className="w-96 p-0" align="start">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-4 space-y-4"
                    >
                        {/* Header */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-sm text-zinc-900 dark:text-white">
                                    Lead Qualification
                                </h4>
                                <Badge className={getFitColor(qualification.fitScore)}>
                                    {qualification.qualification.toUpperCase()}
                                </Badge>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-zinc-600 dark:text-white/60">Overall Fit Score</span>
                                    <span className="font-medium text-zinc-900 dark:text-white">{qualification.fitScore}%</span>
                                </div>
                                <Progress value={qualification.fitScore} className="h-2" />
                            </div>
                            <p className="text-xs text-zinc-600 dark:text-white/60">{qualification.reasoning}</p>
                        </div>

                        {/* Detailed Scores */}
                        <div className="space-y-2">
                            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-medium text-zinc-700 dark:text-white/80">Industry Match</span>
                                    <Badge variant={qualification.industryMatch.isTargetIndustry ? 'default' : 'secondary'} className="text-xs">
                                        {qualification.industryMatch.score}%
                                    </Badge>
                                </div>
                                <p className="text-xs text-zinc-600 dark:text-white/60">{qualification.industryMatch.reasoning}</p>
                            </div>

                            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-medium text-zinc-700 dark:text-white/80">Company Size Match</span>
                                    <Badge variant={qualification.companySizeMatch.appropriateForProducts ? 'default' : 'secondary'} className="text-xs">
                                        {qualification.companySizeMatch.score}%
                                    </Badge>
                                </div>
                                <p className="text-xs text-zinc-600 dark:text-white/60">{qualification.companySizeMatch.reasoning}</p>
                            </div>
                        </div>

                        {/* Pain Points */}
                        {qualification.painPoints.length > 0 && (
                            <div className="space-y-2">
                                <h5 className="text-xs font-semibold text-zinc-900 dark:text-white">Identified Pain Points</h5>
                                <ul className="space-y-1">
                                    {qualification.painPoints.slice(0, 3).map((point, i) => (
                                        <li key={i} className="flex items-start gap-2 text-xs text-zinc-700 dark:text-white/70">
                                            <span className="text-indigo-500 mt-0.5">•</span>
                                            <span>{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Recommendations */}
                        {qualification.recommendations.length > 0 && (
                            <div className="space-y-2">
                                <h5 className="text-xs font-semibold text-zinc-900 dark:text-white">Next Steps</h5>
                                <ul className="space-y-1">
                                    {qualification.recommendations.slice(0, 3).map((rec, i) => (
                                        <li key={i} className="flex items-start gap-2 text-xs text-zinc-700 dark:text-white/70">
                                            <span className="text-green-500 mt-0.5">→</span>
                                            <span>{rec}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Opportunities */}
                        {qualification.opportunities.length > 0 && (
                            <div className="space-y-2 bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200 dark:border-green-900/30">
                                <h5 className="text-xs font-semibold text-green-900 dark:text-green-200">Opportunities</h5>
                                <ul className="space-y-1">
                                    {qualification.opportunities.slice(0, 2).map((opp, i) => (
                                        <li key={i} className="text-xs text-green-700 dark:text-green-300">
                                            + {opp}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Risks */}
                        {qualification.risks.length > 0 && (
                            <div className="space-y-2 bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg border border-orange-200 dark:border-orange-900/30">
                                <h5 className="text-xs font-semibold text-orange-900 dark:text-orange-200">Risks</h5>
                                <ul className="space-y-1">
                                    {qualification.risks.map((risk, i) => (
                                        <li key={i} className="text-xs text-orange-700 dark:text-orange-300">
                                            ! {risk}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </motion.div>
                </PopoverContent>
            )}
        </Popover>
    )
}
