'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react'

import { useSummarizeLead } from '@/hooks/useAI'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { RefreshCcw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ProductFitAnalysisProps {
    lead: any
}

export function ProductFitAnalysis({ lead }: ProductFitAnalysisProps) {
    const { mutate: summarizeLead, isPending } = useSummarizeLead()
    const queryClient = useQueryClient()

    const handleRegenerate = () => {
        summarizeLead({ leadId: lead.id }, {
            onSuccess: async () => {
                await queryClient.invalidateQueries({ queryKey: ['lead', lead.id] })
                toast.success("Product analysis updated")
            },
            onError: () => toast.error("Failed to update analysis")
        })
    }

    // Use real data from metadata
    const fitAnalysis = lead.metadata?.ai_intelligence?.product_fit || {
        overallScore: 0,
        breakdown: [],
        risks: []
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        Product Fit Analysis
                        <Badge variant={fitAnalysis.overallScore >= 80 ? 'default' : 'secondary'} className={fitAnalysis.overallScore >= 80 ? "bg-lime-600 hover:bg-lime-700" : ""}>
                            {fitAnalysis.overallScore}% Overall Match
                        </Badge>
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-600"
                        onClick={handleRegenerate}
                        disabled={isPending}
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    {(fitAnalysis.breakdown && fitAnalysis.breakdown.length > 0) ? (
                        fitAnalysis.breakdown.map((item: any, i: number) => {
                            if (!item.product) return null
                            return (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-medium text-zinc-900 dark:text-white">{item.product}</span>
                                        <span className={`text-xs font-semibold ${item.fit === 'High' ? 'text-lime-600 dark:text-lime-400' :
                                            item.fit === 'Medium' ? 'text-amber-600 dark:text-amber-400' :
                                                'text-zinc-500'
                                            }`}>
                                            {item.fit} Fit ({item.score}%)
                                        </span>
                                    </div>
                                    <Progress value={item.score} className="h-2"
                                        indicatorClassName={
                                            item.fit === 'High' ? 'bg-lime-500' :
                                                item.fit === 'Medium' ? 'bg-amber-500' :
                                                    'bg-zinc-300 dark:bg-zinc-700'
                                        }
                                    />
                                    <div className="flex items-start gap-2 bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                                        <Info className="w-3.5 h-3.5 mt-0.5 text-zinc-400 flex-shrink-0" />
                                        <div>
                                            <p className="mb-1">{item.reason}</p>
                                            <div className="flex gap-1 flex-wrap">
                                                {(item.signals || []).map((s: string) => (
                                                    <span key={s} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 rounded text-[10px]">
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    ) : (
                        <div className="text-center py-6 text-zinc-500">
                            <p className="text-sm italic">Insufficient data for product fit analysis.</p>
                        </div>
                    )}
                </div>

                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
                    <h4 className="text-xs font-semibold uppercase text-zinc-500 mb-3 tracking-wider">Potential Risks & Blockers</h4>
                    <ul className="space-y-2">
                        {(fitAnalysis.risks || []).map((risk: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                {risk}
                            </li>
                        ))}
                    </ul>
                </div>
            </CardContent>
        </Card>
    )
}
