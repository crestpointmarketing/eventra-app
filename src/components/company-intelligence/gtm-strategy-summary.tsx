'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Target, Users, DollarSign, Clock, Zap } from 'lucide-react'
import type { CompanyIntelligence } from '@/types/company-intelligence'

interface GTMStrategySummaryProps {
    data: Partial<CompanyIntelligence>
}

export function GTMStrategySummary({ data }: GTMStrategySummaryProps) {
    const icp = data.icp_data as import('@/types/company-intelligence').ICPData | undefined


    return (
        <Card className="p-8 border border-zinc-200 dark:bg-slate-900 dark:border-white/10">
            <div className="space-y-8">
                {/* Primary Business Goal */}
                {data.primary_business_goal && (
                    <div className="p-6 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border border-orange-200 dark:border-orange-900/30">
                        <div className="flex items-center gap-2 mb-2">
                            <Zap className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                                Primary Business Goal
                            </span>
                        </div>
                        <p className="text-xl font-semibold text-orange-900 dark:text-orange-200 capitalize">
                            {data.primary_business_goal.replace('_', ' ')}
                        </p>
                    </div>
                )}

                {/* ICP Overview */}
                {(icp?.companySizes?.length || icp?.jobTitles?.length) && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                Ideal Customer Profile (ICP)
                            </h3>
                        </div>

                        {/* Company Sizes */}
                        {icp?.companySizes && icp.companySizes.length > 0 && (
                            <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400 block mb-2">
                                    Target Company Sizes
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    {icp?.companySizes?.map((size) => (
                                        <Badge key={size} variant="secondary" className="px-3 py-1.5">
                                            {size} employees
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Job Titles */}
                        {icp?.jobTitles && icp.jobTitles.length > 0 && (
                            <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400 block mb-2">
                                    Target Job Titles
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    {icp?.jobTitles?.map((title) => (
                                        <Badge key={title} variant="outline" className="px-3 py-1.5">
                                            {title}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Budget Range */}
                        {(icp?.budgetMin || icp?.budgetMax) && (
                            <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                                <div className="flex items-center gap-2 mb-2">
                                    <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                        ICP Budget Range
                                    </span>
                                </div>
                                <p className="text-lg font-semibold text-zinc-900 dark:text-white">
                                    ${(icp?.budgetMin || 0).toLocaleString()} - ${(icp?.budgetMax || 0).toLocaleString()}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Deal Size & Sales Cycle */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Typical Deal Size */}
                    {(data.typical_deal_size_min || data.typical_deal_size_max) && (
                        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                    Typical Deal Size
                                </span>
                            </div>
                            <p className="text-lg font-semibold text-zinc-900 dark:text-white">
                                ${(data.typical_deal_size_min || 0).toLocaleString()} - ${(data.typical_deal_size_max || 0).toLocaleString()}
                            </p>
                        </div>
                    )}

                    {/* Sales Cycle Length */}
                    {data.sales_cycle_length && (
                        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                    Sales Cycle Length
                                </span>
                            </div>
                            <p className="text-lg font-semibold text-zinc-900 dark:text-white">
                                {data.sales_cycle_length}
                            </p>
                        </div>
                    )}
                </div>

                {/* Key Differentiators */}
                {data.key_differentiators && data.key_differentiators.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                Key Differentiators
                            </h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {data.key_differentiators.map((diff) => (
                                <Badge key={diff} variant="default" className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700">
                                    {diff}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Strategic Notes */}
                {data.strategic_notes && (
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                            Strategic Notes
                        </h3>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                            {data.strategic_notes}
                        </p>
                    </div>
                )}

                {/* Empty State */}
                {!data.primary_business_goal && !icp?.companySizes?.length && !icp?.jobTitles?.length && (
                    <div className="text-center py-12">
                        <Target className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
                        <p className="text-zinc-500 dark:text-zinc-400">
                            No GTM Strategy information available yet.
                        </p>
                    </div>
                )}
            </div>
        </Card>
    )
}
