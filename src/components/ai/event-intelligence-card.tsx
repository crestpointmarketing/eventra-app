'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Brain, TrendingUp, Users, Building2, DollarSign, Target, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { useAnalyzeEvent, type EventProfile } from '@/hooks/useAI'
import { motion, AnimatePresence } from 'framer-motion'
import { Progress } from '@/components/ui/progress'

interface EventIntelligenceCardProps {
    eventId: string
    eventName: string
}

export function EventIntelligenceCard({ eventId, eventName }: EventIntelligenceCardProps) {
    const [profile, setProfile] = useState<EventProfile | null>(null)
    const [isExpanded, setIsExpanded] = useState(false)

    const { mutate: analyzeEvent, isPending } = useAnalyzeEvent()

    const handleAnalyze = () => {
        analyzeEvent(eventId, {
            onSuccess: (data) => {
                setProfile(data.profile)
                setIsExpanded(true)
            }
        })
    }

    const getValueColor = (value: string) => {
        switch (value) {
            case 'very_high':
                return 'text-green-600 dark:text-green-400'
            case 'high':
                return 'text-lime-600 dark:text-lime-400'
            case 'medium':
                return 'text-yellow-600 dark:text-yellow-400'
            case 'low':
                return 'text-orange-600 dark:text-orange-400'
            default:
                return 'text-zinc-600 dark:text-zinc-400'
        }
    }

    const getValueLabel = (value: string) => {
        return value.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
    }

    return (
        <Card className="border-indigo-200 dark:border-indigo-900/30 bg-gradient-to-br from-white to-indigo-50/30 dark:from-zinc-900 dark:to-indigo-950/20">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                            <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Event Intelligence</CardTitle>
                            <CardDescription className="dark:text-white/60">
                                AI-powered event analysis and insights
                            </CardDescription>
                        </div>
                    </div>
                    <Button
                        onClick={handleAnalyze}
                        disabled={isPending}
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                    >
                        {isPending ? (
                            <>
                                <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <Brain className="w-4 h-4 mr-2" />
                                Analyze Event
                            </>
                        )}
                    </Button>
                </div>
            </CardHeader>

            <AnimatePresence>
                {profile && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <CardContent className="space-y-6">
                            {/* Summary */}
                            <div className="bg-white dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                <p className="text-sm text-zinc-700 dark:text-white/80 leading-relaxed">
                                    {profile.summary}
                                </p>
                            </div>

                            {/* Target Audience */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                    <h4 className="font-semibold text-sm text-zinc-900 dark:text-white">Target Audience</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                        <p className="text-xs text-zinc-500 dark:text-white/50 mb-2">Job Roles</p>
                                        <div className="flex flex-wrap gap-1">
                                            {profile.targetAudience.jobRoles.slice(0, 3).map((role, i) => (
                                                <Badge key={i} variant="secondary" className="text-xs">
                                                    {role}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                        <p className="text-xs text-zinc-500 dark:text-white/50 mb-2">Company Sizes</p>
                                        <div className="flex flex-wrap gap-1">
                                            {profile.targetAudience.companySize.map((size, i) => (
                                                <Badge key={i} variant="outline" className="text-xs">
                                                    {size}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Suitable Industries */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                    <h4 className="font-semibold text-sm text-zinc-900 dark:text-white">Top Industries</h4>
                                </div>
                                <div className="space-y-2">
                                    {profile.suitableIndustries.slice(0, 3).map((industry, i) => (
                                        <div key={i} className="bg-white dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-zinc-900 dark:text-white">
                                                    {industry.industry}
                                                </span>
                                                <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                                    {industry.fitScore}% fit
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-zinc-600 dark:text-white/60">
                                                {industry.reasoning}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ROI Insights */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                    <h4 className="font-semibold text-sm text-zinc-900 dark:text-white">ROI Insights</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                        <p className="text-xs text-zinc-500 dark:text-white/50 mb-1">Expected Attendance</p>
                                        <p className="text-lg font-semibold text-zinc-900 dark:text-white">
                                            {profile.roiInsights.expectedAttendance.min}-{profile.roiInsights.expectedAttendance.max}
                                        </p>
                                    </div>
                                    <div className="bg-white dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                        <p className="text-xs text-zinc-500 dark:text-white/50 mb-1">Lead Generation</p>
                                        <p className={`text-sm font-medium ${getValueColor(profile.roiInsights.leadGenerationPotential)}`}>
                                            {getValueLabel(profile.roiInsights.leadGenerationPotential)}
                                        </p>
                                    </div>
                                    <div className="bg-white dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                        <p className="text-xs text-zinc-500 dark:text-white/50 mb-1">Networking Value</p>
                                        <p className={`text-sm font-medium ${getValueColor(profile.roiInsights.networkingValue)}`}>
                                            {getValueLabel(profile.roiInsights.networkingValue)}
                                        </p>
                                    </div>
                                    <div className="bg-white dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                        <p className="text-xs text-zinc-500 dark:text-white/50 mb-1">Brand Awareness</p>
                                        <p className={`text-sm font-medium ${getValueColor(profile.roiInsights.brandAwareness)}`}>
                                            {getValueLabel(profile.roiInsights.brandAwareness)}
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-indigo-50 dark:bg-indigo-950/30 p-3 rounded-lg border border-indigo-200 dark:border-indigo-900/30">
                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-1">Estimated ROI</p>
                                    <p className="text-sm text-indigo-900 dark:text-indigo-200">{profile.roiInsights.estimatedROI}</p>
                                </div>
                            </div>

                            {/* Budget Breakdown & Recommendations - Collapsible */}
                            <div className="space-y-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="w-full justify-between text-zinc-700 dark:text-white/80 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                >
                                    <span className="text-sm font-medium">Budget Breakdown & Recommendations</span>
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </Button>

                                {isExpanded && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="space-y-4 pt-2"
                                    >
                                        {/* Budget Breakdown */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 mb-2">
                                                <DollarSign className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                                <h5 className="text-sm font-semibold text-zinc-900 dark:text-white">Budget Allocation</h5>
                                            </div>
                                            {Object.entries(profile.budgetBreakdown).map(([category, data]) => (
                                                <div key={category} className="space-y-1">
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-zinc-600 dark:text-white/60 capitalize">{category}</span>
                                                        <span className="font-medium text-zinc-900 dark:text-white">{data.percentage}%</span>
                                                    </div>
                                                    <Progress value={data.percentage} className="h-2" />
                                                    <p className="text-xs text-zinc-500 dark:text-white/50">{data.recommendation}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Recommendations */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                                <h5 className="text-sm font-semibold text-zinc-900 dark:text-white">Recommendations</h5>
                                            </div>
                                            <ul className="space-y-2">
                                                {profile.recommendations.map((rec, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-white/70">
                                                        <span className="text-indigo-500 mt-1">•</span>
                                                        <span>{rec}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </CardContent>
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    )
}
