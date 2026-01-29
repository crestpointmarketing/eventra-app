// Risk Analysis Dashboard Component
// Displays event-level risk analysis with warnings and recommendations

'use client'

import { useState } from 'react'
import { useAnalyzeRisks, type TaskRisk } from '@/hooks/useAI'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, ShieldAlert, TrendingDown, CheckCircle2, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface RiskAnalysisDashboardProps {
    eventId: string
}

export function RiskAnalysisDashboard({ eventId }: RiskAnalysisDashboardProps) {
    const [analysis, setAnalysis] = useState<{
        risks: TaskRisk[]
        overallRiskScore: number
        criticalCount: number
    } | null>(null)

    const { mutate: analyze, isPending } = useAnalyzeRisks()

    const handleAnalyze = () => {
        analyze(eventId, {
            onSuccess: (data) => {
                setAnalysis(data)
            }
        })
    }

    const getRiskLevelColor = (level: string) => {
        switch (level) {
            case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300 dark:border-red-700'
            case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-300 dark:border-orange-700'
            case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700'
            case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300 dark:border-green-700'
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'
        }
    }

    const getRiskScoreColor = (score: number) => {
        if (score >= 70) return 'text-red-600 dark:text-red-400'
        if (score >= 50) return 'text-orange-600 dark:text-orange-400'
        if (score >= 30) return 'text-yellow-600 dark:text-yellow-400'
        return 'text-green-600 dark:text-green-400'
    }

    const getRiskIcon = (level: string) => {
        switch (level) {
            case 'critical': return <ShieldAlert className="w-4 h-4" />
            case 'high': return <AlertTriangle className="w-4 h-4" />
            case 'medium': return <TrendingDown className="w-4 h-4" />
            default: return <CheckCircle2 className="w-4 h-4" />
        }
    }

    return (
        <Card className="border-orange-200 dark:border-orange-800 bg-white dark:bg-slate-900">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                            <ShieldAlert className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                            Risk Analysis
                        </CardTitle>
                        <CardDescription className="text-gray-600 dark:text-gray-300">
                            {analysis ? 'Identify at-risk tasks and potential issues' : 'Analyze tasks for risks and blockersEvaluate task deadlines and dependencies'}
                        </CardDescription>
                    </div>
                    <Button
                        onClick={handleAnalyze}
                        disabled={isPending}
                        size="sm"
                        className="gap-2"
                        variant={analysis ? "outline" : "default"}
                    >
                        <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
                        {isPending ? 'Analyzing...' : analysis ? 'Refresh' : 'Analyze Risks'}
                    </Button>
                </div>
            </CardHeader>

            <AnimatePresence>
                {analysis && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <CardContent className="space-y-4">
                            {/* Overall Risk Score */}
                            <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Overall Risk Score</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-32 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all ${analysis.overallRiskScore >= 70 ? 'bg-red-600 dark:bg-red-500' :
                                                    analysis.overallRiskScore >= 50 ? 'bg-orange-600 dark:bg-orange-500' :
                                                        analysis.overallRiskScore >= 30 ? 'bg-yellow-600 dark:bg-yellow-500' :
                                                            'bg-green-600 dark:bg-green-500'
                                                }`}
                                            style={{ width: `${analysis.overallRiskScore}%` }}
                                        />
                                    </div>
                                    <span className={`text-2xl font-bold ${getRiskScoreColor(analysis.overallRiskScore)}`}>
                                        {analysis.overallRiskScore}
                                    </span>
                                </div>
                            </div>

                            {/* Critical Tasks Summary */}
                            {analysis.criticalCount > 0 && (
                                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                                    <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                                        <AlertTriangle className="w-5 h-5" />
                                        <span className="font-semibold">
                                            {analysis.criticalCount} Critical Risk{analysis.criticalCount > 1 ? 's' : ''} Detected
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Risk List */}
                            {analysis.risks.length > 0 ? (
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                                        At-Risk Tasks ({analysis.risks.length})
                                    </h4>
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {analysis.risks.map((risk) => (
                                            <motion.div
                                                key={risk.taskId}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className={`p-3 rounded-lg border ${getRiskLevelColor(risk.riskLevel)}`}
                                            >
                                                <div className="flex items-start gap-2">
                                                    {getRiskIcon(risk.riskLevel)}
                                                    <div className="flex-1 space-y-2">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <span className="font-medium text-sm">{risk.taskTitle}</span>
                                                            <Badge variant="outline" className="text-xs">
                                                                {risk.riskLevel}
                                                            </Badge>
                                                        </div>

                                                        {/* Risk Factors */}
                                                        <div className="space-y-1">
                                                            {risk.risks.map((factor, idx) => (
                                                                <div key={idx} className="text-xs opacity-90">
                                                                    • {factor.description}
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Recommendations */}
                                                        {risk.recommendations.length > 0 && (
                                                            <div className="pt-2 border-t border-current opacity-60">
                                                                <p className="text-xs font-semibold mb-1">Recommendations:</p>
                                                                {risk.recommendations.map((rec, idx) => (
                                                                    <div key={idx} className="text-xs">
                                                                        {rec}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 text-center">
                                    <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
                                    <p className="font-medium text-gray-700 dark:text-gray-300">All Tasks On Track</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        No significant risks detected at this time
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    )
}
