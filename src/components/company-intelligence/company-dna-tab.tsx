'use client'

import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { X, Plus, HelpCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import type { CompanyIntelligence } from '@/types/company-intelligence'
import { CompanyDNASummary } from './company-dna-summary'

interface CompanyDNATabProps {
    data: Partial<CompanyIntelligence>
    onChange: (field: string, value: any) => void
    isEditMode: boolean
}

const PREDEFINED_PRODUCTS = [
    'Event Management',
    'Lead Generation',
    'Marketing Automation',
    'CRM',
    'Analytics',
    'Email Marketing'
]

const TARGET_INDUSTRIES = [
    'Technology',
    'Healthcare',
    'Finance',
    'Education',
    'Manufacturing',
    'Retail',
    'Real Estate',
    'Consulting',
    'Media & Entertainment',
    'Non-Profit'
]

const COMPLIANCE_OPTIONS = [
    { value: 'hipaa', label: 'HIPAA' },
    { value: 'gov', label: 'Government' },
    { value: 'none', label: 'None' }
]

export function CompanyDNATab({ data, onChange, isEditMode }: CompanyDNATabProps) {
    const [newProduct, setNewProduct] = useState('')

    const handleProductToggle = (product: string) => {
        const current = data.core_products || []
        const updated = current.includes(product)
            ? current.filter(p => p !== product)
            : [...current, product]
        onChange('core_products', updated)
    }

    const handleAddCustomProduct = () => {
        if (!newProduct.trim()) return
        const current = data.core_products || []
        if (!current.includes(newProduct.trim())) {
            onChange('core_products', [...current, newProduct.trim()])
        }
        setNewProduct('')
    }

    const handleRemoveProduct = (product: string) => {
        const current = data.core_products || []
        onChange('core_products', current.filter(p => p !== product))
    }

    const handleIndustryToggle = (industry: string) => {
        const current = data.target_industries || []
        const updated = current.includes(industry)
            ? current.filter(i => i !== industry)
            : [...current, industry]
        onChange('target_industries', updated)
    }

    const handleComplianceToggle = (compliance: string) => {
        const current = data.compliance_requirements || []
        const updated = current.includes(compliance)
            ? current.filter(c => c !== compliance)
            : [...current, compliance]
        onChange('compliance_requirements', updated)
    }

    return (
        <TooltipProvider>
            {/* If view mode, show summary */}
            {!isEditMode ? (
                <CompanyDNASummary data={data} />
            ) : (
                <Card className="p-8 border border-zinc-200 dark:bg-slate-900 dark:border-white/10">
                    <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-6">
                        Company DNA
                    </h2>
                    <p className="text-sm text-zinc-600 dark:text-white/60 mb-8">
                        Tell us who you are. This helps AI understand your business context.
                    </p>

                    <div className="space-y-8">
                        {/* Company Description */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="description">Company Description</Label>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <HelpCircle className="w-4 h-4 text-zinc-400" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="max-w-xs">Brief description of your core business and what you do</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <Textarea
                                id="description"
                                value={data.company_description || ''}
                                onChange={(e) => onChange('company_description', e.target.value)}
                                placeholder="e.g., We help B2B companies run successful events and convert attendees into qualified leads..."
                                className="min-h-36"
                                maxLength={500}
                            />
                            <p className="text-xs text-zinc-500 dark:text-white/40">
                                {(data.company_description || '').length}/500 characters
                            </p>
                        </div>

                        {/* Core Products/Services */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Label>Core Products / Services</Label>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <HelpCircle className="w-4 h-4 text-zinc-400" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="max-w-xs">What products or services do you offer?</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>

                            {/* Selected Products */}
                            {(data.core_products || []).length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {(data.core_products || []).map(product => (
                                        <Badge key={product} variant="secondary" className="px-3 py-1">
                                            {product}
                                            <X
                                                className="w-3 h-3 ml-2 cursor-pointer hover:text-red-500"
                                                onClick={() => handleRemoveProduct(product)}
                                            />
                                        </Badge>
                                    ))}
                                </div>
                            )}

                            {/* Predefined Options */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {PREDEFINED_PRODUCTS.map(product => (
                                    <div key={product} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`product-${product}`}
                                            checked={(data.core_products || []).includes(product)}
                                            onCheckedChange={() => handleProductToggle(product)}
                                        />
                                        <Label
                                            htmlFor={`product-${product}`}
                                            className="text-sm font-normal cursor-pointer"
                                        >
                                            {product}
                                        </Label>
                                    </div>
                                ))}
                            </div>

                            {/* Custom Input */}
                            <div className="flex gap-2 mt-3 max-w-xs">
                                <Input
                                    value={newProduct}
                                    onChange={(e) => setNewProduct(e.target.value)}
                                    placeholder="Add custom product/service..."
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddCustomProduct()}
                                />
                                <Button onClick={handleAddCustomProduct} size="sm" variant="outline">
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Target Industries */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Label>Target Industries</Label>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <HelpCircle className="w-4 h-4 text-zinc-400" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="max-w-xs">Which industries do you primarily serve? AI uses this for lead matching.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {TARGET_INDUSTRIES.map(industry => (
                                    <div key={industry} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`industry-${industry}`}
                                            checked={(data.target_industries || []).includes(industry)}
                                            onCheckedChange={() => handleIndustryToggle(industry)}
                                        />
                                        <Label
                                            htmlFor={`industry-${industry}`}
                                            className="text-sm font-normal cursor-pointer"
                                        >
                                            {industry}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Compliance Requirements */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Label>Compliance Requirements</Label>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <HelpCircle className="w-4 h-4 text-zinc-400" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="max-w-xs">Any compliance requirements that affect your business</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <div className="flex gap-4">
                                {COMPLIANCE_OPTIONS.map(option => (
                                    <div key={option.value} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`compliance-${option.value}`}
                                            checked={(data.compliance_requirements || []).includes(option.value)}
                                            onCheckedChange={() => handleComplianceToggle(option.value)}
                                        />
                                        <Label
                                            htmlFor={`compliance-${option.value}`}
                                            className="text-sm font-normal cursor-pointer"
                                        >
                                            {option.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Company Stage & Primary Market - Side by Side */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Company Stage */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="stage">Company Stage</Label>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <HelpCircle className="w-4 h-4 text-zinc-400" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="max-w-xs">Your current company stage helps AI understand your context</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <Select
                                    value={data.company_stage || ''}
                                    onValueChange={(value) => onChange('company_stage', value)}
                                >
                                    <SelectTrigger id="stage">
                                        <SelectValue placeholder="Select stage..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="startup">Startup</SelectItem>
                                        <SelectItem value="growth">Growth</SelectItem>
                                        <SelectItem value="enterprise">Enterprise</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Primary Market */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="market">Primary Market</Label>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <HelpCircle className="w-4 h-4 text-zinc-400" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="max-w-xs">Your primary geographic market</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <Select
                                    value={data.primary_market || ''}
                                    onValueChange={(value) => onChange('primary_market', value)}
                                >
                                    <SelectTrigger id="market">
                                        <SelectValue placeholder="Select market..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="us">United States</SelectItem>
                                        <SelectItem value="apac">APAC</SelectItem>
                                        <SelectItem value="europe">Europe</SelectItem>
                                        <SelectItem value="global">Global</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </Card>
            )}
        </TooltipProvider>
    )
}
