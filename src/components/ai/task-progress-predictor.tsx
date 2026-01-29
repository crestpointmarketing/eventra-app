// Task Progress Predictor Component
// Displays AI-powered task completion time predictions

'use client'

import { useState } from 'react'
import { usePredictCompletion, type CompletionPrediction } from '@/hooks/useAI'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Brain, Calendar, TrendingUp, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface TaskProgressPredictorProps {
    taskId: string
    eventId?: string
}

export function TaskProgressPredictor({ taskId, eventId }: TaskProgressPredictorProps) {
    const [prediction, setPrediction] = useState<CompletionPrediction | null>(null)
    const [showDetails, setShowDetails] = useState(false)

    const { mutate: predict, isPending } = usePredictCompletion()

    const handlePredict = () => {
        predict({ taskId, eventId }, {
            onSuccess: (data) => {
                setPrediction(data.prediction)
                setShowDetails(true)
            }
        })
    }

    const getComplexityColor = (complexity: string) => {
        switch (complexity) {
            case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
            case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
        }
    }

    const getUrgencyColor = (urgency: string) => {
        switch (urgency) {
            case 'low': return 'text-blue-600 dark:text-blue-400'
            case 'medium': return 'text-orange-600 dark:text-orange-400'
            case 'high': return 'text-red-600 dark:text-red-400'
            default: return 'text-gray-600 dark:text-gray-400'
        }
    }

    return (
        <div className="space-y-3">
            <Button
                onClick={handlePredict}
                disabled={isPending}
                variant="outline"
                size="sm"
                className="gap-2 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950"
            >
                <Brain className="w-4 h-4" />
                {isPending ? 'Analyzing...' : 'Predict Completion'}
            </Button>

            <AnimatePresence>
                {showDetails && prediction && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Card className="border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30">
                            <CardContent className="pt-4 space-y-3">
                                {/* Estimated Days */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Estimated Time
                                        </span>
                                    </div>
                                    <span className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
                                        {prediction.estimatedDays} {prediction.estimatedDays === 1 ? 'day' : 'days'}
                                    </span>
                                </div>

                                {/* Confidence */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Confidence
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-600 dark:bg-indigo-400 transition-all"
                                                style={{ width: `${prediction.confidence}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                                            {prediction.confidence}%
                                        </span>
                                    </div>
                                </div>

                                {/* Factors */}
                                <div className="pt-2 space-y-2 border-t border-indigo-200 dark:border-indigo-800">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-600 dark:text-gray-400">Complexity</span>
                                        <Badge className={getComplexityColor(prediction.factors.complexity)}>
                                            {prediction.factors.complexity}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-600 dark:text-gray-400">Dependencies</span>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {prediction.factors.dependencies}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-600 dark:text-gray-400">Urgency</span>
                                        <span className={`text-sm font-medium ${getUrgencyColor(prediction.factors.urgency)}`}>
                                            {prediction.factors.urgency}
                                        </span>
                                    </div>
                                </div>

                                {/* Reasoning */}
                                <div className="pt-2 border-t border-indigo-200 dark:border-indigo-800">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
                                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                            {prediction.reasoning}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
