'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Brain, Building2, Target, Zap, Save, FileText, Edit } from 'lucide-react'
import { useCompanyIntelligence } from '@/hooks/useCompanyIntelligence'
import { getEmptyIntelligence } from '@/types/company-intelligence'
import type { CompanyIntelligence } from '@/types/company-intelligence'
import { CompanyDNATab } from '@/components/company-intelligence/company-dna-tab'
import { GTMStrategyTab } from '@/components/company-intelligence/gtm-strategy-tab'
import { AIGuidanceRulesTab } from '@/components/company-intelligence/ai-guidance-rules-tab'

export default function CompanyIntelligencePage() {
    const { intelligence, isNew, isLoading, updateIntelligence, saveDraft, isUpdating } = useCompanyIntelligence()

    const [activeTab, setActiveTab] = useState('dna')
    const [formData, setFormData] = useState<Partial<CompanyIntelligence>>(getEmptyIntelligence())
    const [hasChanges, setHasChanges] = useState(false)
    const [isEditMode, setIsEditMode] = useState(true)

    // Initialize form data when intelligence is loaded
    useEffect(() => {
        if (intelligence) {
            setFormData(intelligence)
            // Start in view mode if data exists and is not draft
            setIsEditMode(!intelligence || intelligence.is_draft)
        } else if (isNew) {
            setFormData(getEmptyIntelligence())
            setIsEditMode(true)
        }
    }, [intelligence, isNew])

    // Auto-save draft every 30 seconds if there are changes
    useEffect(() => {
        if (!hasChanges) return

        const timer = setTimeout(() => {
            saveDraft(formData)
            setHasChanges(false)
        }, 30000) // 30 seconds

        return () => clearTimeout(timer)
    }, [formData, hasChanges, saveDraft])

    const handleFieldChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        setHasChanges(true)
    }

    const handleSaveDraft = () => {
        saveDraft(formData)
        setHasChanges(false)
    }

    const handleSave = () => {
        updateIntelligence({ ...formData, isDraft: false })
        setHasChanges(false)
        // Switch to view mode after save
        setIsEditMode(false)
    }

    const toggleEditMode = () => {
        setIsEditMode(!isEditMode)
    }

    if (isLoading) {
        return (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
                <p className="text-zinc-600 dark:text-white/70">Loading...</p>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                        <Brain className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-semibold text-zinc-900 dark:text-white">
                            Company Intelligence
                        </h1>
                        <p className="text-zinc-600 dark:text-white/60 mt-1">
                            AI's long-term memory for contextual decision-making
                        </p>
                    </div>
                </div>

                {/* Info Banner */}
                <Card className="p-4 bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/30">
                    <div className="flex items-start gap-3">
                        <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                            <p className="text-indigo-900 dark:text-indigo-200 font-medium mb-1">
                                This is how AI understands your business
                            </p>
                            <p className="text-indigo-700 dark:text-indigo-300">
                                Information you provide here will be used by AI to analyze leads, events, tasks, and recommend next actions.
                                More complete information = better AI recommendations.
                            </p>
                        </div>
                    </div>
                </Card>
            </div>



            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid grid-cols-3 w-full max-w-3xl">
                    <TabsTrigger value="dna" className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Company DNA
                    </TabsTrigger>
                    <TabsTrigger value="gtm" className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        GTM Strategy
                    </TabsTrigger>
                    <TabsTrigger value="ai-rules" className="flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        AI Guidance
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="dna" className="space-y-6">
                    <CompanyDNATab
                        data={formData}
                        onChange={handleFieldChange}
                        isEditMode={isEditMode}
                    />
                </TabsContent>

                <TabsContent value="gtm" className="space-y-6">
                    <GTMStrategyTab
                        data={formData}
                        onChange={handleFieldChange}
                        isEditMode={isEditMode}
                    />
                </TabsContent>

                <TabsContent value="ai-rules" className="space-y-6">
                    <AIGuidanceRulesTab
                        data={formData}
                        onChange={handleFieldChange}
                        isEditMode={isEditMode}
                    />
                </TabsContent>
            </Tabs>

            {/* Draft Status */}
            {formData.is_draft && (
                <Card className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30">
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                        💡 This is saved as a draft. Click "Save" to finalize and activate AI intelligence.
                    </p>
                </Card>
            )}

            {/* Save Buttons - Bottom - Conditional rendering based on isEditMode */}
            <div className="sticky bottom-8 mt-8 flex justify-end gap-3 bg-white dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-lg">
                {isEditMode ? (
                    <>
                        {hasChanges && (
                            <span className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2 mr-auto">
                                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                                Unsaved changes
                            </span>
                        )}
                        <Button
                            onClick={handleSaveDraft}
                            variant="outline"
                            disabled={isUpdating || !hasChanges}
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            Save Draft
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isUpdating}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Save
                        </Button>
                    </>
                ) : (
                    <Button
                        onClick={toggleEditMode}
                        variant="default"
                    >
                        Edit
                    </Button>
                )}
            </div>
        </div>
    )
}
