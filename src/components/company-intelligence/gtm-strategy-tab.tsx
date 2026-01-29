'use client'

import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { X, Plus, HelpCircle, AlertCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { useState } from 'react'
import type { CompanyIntelligence } from '@/types/company-intelligence'
import { GTMStrategySummary } from './gtm-strategy-summary'

interface GTMStrategyTabProps {
    data: Partial<CompanyIntelligence>
    onChange: (field: string, value: any) => void
    isEditMode: boolean
}

const COMPANY_SIZES = ['1-50', '50-200', '200-1000', '1000+']
const PREDEFINED_DIFFERENTIATORS = ['Price', 'Technology', 'Support', 'Integrations', 'Speed', 'Customization']

export function GTMStrategyTab({ data, onChange, isEditMode }: GTMStrategyTabProps) {
    const [newJobTitle, setNewJobTitle] = useState('')
    const [newDifferentiator, setNewDifferentiator] = useState('')

    const icp = data.icp_data || { companySizes: [], jobTitles: [], industries: [], budgetMin: 0, budgetMax: 100000 }

    const handleICPChange = (field: string, value: any) => {
        onChange('icp_data', { ...icp, [field]: value })
    }

    const handleCompanySizeToggle = (size: string) => {
        const current = icp.companySizes || []
        const updated = current.includes(size)
            ? current.filter(s => s !== size)
            : [...current, size]
        handleICPChange('companySizes', updated)
    }

    const handleAddJobTitle = () => {
        if (!newJobTitle.trim()) return
        const current = icp.jobTitles || []
        if (!current.includes(newJobTitle.trim())) {
            handleICPChange('jobTitles', [...current, newJobTitle.trim()])
        }
        setNewJobTitle('')
    }

    const handleRemoveJobTitle = (title: string) => {
        const current = icp.jobTitles || []
        handleICPChange('jobTitles', current.filter(t => t !== title))
    }

    const handleDifferentiatorToggle = (diff: string) => {
        const current = data.key_differentiators || []
        const updated = current.includes(diff)
            ? current.filter(d => d !== diff)
            : [...current, diff]
        onChange('key_differentiators', updated)
    }

    const handleAddCustomDifferentiator = () => {
        if (!newDifferentiator.trim()) return
        const current = data.key_differentiators || []
        if (!current.includes(newDifferentiator.trim())) {
            onChange('key_differentiators', [...current, newDifferentiator.trim()])
        }
        setNewDifferentiator('')
    }

    const handleRemoveDifferentiator = (diff: string) => {
        const current = data.key_differentiators || []
        onChange('key_differentiators', current.filter(d => d !== diff))
    }

    return (
        <TooltipProvider>
            {/* If view mode, show summary */}
            {!isEditMode ? (
                <GTMStrategySummary data={data} />
            ) : (
                <div className="space-y-6">
                    {/* Important Banner */}
                    <Card className="p-4 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/30">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm">
                                <p className="text-orange-900 dark:text-orange-200 font-semibold mb-1">
                                    ⚡ Most Important Section
                                </p>
                                <p className="text-orange-700 dark:text-orange-300">
                                    This directly affects how AI prioritizes leads and recommends actions.
                                    The more complete, the better AI recommendations you'll get.
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-8 border border-zinc-200 dark:bg-slate-900 dark:border-white/10">
                        <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-6">
                            Go-To-Market Strategy
                        </h2>

                        <div className="space-y-8">
                            {/* Primary Business Goal */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="goal">Primary Business Goal *</Label>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <HelpCircle className="w-4 h-4 text-zinc-400" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="max-w-xs">This guides how AI prioritizes leads and suggests actions</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <Select
                                    value={data.primary_business_goal || ''}
                                    onValueChange={(value) => onChange('primary_business_goal', value)}
                                >
                                    <SelectTrigger id="goal">
                                        <SelectValue placeholder="Select business goal..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="brand_awareness">Brand Awareness</SelectItem>
                                        <SelectItem value="pipeline">Pipeline Generation</SelectItem>
                                        <SelectItem value="revenue">Revenue / Deal Closing</SelectItem>
                                        <SelectItem value="partnership">Partnership / Channel</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* ICP Section */}
                            <div className="space-y-6 p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                    Ideal Customer Profile (ICP)
                                </h3>

                                {/* Company Sizes */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Label>Company Sizes</Label>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <HelpCircle className="w-4 h-4 text-zinc-400" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="max-w-xs">What company sizes do you target?</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {COMPANY_SIZES.map(size => (
                                            <div key={size} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`size-${size}`}
                                                    checked={(icp.companySizes || []).includes(size)}
                                                    onCheckedChange={() => handleCompanySizeToggle(size)}
                                                />
                                                <Label
                                                    htmlFor={`size-${size}`}
                                                    className="text-sm font-normal cursor-pointer"
                                                >
                                                    {size} employees
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Job Titles */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Label>Target Job Titles</Label>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <HelpCircle className="w-4 h-4 text-zinc-400" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="max-w-xs">Job titles of your ideal buyers/decision-makers</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>

                                    {(icp.jobTitles || []).length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {(icp.jobTitles || []).map(title => (
                                                <Badge key={title} variant="secondary" className="px-3 py-1">
                                                    {title}
                                                    <X
                                                        className="w-3 h-3 ml-2 cursor-pointer hover:text-red-500"
                                                        onClick={() => handleRemoveJobTitle(title)}
                                                    />
                                                </Badge>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <Input
                                            value={newJobTitle}
                                            onChange={(e) => setNewJobTitle(e.target.value)}
                                            placeholder="e.g., VP Sales, Marketing Director..."
                                            onKeyPress={(e) => e.key === 'Enter' && handleAddJobTitle()}
                                        />
                                        <Button onClick={handleAddJobTitle} size="sm" variant="outline">
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Budget Range */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Label>ICP Budget Range</Label>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <HelpCircle className="w-4 h-4 text-zinc-400" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="max-w-xs">Typical budget range of your ideal customers</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-xs text-zinc-500">Min Budget</Label>
                                            <Input
                                                type="number"
                                                value={icp.budgetMin || 0}
                                                onChange={(e) => handleICPChange('budgetMin', parseInt(e.target.value) || 0)}
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs text-zinc-500">Max Budget</Label>
                                            <Input
                                                type="number"
                                                value={icp.budgetMax || 0}
                                                onChange={(e) => handleICPChange('budgetMax', parseInt(e.target.value) || 0)}
                                                placeholder="100000"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Typical Deal Size */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Label>Typical Deal Size</Label>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <HelpCircle className="w-4 h-4 text-zinc-400" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="max-w-xs">Average contract value range</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs text-zinc-500">Min Deal Size ($)</Label>
                                        <Input
                                            type="number"
                                            value={data.typical_deal_size_min || 0}
                                            onChange={(e) => onChange('typical_deal_size_min', parseInt(e.target.value) || 0)}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs text-zinc-500">Max Deal Size ($)</Label>
                                        <Input
                                            type="number"
                                            value={data.typical_deal_size_max || 0}
                                            onChange={(e) => onChange('typical_deal_size_max', parseInt(e.target.value) || 0)}
                                            placeholder="1000000"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Sales Cycle Length */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="cycle">Sales Cycle Length</Label>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <HelpCircle className="w-4 h-4 text-zinc-400" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="max-w-xs">How long does it typically take to close a deal?</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <Select
                                    value={data.sales_cycle_length || ''}
                                    onValueChange={(value) => onChange('sales_cycle_length', value)}
                                >
                                    <SelectTrigger id="cycle">
                                        <SelectValue placeholder="Select cycle length..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1-3mo">1-3 months</SelectItem>
                                        <SelectItem value="3-6mo">3-6 months</SelectItem>
                                        <SelectItem value="6-12mo">6-12 months</SelectItem>
                                        <SelectItem value="12mo+">12+ months</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Key Differentiators */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Label>Key Differentiators</Label>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <HelpCircle className="w-4 h-4 text-zinc-400" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="max-w-xs">What makes you different from competitors?</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>

                                {(data.key_differentiators || []).length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {(data.key_differentiators || []).map(diff => (
                                            <Badge key={diff} variant="default" className="px-3 py-1 bg-indigo-600">
                                                {diff}
                                                <X
                                                    className="w-3 h-3 ml-2 cursor-pointer hover:text-red-300"
                                                    onClick={() => handleRemoveDifferentiator(diff)}
                                                />
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                                    {PREDEFINED_DIFFERENTIATORS.map(diff => (
                                        <div key={diff} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`diff-${diff}`}
                                                checked={(data.key_differentiators || []).includes(diff)}
                                                onCheckedChange={() => handleDifferentiatorToggle(diff)}
                                            />
                                            <Label
                                                htmlFor={`diff-${diff}`}
                                                className="text-sm font-normal cursor-pointer"
                                            >
                                                {diff}
                                            </Label>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-2">
                                    <Input
                                        value={newDifferentiator}
                                        onChange={(e) => setNewDifferentiator(e.target.value)}
                                        placeholder="Add custom differentiator..."
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddCustomDifferentiator()}
                                    />
                                    <Button onClick={handleAddCustomDifferentiator} size="sm" variant="outline">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Strategic Notes */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="notes">Strategic Notes</Label>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <HelpCircle className="w-4 h-4 text-zinc-400" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="max-w-xs">Any additional GTM insights AI should know about your strategy</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <Textarea
                                    id="notes"
                                    value={data.strategic_notes || ''}
                                    onChange={(e) => onChange('strategic_notes', e.target.value)}
                                    placeholder="e.g., We're focusing on enterprise expansion in Q2, prioritizing finance vertical..."
                                    className="min-h-32"
                                    maxLength={1000}
                                />
                                <p className="text-xs text-zinc-500 dark:text-white/40">
                                    {(data.strategic_notes || '').length}/1000 characters
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </TooltipProvider>
    )
}
