'use client'

import { useState } from 'react'
import { useAnalyzeRisks } from '@/hooks/useAI'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Brain, AlertTriangle, CheckCircle, Clock, Link as LinkIcon, AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TaskRisk } from '@/hooks/useAI'

export function EventRisksTab({ eventId }: { eventId: string }) {
    const { mutate: analyzeRisks, isPending, data: riskAnalysis } = useAnalyzeRisks()
    const [hasAnalyzed, setHasAnalyzed] = useState(false)

    const handleAnalyze = () => {
        analyzeRisks(eventId, {
            onSuccess: () => setHasAnalyzed(true)
        })
    }

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'critical': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
            case 'high': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800'
            case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
            default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800'
        }
    }

    const getRiskIcon = (type: string) => {
        switch (type) {
            case 'timeline': return <Clock className="w-4 h-4" />
            case 'dependency': return <LinkIcon className="w-4 h-4" />
            case 'resource': return <Brain className="w-4 h-4" />
            default: return <AlertCircle className="w-4 h-4" />
        }
    }

    if (!hasAnalyzed && !riskAnalysis && !isPending) {
        return (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mb-2">
                    <Brain className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">AI Risk Analysis</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-center max-w-md">
                    Use our AI to analyze your event tasks, identifying potential timeline conflicts,
                    dependency issues, and resource bottlenecks.
                </p>
                <Button onClick={handleAnalyze} size="lg" className="mt-4 bg-purple-600 hover:bg-purple-700">
                    <Brain className="w-4 h-4 mr-2" />
                    Analyze Risks
                </Button>
            </div>
        )
    }

    if (isPending) {
        return (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
                <p className="text-zinc-500 dark:text-zinc-400 font-medium">Analyzing event data...</p>
                <p className="text-xs text-zinc-400">This may take a few moments</p>
            </div>
        )
    }

    const risks = riskAnalysis?.risks || []
    const criticalCount = riskAnalysis?.criticalCount || 0
    const overallScore = riskAnalysis?.overallRiskScore || 0

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-6 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Variable Risk Score</p>
                            <h4 className={`text-3xl font-bold mt-2 ${overallScore > 70 ? 'text-red-600' : overallScore > 40 ? 'text-orange-500' : 'text-green-500'
                                }`}>
                                {overallScore}/100
                            </h4>
                        </div>
                        <AlertTriangle className={`w-6 h-6 ${overallScore > 70 ? 'text-red-500' : overallScore > 40 ? 'text-orange-500' : 'text-green-500'
                            }`} />
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">
                        {overallScore > 70 ? 'High risk exposure detected' : overallScore > 40 ? 'Moderate risk exposure' : 'Low risk exposure'}
                    </p>
                </Card>

                <Card className="p-6 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Critical Issues</p>
                            <h4 className="text-3xl font-bold text-zinc-900 dark:text-white mt-2">
                                {criticalCount}
                            </h4>
                        </div>
                        <AlertCircle className="w-6 h-6 text-red-500" />
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">Require immediate attention</p>
                </Card>

                <Card className="p-6 border-zinc-200 dark:border-zinc-800 bg-purple-50 dark:bg-purple-900/10 border-none">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-purple-700 dark:text-purple-300">AI Coverage</p>
                            <h4 className="text-3xl font-bold text-purple-900 dark:text-purple-100 mt-2">100%</h4>
                        </div>
                        <Brain className="w-6 h-6 text-purple-600" />
                    </div>
                    <p className="text-xs text-purple-600 dark:text-purple-300 mt-2">
                        {risks.length} tasks analyzed
                    </p>
                </Card>
            </div>

            <div className="flex justify-between items-center pt-2">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Identified Risks</h3>
                <Button variant="outline" size="sm" onClick={handleAnalyze}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Re-analyze
                </Button>
            </div>

            {/* Risks List */}
            <div className="space-y-4">
                {risks.length === 0 ? (
                    <Card className="p-8 text-center border-dashed border-2 border-zinc-200 dark:border-zinc-800">
                        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 mx-auto flex items-center justify-center mb-3">
                            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <h4 className="text-zinc-900 dark:text-white font-medium">No significant risks found</h4>
                        <p className="text-zinc-500 text-sm mt-1">Your event plan involves no logical inconsistencies or major timeline conflicts.</p>
                    </Card>
                ) : (
                    risks.map((risk, index) => (
                        <Card key={index} className="overflow-hidden border-zinc-200 dark:border-zinc-800">
                            <div className="p-4 bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline" className={`capitalize ${getRiskColor(risk.riskLevel)}`}>
                                        {risk.riskLevel} Risk
                                    </Badge>
                                    <h4 className="font-medium text-zinc-900 dark:text-white">
                                        {risk.taskTitle}
                                    </h4>
                                </div>
                            </div>

                            <div className="p-4 space-y-4">
                                <div className="space-y-2">
                                    {risk.risks.map((r, i) => (
                                        <div key={i} className="flex items-start gap-3 text-sm">
                                            <div className="mt-0.5 text-zinc-400">
                                                {getRiskIcon(r.type)}
                                            </div>
                                            <div>
                                                <span className="font-medium text-zinc-700 dark:text-zinc-300 capitalize">{r.type}: </span>
                                                <span className="text-zinc-600 dark:text-zinc-400">{r.description}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {risk.recommendations && risk.recommendations.length > 0 && (
                                    <div className="bg-blue-50 dark:bg-blue-900/10 rounded-md p-3">
                                        <p className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase mb-2">AI Recommendation</p>
                                        <ul className="list-disc list-inside text-sm text-blue-800 dark:text-blue-200 space-y-1">
                                            {risk.recommendations.map((rec, i) => (
                                                <li key={i}>{rec}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
