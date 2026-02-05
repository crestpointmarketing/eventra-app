'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, ThumbsUp, ThumbsDown, X } from 'lucide-react'
import { CreateTaskDialog } from '@/components/tasks/create-task-dialog'

interface AIRecommendationsProps {
    lead: any
}

export function AIRecommendations({ lead }: AIRecommendationsProps) {
    const recommendations = lead.metadata?.ai_intelligence?.recommendations || []
    const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
    const [selectedRecommendation, setSelectedRecommendation] = useState<any>(null)

    const handleExecute = (rec: any) => {
        setSelectedRecommendation(rec)
        setIsTaskDialogOpen(true)
    }

    return (
        <>
            <Card className="bg-gradient-to-br from-white to-purple-50/50 dark:from-zinc-900 dark:to-purple-900/10 border-purple-100 dark:border-purple-900/20">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                        Next Best Actions
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {recommendations.length > 0 ? (
                        recommendations.map((rec: any) => {
                            if (!rec.action) return null
                            return (
                                <div key={rec.id || Math.random()} className="group bg-white dark:bg-zinc-800/80 border border-zinc-100 dark:border-zinc-700/50 p-4 rounded-lg shadow-sm hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                                            {rec.action}
                                            {rec.impact && (
                                                <Badge variant="secondary" className="text-[10px] bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-0">
                                                    {rec.impact}
                                                </Badge>
                                            )}
                                        </h4>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400 hover:text-green-600">
                                                <ThumbsUp className="w-3 h-3" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400 hover:text-red-600">
                                                <ThumbsDown className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>

                                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                                        {rec.reasoning || "No detailed reasoning provided."}
                                    </p>

                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-zinc-400 font-medium">
                                            {rec.timeframe ? `Suggested: ${rec.timeframe}` : ''}
                                        </span>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-700 dark:text-purple-300"
                                            onClick={() => handleExecute(rec)}
                                        >
                                            Execute Suggestion <ArrowRight className="w-3 h-3 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            )
                        })
                    ) : (
                        <div className="text-center py-8 text-zinc-500">
                            <p className="text-sm italic">No specific recommendations generated.</p>
                            <p className="text-xs text-zinc-400 mt-1">Try adding more lead details to get actionable insights.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Task Creation Dialog */}
            <CreateTaskDialog
                open={isTaskDialogOpen}
                onOpenChange={setIsTaskDialogOpen}
                eventId={lead.event_id || ''}
                initialTitle={selectedRecommendation?.action || ''}
                initialDescription={`AI Recommendation: ${selectedRecommendation?.reasoning || ''}\n\nLead: ${lead.first_name} ${lead.last_name} (${lead.company})\nImpact: ${selectedRecommendation?.impact || 'N/A'}\nTimeframe: ${selectedRecommendation?.timeframe || 'N/A'}`}
            />
        </>
    )
}
