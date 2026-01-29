// AI Lead Summary Component
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, TrendingUp, AlertTriangle, Clock } from 'lucide-react'
import { motion } from 'framer-motion'

interface AILeadSummaryProps {
    summary: string
    keyInsights: string[]
    nextSteps: string[]
    sentiment: 'positive' | 'neutral' | 'negative'
    urgency: 'high' | 'medium' | 'low'
}

export function AILeadSummary({
    summary,
    keyInsights,
    nextSteps,
    sentiment,
    urgency,
}: AILeadSummaryProps) {
    const sentimentConfig = {
        positive: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: '😊' },
        neutral: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: '😐' },
        negative: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: '😟' },
    }

    const urgencyConfig = {
        high: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', label: 'High Priority' },
        medium: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', label: 'Medium Priority' },
        low: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: 'Low Priority' },
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <CardTitle className="text-lg">AI Executive Summary</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge className={sentimentConfig[sentiment].color}>
                                {sentimentConfig[sentiment].icon} {sentiment}
                            </Badge>
                            <Badge className={urgencyConfig[urgency].color}>
                                {urgencyConfig[urgency].label}
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Summary */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                            {summary}
                        </p>
                    </div>

                    {/* Key Insights */}
                    {keyInsights.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="w-4 h-4 text-blue-600" />
                                <h4 className="font-semibold text-sm text-zinc-900 dark:text-white">Key Insights</h4>
                            </div>
                            <ul className="space-y-2">
                                {keyInsights.map((insight, i) => (
                                    <motion.li
                                        key={i}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2 p-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                                    >
                                        <span className="text-blue-500 mt-0.5">•</span>
                                        <span>{insight}</span>
                                    </motion.li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Next Steps */}
                    {nextSteps.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-4 h-4 text-orange-600" />
                                <h4 className="font-semibold text-sm text-zinc-900 dark:text-white">Recommended Next Steps</h4>
                            </div>
                            <ul className="space-y-2">
                                {nextSteps.map((step, i) => (
                                    <motion.li
                                        key={i}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 + 0.2 }}
                                        className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2 p-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                                    >
                                        <span className="text-orange-500 font-bold mt-0.5">{i + 1}.</span>
                                        <span>{step}</span>
                                    </motion.li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {urgency === 'high' && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-red-700 dark:text-red-300">
                                <strong>High Priority Lead:</strong> This lead requires immediate attention. Consider reaching out within 24 hours.
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    )
}
