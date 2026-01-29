'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Brain, Sparkles, TrendingUp, AlertTriangle, CheckCircle2, Target, Lightbulb } from 'lucide-react'
import { useQualifyLead, type LeadQualification } from '@/hooks/useAI'
import { motion, AnimatePresence } from 'framer-motion'
import { Progress } from '@/components/ui/progress'

interface LeadAISummaryProps {
    leadId: string
    leadName: string
    leadData: {
        company?: string
        title?: string
        industry?: string
        company_size?: string
    }
}

export function LeadAISummary({ leadId, leadName, leadData }: LeadAISummaryProps) {
    const [qualification, setQualification] = useState<LeadQualification | null>(null)

    const { mutate: qualifyLead, isPending } = useQualifyLead()

    useEffect(() => {
        // Auto-generate on mount
        handleAnalyze()
    }, [leadId])

    const handleAnalyze = () => {
        qualifyLead(leadId, {
            onSuccess: (data) => {
                setQualification(data.qualification)
            }
        })
    }

    const getFitColor = (score: number) => {
        if (score >= 80) return 'text-green-600 dark:text-green-400'
        if (score >= 60) return 'text-lime-600 dark:text-lime-400'
        if (score >= 40) return 'text-yellow-600 dark:text-yellow-400'
        if (score >= 20) return 'text-orange-600 dark:text-orange-400'
        return 'text-red-600 dark:text-red-400'
    }

    const getFitBadgeColor = (score: number) => {
        if (score >= 80) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-300 dark:border-green-700'
        if (score >= 60) return 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300 border-lime-300 dark:border-lime-700'
        if (score >= 40) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700'
        if (score >= 20) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-300 dark:border-orange-700'
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-300 dark:border-red-700'
    }

    const getQualificationLabel = (qual: string) => {
        return qual.replace('_', ' ').toUpperCase()
    }

    if (isPending) {
        return (
            <Card className="p-8 border border-zinc-200 dark:bg-slate-900 dark:border-white/10">
                <div className="flex items-center gap-3 mb-4">
                    <Brain className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    <h2 className="text-2xl font-medium text-zinc-900 dark:text-white">AI Summary</h2>
                </div>
                <div className="flex items-center gap-3 py-8">
                    <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                    <p className="text-zinc-600 dark:text-white/70">Analyzing lead qualification...</p>
                </div>
            </Card>
        )
    }

    if (!qualification) {
        return (
            <Card className="p-8 border border-zinc-200 dark:bg-slate-900 dark:border-white/10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Brain className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        <h2 className="text-2xl font-medium text-zinc-900 dark:text-white">AI Summary</h2>
                    </div>
                    <Button onClick={handleAnalyze} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Insights
                    </Button>
                </div>
                <p className="text-zinc-600 dark:text-white/70">
                    Click to generate AI-powered lead insights and recommendations.
                </p>
            </Card>
        )
    }

    return (
        <Card className="p-8 border border-indigo-200 dark:border-indigo-900/30 dark:bg-slate-900 bg-gradient-to-br from-white to-indigo-50/20 dark:from-slate-900 dark:to-indigo-950/10">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                        <Brain className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h2 className="text-2xl font-medium text-zinc-900 dark:text-white">AI Summary</h2>
                </div>
                <Button
                    onClick={handleAnalyze}
                    size="sm"
                    variant="outline"
                    className="text-indigo-600 border-indigo-300 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-700 dark:hover:bg-indigo-950/20"
                >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    {/* Overall Assessment */}
                    <div className="bg-white dark:bg-zinc-800/50 p-6 rounded-lg border border-zinc-200 dark:border-zinc-700">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Overall Assessment</h3>
                            <Badge className={getFitBadgeColor(qualification.fitScore)}>
                                {getQualificationLabel(qualification.qualification)}
                            </Badge>
                        </div>

                        <div className="mb-4">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-zinc-600 dark:text-white/60">Product-Company Fit</span>
                                <span className={`font-semibold ${getFitColor(qualification.fitScore)}`}>
                                    {qualification.fitScore}%
                                </span>
                            </div>
                            <Progress value={qualification.fitScore} className="h-3" />
                        </div>

                        <p className="text-sm text-zinc-700 dark:text-white/80 leading-relaxed">
                            {qualification.reasoning}
                        </p>
                    </div>

                    {/* Detailed Scores */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-zinc-800/50 p-5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">Industry Match</h4>
                                <Badge variant={qualification.industryMatch.isTargetIndustry ? 'default' : 'outline'}>
                                    {qualification.industryMatch.score}%
                                </Badge>
                            </div>
                            <p className="text-xs text-zinc-600 dark:text-white/60">
                                {qualification.industryMatch.reasoning}
                            </p>
                        </div>

                        <div className="bg-white dark:bg-zinc-800/50 p-5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">Company Size Match</h4>
                                <Badge variant={qualification.companySizeMatch.appropriateForProducts ? 'default' : 'outline'}>
                                    {qualification.companySizeMatch.score}%
                                </Badge>
                            </div>
                            <p className="text-xs text-zinc-600 dark:text-white/60">
                                {qualification.companySizeMatch.reasoning}
                            </p>
                        </div>
                    </div>

                    {/* Pain Points */}
                    {qualification.painPoints.length > 0 && (
                        <div className="bg-white dark:bg-zinc-800/50 p-5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                <h4 className="font-semibold text-zinc-900 dark:text-white">Identified Pain Points</h4>
                            </div>
                            <ul className="space-y-2">
                                {qualification.painPoints.map((point, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-white/80">
                                        <span className="text-orange-500 mt-1 flex-shrink-0">•</span>
                                        <span>{point}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Opportunities */}
                    {qualification.opportunities.length > 0 && (
                        <div className="bg-green-50 dark:bg-green-950/20 p-5 rounded-lg border border-green-200 dark:border-green-900/30">
                            <div className="flex items-center gap-2 mb-3">
                                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                                <h4 className="font-semibold text-green-900 dark:text-green-200">Opportunities</h4>
                            </div>
                            <ul className="space-y-2">
                                {qualification.opportunities.map((opp, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-green-700 dark:text-green-300">
                                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        <span>{opp}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Risks */}
                    {qualification.risks.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-950/20 p-5 rounded-lg border border-red-200 dark:border-red-900/30">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                <h4 className="font-semibold text-red-900 dark:text-red-200">Risks & Concerns</h4>
                            </div>
                            <ul className="space-y-2">
                                {qualification.risks.map((risk, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                                        <span className="flex-shrink-0">⚠</span>
                                        <span>{risk}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Recommendations */}
                    {qualification.recommendations.length > 0 && (
                        <div className="bg-indigo-50 dark:bg-indigo-950/20 p-5 rounded-lg border border-indigo-200 dark:border-indigo-900/30">
                            <div className="flex items-center gap-2 mb-3">
                                <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                <h4 className="font-semibold text-indigo-900 dark:text-indigo-200">Recommended Next Steps</h4>
                            </div>
                            <ul className="space-y-2">
                                {qualification.recommendations.map((rec, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-indigo-700 dark:text-indigo-300">
                                        <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        <span>{rec}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </Card>
    )
}
