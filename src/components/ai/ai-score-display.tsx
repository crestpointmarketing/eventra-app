// AI Lead Score Badge Component
'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Brain, TrendingUp, TrendingDown, AlertCircle, Lightbulb, Target } from 'lucide-react'
import { motion } from 'framer-motion'

interface AIScoreBadgeProps {
    score: number
    size?: 'sm' | 'md' | 'lg'
    showLabel?: boolean
}

export function AIScoreBadge({ score, size = 'md', showLabel = true }: AIScoreBadgeProps) {
    const getScoreColor = (score: number) => {
        if (score >= 80) return 'bg-green-500'
        if (score >= 60) return 'bg-blue-500'
        if (score >= 40) return 'bg-yellow-500'
        return 'bg-red-500'
    }

    const getScoreLabel = (score: number) => {
        if (score >= 80) return 'High'
        if (score >= 60) return 'Medium'
        if (score >= 40) return 'Low'
        return 'Very Low'
    }

    const sizeClasses = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-3 py-1',
        lg: 'text-base px-4 py-2',
    }

    return (
        <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center gap-2"
        >
            <Brain className="w-4 h-4 text-purple-600" />
            <Badge className={`${getScoreColor(score)} text-white ${sizeClasses[size]}`}>
                {score}/100
                {showLabel && ` • ${getScoreLabel(score)}`}
            </Badge>
        </motion.div>
    )
}

interface AIInsightCardProps {
    score: number
    confidence: number
    reasoning: string
    strengths: string[]
    weaknesses: string[]
    recommendations: string[]
    onRefresh?: () => void
    isRefreshing?: boolean
}

export function AIInsightCard({
    score,
    confidence,
    reasoning,
    strengths,
    weaknesses,
    recommendations,
    onRefresh,
    isRefreshing = false,
}: AIInsightCardProps) {
    return (
        <Card className="border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-600" />
                        <CardTitle className="text-lg">AI Lead Analysis</CardTitle>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-xs text-zinc-500">
                            Confidence: {Math.round(confidence * 100)}%
                        </div>
                        {onRefresh && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onRefresh}
                                disabled={isRefreshing}
                                className="h-7"
                            >
                                {isRefreshing ? 'Analyzing...' : 'Refresh'}
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Score Display */}
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 rounded-lg">
                    <div className="text-center">
                        <div className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-lime-400 bg-clip-text text-transparent">{score}</div>
                        <div className="text-xs text-zinc-600 dark:text-zinc-400">Conversion Score</div>
                    </div>
                    <div className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">
                        {reasoning}
                    </div>
                </div>

                {/* Strengths */}
                {strengths.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <h4 className="font-semibold text-sm text-zinc-900 dark:text-white">Strengths</h4>
                        </div>
                        <ul className="space-y-1">
                            {strengths.map((strength, i) => (
                                <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                                    <span className="text-green-500 mt-1">✓</span>
                                    <span>{strength}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Weaknesses */}
                {weaknesses.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingDown className="w-4 h-4 text-red-600" />
                            <h4 className="font-semibold text-sm text-zinc-900 dark:text-white">Weaknesses</h4>
                        </div>
                        <ul className="space-y-1">
                            {weaknesses.map((weakness, i) => (
                                <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                    <span>{weakness}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Recommendations */}
                {recommendations.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="w-4 h-4 text-yellow-600" />
                            <h4 className="font-semibold text-sm text-zinc-900 dark:text-white">Recommended Actions</h4>
                        </div>
                        <ul className="space-y-1">
                            {recommendations.map((rec, i) => (
                                <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                                    <Target className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                    <span>{rec}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

interface AILoadingStateProps {
    message?: string
}

export function AILoadingState({ message = 'AI is analyzing...' }: AILoadingStateProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 p-4 border border-purple-200 dark:border-purple-800 rounded-lg bg-purple-50 dark:bg-purple-950"
        >
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
                <Brain className="w-5 h-5 text-purple-600" />
            </motion.div>
            <div className="text-sm text-purple-700 dark:text-purple-300">{message}</div>
        </motion.div>
    )
}
