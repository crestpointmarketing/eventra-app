'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Bot, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSummarizeLead } from '@/hooks/useAI'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface AILeadOverviewProps {
    lead: any
}

export function AILeadOverview({ lead }: AILeadOverviewProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const { mutate: summarizeLead, isPending } = useSummarizeLead()
    const queryClient = useQueryClient()

    // Check if we have real intelligence data
    const summary = lead.metadata?.ai_intelligence?.summary
    // Strict check: if summary is missing, short, or placeholder, we show the button
    const showButton = !summary ||
        typeof summary !== 'string' ||
        summary.includes("No AI summary available") ||
        summary.length < 20

    // Use real data from metadata
    const analysis = {
        summary: !showButton ? summary : "No AI summary available yet. Click 'Generate' to analyze this lead.",
        keyTalkingPoints: lead.metadata?.ai_intelligence?.key_talking_points || []
    }

    const handleGenerate = () => {
        console.log('🔥 Generate button clicked! Lead ID:', lead.id)
        summarizeLead({ leadId: lead.id }, {
            onSuccess: async (data) => {
                console.log('✅ AI Generation successful!', data)
                // Invalidate exact query key to force refetch in parent
                await queryClient.invalidateQueries({ queryKey: ['lead', lead.id] })
                console.log('🔄 Query invalidated for lead:', lead.id)
                toast.success("Lead intelligence generated")
            },
            onError: (error) => {
                console.error('❌ AI Generation failed!', error)
                toast.error("Failed to generate intelligence")
            }
        })
    }

    return (
        <Card className="border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/30 dark:bg-indigo-900/10">
            <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                            <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="font-semisemibold text-indigo-900 dark:text-indigo-300">AI Lead Overview</h3>
                            {!showButton ? (
                                <p className="text-xs text-indigo-600/80 dark:text-indigo-400/80 flex items-center gap-2">
                                    Generated {lead.metadata?.last_ai_update ? new Date(lead.metadata.last_ai_update).toLocaleDateString() : 'recently'}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleGenerate();
                                        }}
                                        className="ml-2 px-2 py-0.5 bg-indigo-200 dark:bg-indigo-800 rounded text-[10px] font-medium hover:bg-indigo-300 dark:hover:bg-indigo-700 transition-colors"
                                        disabled={isPending}
                                    >
                                        {isPending ? 'Updating...' : 'Regenerate'}
                                    </button>
                                </p>
                            ) : (
                                <p className="text-xs text-indigo-600/80 dark:text-indigo-400/80">AI Analysis Needed</p>
                            )}
                        </div>
                    </div>
                    {!showButton && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                    )}
                </div>

                {showButton ? (
                    <div className="py-6 text-center">
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                            Generate a comprehensive intelligence report for this lead, including signals, product fit, and recommendations.
                        </p>
                        <Button
                            onClick={handleGenerate}
                            disabled={isPending}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Analyzing Lead...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Generate Intelligence
                                </>
                            )}
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="relative">
                            <p className={`text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed ${!isExpanded ? 'line-clamp-3' : ''}`}>
                                {analysis.summary}
                            </p>
                            {!isExpanded && (
                                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-indigo-50/50 dark:from-zinc-900/10 to-transparent" />
                            )}
                        </div>

                        <AnimatePresence>
                            {isExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="mt-4 pt-4 border-t border-indigo-200/50 dark:border-indigo-800/30"
                                >
                                    <h4 className="text-xs font-semibold uppercase text-indigo-500 mb-2 flex items-center gap-1.5">
                                        <Sparkles className="w-3 h-3" /> Talking Points
                                    </h4>
                                    <ul className="space-y-2">
                                        {analysis.keyTalkingPoints.map((point: string, i: number) => (
                                            <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300 flex items-start gap-2">
                                                <span className="text-indigo-400 mt-1.5 px-0.5">•</span>
                                                {point}
                                            </li>
                                        ))}
                                    </ul>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                )}
            </div>
        </Card>
    )
}
