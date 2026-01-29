// Progress Insights Widget
// Displays event progress metrics and completion predictions

'use client'

import { useProgressInsights } from '@/hooks/useAI'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'

interface ProgressInsightsWidgetProps {
    eventId: string
}

export function ProgressInsightsWidget({ eventId }: ProgressInsightsWidgetProps) {
    const { data: insights, isLoading } = useProgressInsights(eventId)

    if (isLoading) {
        return (
            <Card className="border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 animate-pulse">
                <CardHeader>
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mt-2"></div>
                </CardHeader>
            </Card>
        )
    }

    if (!insights) return null

    const completionPercentage = insights.completionRate || 0

    return (
        <Card className="border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Progress Insights
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300">
                    AI-powered event progress analysis
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Completion Progress */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Completion</span>
                        <span className="text-lg font-bold text-blue-700 dark:text-blue-300">{completionPercentage}%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-500 dark:to-blue-300 transition-all"
                            style={{ width: `${completionPercentage}%` }}
                        />
                    </div>
                </div>

                {/* Task Status Grid */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
                        <div className="flex items-center gap-2 text-green-800 dark:text-green-200 mb-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-xs font-medium">Completed</span>
                        </div>
                        <span className="text-2xl font-bold text-green-700 dark:text-green-300">
                            {insights.completedTasks}
                        </span>
                    </div>

                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
                        <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 mb-1">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-xs font-medium">On Track</span>
                        </div>
                        <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                            {insights.onTrackTasks}
                        </span>
                    </div>

                    <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-900">
                        <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200 mb-1">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-xs font-medium">At Risk</span>
                        </div>
                        <span className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                            {insights.atRiskTasks}
                        </span>
                    </div>
                </div>

                {/* Event Prediction */}
                {insights.predictions && (
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-900">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
                                Event in {insights.predictions.daysUntilEvent} days
                            </span>
                        </div>
                        <div className="text-xs text-indigo-700 dark:text-indigo-300">
                            Predicted completion: {format(new Date(insights.predictions.eventCompletion), 'MMM d, yyyy')}
                            <Badge className="ml-2" variant="outline">
                                {Math.round(insights.predictions.confidence)}% confidence
                            </Badge>
                        </div>
                    </div>
                )}

                {/* Bottlenecks Warning */}
                {insights.bottlenecks && insights.bottlenecks.length > 0 && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-900">
                        <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm font-semibold">
                                {insights.bottlenecks.length} Bottleneck{insights.bottlenecks.length > 1 ? 's' : ''} Detected
                            </span>
                        </div>
                        <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                            {insights.bottlenecks[0].description}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
