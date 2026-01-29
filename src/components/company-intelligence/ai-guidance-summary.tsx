'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Brain, MessageSquare, AlertTriangle, Mic, Check } from 'lucide-react'
import type { CompanyIntelligence } from '@/types/company-intelligence'

interface AIGuidanceSummaryProps {
    data: Partial<CompanyIntelligence>
}

const AI_BEHAVIORS_LABELS: Record<string, string> = {
    auto_score: 'Auto-Score Leads',
    auto_follow_up: 'Auto-Draft Follow-ups',
    suggest_tasks: 'Suggest Next Tasks',
    event_insights: 'Event Performance Insights',
    lead_prioritization: 'Lead Prioritization'
}

export function AIGuidanceSummary({ data }: AIGuidanceSummaryProps) {
    return (
        <Card className="p-8 border border-zinc-200 dark:bg-slate-900 dark:border-white/10">
            <div className="space-y-8">
                {/* Follow-up Style & Risk Tolerance */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Follow-up Style */}
                    {data.followup_style && (
                        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30">
                            <div className="flex items-center gap-2 mb-2">
                                <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                    Follow-up Style
                                </span>
                            </div>
                            <p className="text-lg font-semibold text-blue-900 dark:text-blue-200 capitalize">
                                {data.followup_style}
                            </p>
                        </div>
                    )}

                    {/* Risk Tolerance */}
                    {data.risk_tolerance && (
                        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                                    Risk Tolerance
                                </span>
                            </div>
                            <p className="text-lg font-semibold text-amber-900 dark:text-amber-200 capitalize">
                                {data.risk_tolerance}
                            </p>
                        </div>
                    )}
                </div>

                {/* Tone Preference */}
                {data.tone_preference && (
                    <div className="p-6 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-200 dark:border-indigo-900/30">
                        <div className="flex items-center gap-2 mb-2">
                            <Mic className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                                Tone Preference
                            </span>
                        </div>
                        <p className="text-xl font-semibold text-indigo-900 dark:text-indigo-200 capitalize">
                            {data.tone_preference === 'professional' && 'Professional - Formal and business-oriented'}
                            {data.tone_preference === 'friendly' && 'Friendly - Warm and approachable'}
                            {data.tone_preference === 'casual' && 'Casual / Conversational - Relaxed and informal'}
                        </p>
                    </div>
                )}

                {/* AI Behaviors */}
                {data.ai_behaviors && data.ai_behaviors.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                AI Should...
                            </h3>
                        </div>

                        <div className="grid gap-3">
                            {data.ai_behaviors.map((behavior) => (
                                <div
                                    key={behavior}
                                    className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30"
                                >
                                    <div className="flex-shrink-0">
                                        <div className="w-5 h-5 rounded-full bg-green-500 dark:bg-green-600 flex items-center justify-center">
                                            <Check className="w-3 h-3 text-white" />
                                        </div>
                                    </div>
                                    <span className="text-sm font-medium text-green-900 dark:text-green-200">
                                        {AI_BEHAVIORS_LABELS[behavior] || behavior}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!data.followup_style && !data.risk_tolerance && !data.tone_preference && !data.ai_behaviors?.length && (
                    <div className="text-center py-12">
                        <Brain className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
                        <p className="text-zinc-500 dark:text-zinc-400">
                            No AI Guidance information available yet.
                        </p>
                    </div>
                )}
            </div>
        </Card>
    )
}
