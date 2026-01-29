'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Package, Target, Shield, TrendingUp, Globe } from 'lucide-react'
import type { CompanyIntelligence } from '@/types/company-intelligence'

interface CompanyDNASummaryProps {
    data: Partial<CompanyIntelligence>
}

export function CompanyDNASummary({ data }: CompanyDNASummaryProps) {
    return (
        <Card className="p-8 border border-zinc-200 dark:bg-slate-900 dark:border-white/10">
            <div className="space-y-8">
                {/* Company Description */}
                {data.company_description && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                Company Overview
                            </h3>
                        </div>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                            {data.company_description}
                        </p>
                    </div>
                )}

                {/* Products/Services */}
                {data.core_products && data.core_products.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                Products & Services
                            </h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {data.core_products.map((product) => (
                                <Badge key={product} variant="secondary" className="px-3 py-1.5">
                                    {product}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Target Industries */}
                {data.target_industries && data.target_industries.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                Target Industries
                            </h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {data.target_industries.map((industry) => (
                                <Badge key={industry} variant="outline" className="px-3 py-1.5">
                                    {industry}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Company Stage & Primary Market - Side by Side */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Company Stage */}
                    {data.company_stage && (
                        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                    Company Stage
                                </span>
                            </div>
                            <p className="text-lg font-semibold text-zinc-900 dark:text-white capitalize">
                                {data.company_stage}
                            </p>
                        </div>
                    )}

                    {/* Primary Market */}
                    {data.primary_market && (
                        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                            <div className="flex items-center gap-2 mb-2">
                                <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                    Primary Market
                                </span>
                            </div>
                            <p className="text-lg font-semibold text-zinc-900 dark:text-white capitalize">
                                {data.primary_market === 'us' ? 'United States' :
                                    data.primary_market === 'apac' ? 'APAC' :
                                        data.primary_market === 'europe' ? 'Europe' :
                                            data.primary_market === 'global' ? 'Global' :
                                                data.primary_market}
                            </p>
                        </div>
                    )}
                </div>

                {/* Compliance Requirements */}
                {data.compliance_requirements && data.compliance_requirements.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                Compliance Requirements
                            </h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {data.compliance_requirements.map((req) => (
                                <Badge key={req} variant="outline" className="px-3 py-1.5 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300">
                                    {req === 'gdpr' ? 'GDPR' :
                                        req === 'hipaa' ? 'HIPAA' :
                                            req === 'sox' ? 'SOX' :
                                                req === 'none' ? 'None' : req}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!data.company_description && !data.core_products?.length && !data.target_industries?.length && (
                    <div className="text-center py-12">
                        <Building2 className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
                        <p className="text-zinc-500 dark:text-zinc-400">
                            No Company DNA information available yet.
                        </p>
                    </div>
                )}
            </div>
        </Card>
    )
}
