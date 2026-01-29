'use client'

import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Brain, HelpCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { CompanyIntelligence } from '@/types/company-intelligence'
import { AIGuidanceSummary } from './ai-guidance-summary'

interface AIGuidanceRulesTabProps {
    data: Partial<CompanyIntelligence>
    onChange: (field: string, value: any) => void
    isEditMode: boolean
}

const AI_BEHAVIORS = [
    { value: 'flag_low_quality', label: 'Flag low-quality leads automatically' },
    { value: 'recommend_disqualification', label: 'Recommend disqualification when appropriate' },
    { value: 'suggest_executive_followup', label: 'Suggest executive follow-up for high-value leads' },
    { value: 'generate_drafts', label: 'Generate email/LinkedIn draft suggestions' },
    { value: 'propose_nurture', label: 'Propose nurture sequences for cold leads' }
]

export function AIGuidanceRulesTab({ data, onChange, isEditMode }: AIGuidanceRulesTabProps) {
    const handleBehaviorToggle = (behavior: string) => {
        const current = data.ai_behaviors || []
        const updated = current.includes(behavior)
            ? current.filter(b => b !== behavior)
            : [...current, behavior]
        onChange('ai_behaviors', updated)
    }

    return (
        <TooltipProvider>
            <div className="space-y-6">
                {/* Info Banner */}
                <Card className="p-4 bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/30">
                    <div className="flex items-start gap-3">
                        <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                            <p className="text-indigo-900 dark:text-indigo-200 font-medium mb-1">
                                Teaching AI How to Think
                            </p>
                            <p className="text-indigo-700 dark:text-indigo-300">
                                These settings control how AI approaches recommendations and actions.
                                They won't affect your data, only how AI reasons about it.
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-8 border border-zinc-200 dark:bg-slate-900 dark:border-white/10">
                    <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-6">
                        AI Guidance Rules
                    </h2>
                    <p className="text-sm text-zinc-600 dark:text-white/60 mb-8">
                        Configure how AI should behave when analyzing leads, events, and recommending actions.
                    </p>

                    {/* If edit mode, show edit form */}
                    {!isEditMode ? (
                        <AIGuidanceSummary data={data} />
                    ) : (
                        <div className="space-y-8">
                            {/* Follow-up Style & Risk Tolerance - Side by Side */}
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Follow-up Style */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="followup">Follow-up Style</Label>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <HelpCircle className="w-4 h-4 text-zinc-400" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="max-w-xs">How quickly and assertively should AI recommend follow-ups?</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <Select
                                        value={data.followup_style || ''}
                                        onValueChange={(value) => onChange('followup_style', value)}
                                    >
                                        <SelectTrigger id="followup">
                                            <SelectValue placeholder="Select follow-up style..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="aggressive">
                                                <div>
                                                    <div className="font-medium">Aggressive</div>
                                                    <div className="text-xs text-zinc-500">Act quickly, prioritize speed</div>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="balanced">
                                                <div>
                                                    <div className="font-medium">Balanced</div>
                                                    <div className="text-xs text-zinc-500">Mix of speed and thoughtfulness</div>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="consultative">
                                                <div>
                                                    <div className="font-medium">Consultative</div>
                                                    <div className="text-xs text-zinc-500">Deep research before action</div>
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Risk Tolerance */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="risk">Risk Tolerance</Label>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <HelpCircle className="w-4 h-4 text-zinc-400" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="max-w-xs">How comfortable are you with AI making bold suggestions?</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <Select
                                        value={data.risk_tolerance || ''}
                                        onValueChange={(value) => onChange('risk_tolerance', value)}
                                    >
                                        <SelectTrigger id="risk">
                                            <SelectValue placeholder="Select risk tolerance..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="conservative">
                                                <div>
                                                    <div className="font-medium">Conservative</div>
                                                    <div className="text-xs text-zinc-500">Only high-confidence recommendations</div>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="moderate">
                                                <div>
                                                    <div className="font-medium">Moderate</div>
                                                    <div className="text-xs text-zinc-500">Balanced risk/reward</div>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="aggressive">
                                                <div>
                                                    <div className="font-medium">Aggressive</div>
                                                    <div className="text-xs text-zinc-500">Suggest bold moves</div>
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* AI Behaviors */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Label>AI Should...</Label>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <HelpCircle className="w-4 h-4 text-zinc-400" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="max-w-xs">Select which automated behaviors AI should perform</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>

                                <div className="space-y-4 p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                    {AI_BEHAVIORS.map(behavior => (
                                        <div key={behavior.value} className="flex items-start space-x-3">
                                            <Checkbox
                                                id={`behavior-${behavior.value}`}
                                                checked={(data.ai_behaviors || []).includes(behavior.value)}
                                                onCheckedChange={() => handleBehaviorToggle(behavior.value)}
                                                className="mt-1"
                                            />
                                            <div className="flex-1">
                                                <Label
                                                    htmlFor={`behavior-${behavior.value}`}
                                                    className="text-sm font-medium cursor-pointer leading-relaxed"
                                                >
                                                    {behavior.label}
                                                </Label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Tone Preference */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="tone">Tone Preference</Label>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <HelpCircle className="w-4 h-4 text-zinc-400" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="max-w-xs">What tone should AI use in suggestions and drafts?</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <Select
                                    value={data.tone_preference || ''}
                                    onValueChange={(value) => onChange('tone_preference', value)}
                                >
                                    <SelectTrigger id="tone">
                                        <SelectValue placeholder="Select tone..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="professional">
                                            <div>
                                                <div className="font-medium">Professional</div>
                                                <div className="text-xs text-zinc-500">Formal and business-oriented</div>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="friendly">
                                            <div>
                                                <div className="font-medium">Friendly</div>
                                                <div className="text-xs text-zinc-500">Warm and approachable</div>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="casual">
                                            <div>
                                                <div className="font-medium">Casual / Conversational</div>
                                                <div className="text-xs text-zinc-500">Relaxed and informal</div>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
        </Card>
            </div>
        </TooltipProvider>
    )
}
