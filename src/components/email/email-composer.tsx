'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Mail,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Sparkles,
    Copy,
    Send,
    ExternalLink,
    Loader2
} from 'lucide-react'
import { useEmailRecommendation } from '@/hooks/useEmailRecommendation'
import { useEmailDraftGenerator } from '@/hooks/useEmailDraftGenerator'
import { useEmailTemplates } from '@/hooks/useEmailTemplates'
import { useSubjectLineGenerator } from '@/hooks/useSubjectLineGenerator'
import { createClient } from '@/lib/supabase/client'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

interface EmailComposerProps {
    leadId: string
    lead: any // TODO: Use proper Lead type from database
}

export function EmailComposer({ leadId, lead }: EmailComposerProps) {
    const [selectedTemplate, setSelectedTemplate] = useState<string>('')
    const [tone, setTone] = useState<string>('professional')
    const [language, setLanguage] = useState<string>('English')
    const [editableDraft, setEditableDraft] = useState<{ subject: string; body: string } | null>(null)
    const [showSubjectLineDialog, setShowSubjectLineDialog] = useState(false)

    // Fetch AI recommendation
    const { data: recommendation, isLoading: isLoadingRecommendation, error: recommendationError } = useEmailRecommendation(leadId)

    // Fetch all templates
    const { data: templates, isLoading: isLoadingTemplates } = useEmailTemplates()

    // Email draft generation
    const { mutate: generateDraft, data: draft, isPending: isGenerating, error: draftError } = useEmailDraftGenerator()

    // Subject line generation
    const { mutate: generateSubjectLines, data: subjectLinesData, isPending: isGeneratingSubjects } = useSubjectLineGenerator()

    // Sync editable draft when AI generates new draft
    if (draft && (!editableDraft || editableDraft.subject !== draft.subject)) {
        setEditableDraft({ subject: draft.subject, body: draft.body })
    }

    // Auto-select recommended template when recommendation loads
    if (recommendation?.recommendedTemplateId && !selectedTemplate) {
        setSelectedTemplate(recommendation.recommendedTemplateId)
    }

    const handleGenerateDraft = () => {
        if (!selectedTemplate) {
            alert('Please select a template first')
            return
        }

        generateDraft({
            leadId,
            templateId: selectedTemplate,
            tone,
            language,
        })
    }

    const handleCopyToClipboard = async () => {
        if (editableDraft) {
            const emailText = `Subject: ${editableDraft.subject}\n\n${editableDraft.body}`
            await navigator.clipboard.writeText(emailText)

            // Log activity
            const supabase = createClient()
            await supabase.from('lead_activities').insert({
                lead_id: leadId,
                activity_type: 'email_copied',
                activity_data: {
                    subject: editableDraft.subject,
                    body_length: editableDraft.body.length,
                }
            })

            alert('Email copied to clipboard!')
        }
    }

    const handleMarkAsSent = async () => {
        if (editableDraft) {
            // Log activity
            const supabase = createClient()
            await supabase.from('lead_activities').insert({
                lead_id: leadId,
                activity_type: 'email_sent',
                activity_data: {
                    subject: editableDraft.subject,
                    sent_to: lead.email,
                    sent_via: 'manual',
                }
            })

            // Update lead's last_contacted_at
            await supabase
                .from('leads')
                .update({ last_contacted_at: new Date().toISOString() })
                .eq('id', leadId)

            alert('Email marked as sent! Lead contact date updated.')
        }
    }

    return (
        <div className="space-y-6">
            {/* Loading State */}
            {isLoadingRecommendation && (
                <Card className="p-6">
                    <div className="flex items-center justify-center gap-3 text-zinc-500">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <p>Analyzing lead and generating recommendation...</p>
                    </div>
                </Card>
            )}

            {/* Error State */}
            {recommendationError && (
                <Card className="p-6 border-red-200 bg-red-50/30 dark:bg-red-900/10">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-medium text-red-900 dark:text-red-300">Failed to load recommendation</h3>
                            <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                                {recommendationError instanceof Error ? recommendationError.message : 'Unknown error occurred'}
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            {/* 1. Recommendation Panel */}
            {recommendation && (
                <Card className={`border-2 ${recommendation.shouldSend === 'yes'
                    ? 'border-green-100 dark:border-green-900/30 bg-green-50/30 dark:bg-green-900/10'
                    : recommendation.shouldSend === 'wait'
                        ? 'border-yellow-100 dark:border-yellow-900/30 bg-yellow-50/30 dark:bg-yellow-900/10'
                        : 'border-red-100 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/10'
                    }`}>
                    <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-lg ${recommendation.shouldSend === 'yes'
                                    ? 'bg-green-100 dark:bg-green-900/50'
                                    : recommendation.shouldSend === 'wait'
                                        ? 'bg-yellow-100 dark:bg-yellow-900/50'
                                        : 'bg-red-100 dark:bg-red-900/50'
                                    }`}>
                                    {recommendation.shouldSend === 'yes' && <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />}
                                    {recommendation.shouldSend === 'wait' && <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />}
                                    {recommendation.shouldSend === 'no' && <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
                                </div>
                                <div>
                                    <h3 className={`font-normal ${recommendation.shouldSend === 'yes'
                                        ? 'text-green-900 dark:text-green-300'
                                        : recommendation.shouldSend === 'wait'
                                            ? 'text-yellow-900 dark:text-yellow-300'
                                            : 'text-red-900 dark:text-red-300'
                                        }`}>
                                        {recommendation.shouldSend === 'yes' && 'Recommended: Send Email'}
                                        {recommendation.shouldSend === 'wait' && 'Suggested: Wait Before Sending'}
                                        {recommendation.shouldSend === 'no' && 'Not Recommended: Do Not Send'}
                                    </h3>
                                    <p className={`text-xs ${recommendation.shouldSend === 'yes'
                                        ? 'text-green-600/80 dark:text-green-400/80'
                                        : recommendation.shouldSend === 'wait'
                                            ? 'text-yellow-600/80 dark:text-yellow-400/80'
                                            : 'text-red-600/80 dark:text-red-400/80'
                                        }`}>
                                        AI analysis based on lead context and engagement history
                                    </p>
                                </div>
                            </div>
                            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                                <Sparkles className="h-3 w-3" />
                                AI Powered
                            </Badge>
                        </div>

                        <div className="space-y-3 mt-4">
                            {/* Show multiple template recommendations if available */}
                            {recommendation.recommendedTemplates && recommendation.recommendedTemplates.length > 1 ? (
                                <div>
                                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">Top Template Recommendations:</p>
                                    <Tabs defaultValue="0" className="w-full">
                                        <TabsList className="grid w-full grid-cols-3 mb-4">
                                            {recommendation.recommendedTemplates.slice(0, 3).map((template: any, index: number) => (
                                                <TabsTrigger key={index} value={index.toString()} className="text-xs">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-semibold">{index + 1}</span>
                                                        <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                                                            {template.score || 90}
                                                        </Badge>
                                                    </div>
                                                </TabsTrigger>
                                            ))}
                                        </TabsList>
                                        {recommendation.recommendedTemplates.slice(0, 3).map((template: any, index: number) => (
                                            <TabsContent key={index} value={index.toString()} className="space-y-3">
                                                <div className="p-3 bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="font-semibold text-sm text-zinc-900 dark:text-white">
                                                            {template.templateName}
                                                        </h4>
                                                        <Badge variant="outline" className="text-xs">
                                                            Score: {template.score || 90}
                                                        </Badge>
                                                    </div>
                                                    {template.goal && (
                                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                                                            Goal: {template.goal} • Tone: {template.tone}
                                                        </p>
                                                    )}
                                                    <div className="mt-2">
                                                        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Why this template?</p>
                                                        <ul className="space-y-1">
                                                            {template.reasons?.map((reason: string, rIndex: number) => (
                                                                <li key={rIndex} className="text-xs flex items-start gap-1.5 text-zinc-600 dark:text-zinc-400">
                                                                    <span className="text-green-600 dark:text-green-400 mt-0.5">•</span>
                                                                    <span>{reason}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        className="w-full mt-3 h-8"
                                                        onClick={() => {
                                                            setSelectedTemplate(template.templateId)
                                                            // Immediately generate draft with this template
                                                            generateDraft({
                                                                leadId,
                                                                templateId: template.templateId,
                                                                tone,
                                                                language,
                                                            })
                                                        }}
                                                    >
                                                        Use This Template
                                                    </Button>
                                                </div>
                                            </TabsContent>
                                        ))}
                                    </Tabs>
                                </div>
                            ) : (
                                // Fallback to single template view
                                <div>
                                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Recommended Template:</p>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                        onClick={() => {
                                            // TODO: Open template detail dialog
                                        }}
                                    >
                                        <span className="text-sm text-green-700 dark:text-green-400">{recommendation.recommendedTemplateName}</span>
                                        <ExternalLink className="h-4 w-4 text-zinc-400" />
                                    </Button>
                                </div>
                            )}

                            {/* Show reasons for single template or primary recommendation */}
                            {(!recommendation.recommendedTemplates || recommendation.recommendedTemplates.length <= 1) && recommendation.reasons && recommendation.reasons.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Reasons:</p>
                                    <ul className="space-y-1.5">
                                        {recommendation.reasons.map((reason: string, index: number) => (
                                            <li key={index} className="text-sm flex items-start gap-2 text-zinc-600 dark:text-zinc-400">
                                                <span className="text-green-600 dark:text-green-400 mt-0.5">•</span>
                                                <span>{reason}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {recommendation.riskFlags.length > 0 && (
                                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950/50 border border-yellow-200 dark:border-yellow-800/50 rounded-md">
                                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1.5 flex items-center gap-1">
                                        <AlertTriangle className="h-4 w-4" />
                                        Risk Flags
                                    </p>
                                    <ul className="space-y-1">
                                        {recommendation.riskFlags.map((flag, index) => (
                                            <li key={index} className="text-sm text-yellow-700 dark:text-yellow-300 flex items-start gap-2">
                                                <span className="mt-0.5">•</span>
                                                <span>{flag}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            )}

            {/* Draft Generation Error */}
            {draftError && (
                <Card className="p-6 border-red-200 bg-red-50/30 dark:bg-red-900/10">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-medium text-red-900 dark:text-red-300">Failed to generate draft</h3>
                            <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                                {draftError instanceof Error ? draftError.message : 'Unknown error occurred'}
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            {/* 2. Draft Builder */}
            <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Mail className="h-5 w-5 text-zinc-400" />
                    Email Draft Builder
                </h3>

                <div className="space-y-4">
                    {/* Template Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Template</label>
                        <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a template" />
                            </SelectTrigger>
                            <SelectContent>
                                {isLoadingTemplates ? (
                                    <SelectItem value="loading" disabled>
                                        Loading templates...
                                    </SelectItem>
                                ) : templates && templates.length > 0 ? (
                                    templates.map((template) => (
                                        <SelectItem key={template.id} value={template.id}>
                                            {template.name}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <SelectItem value="none" disabled>
                                        No templates available
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Tone & Language (Optional) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tone (Optional)</label>
                            <Select value={tone} onValueChange={setTone}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Professional" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="professional">Professional</SelectItem>
                                    <SelectItem value="friendly">Friendly</SelectItem>
                                    <SelectItem value="casual">Casual</SelectItem>
                                    <SelectItem value="formal">Formal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Language (Optional)</label>
                            <Select value={language} onValueChange={setLanguage}>
                                <SelectTrigger>
                                    <SelectValue placeholder="English" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="English">English</SelectItem>
                                    <SelectItem value="Spanish">Spanish</SelectItem>
                                    <SelectItem value="French">French</SelectItem>
                                    <SelectItem value="German">German</SelectItem>
                                    <SelectItem value="Chinese">Chinese</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Generate Button */}
                    <Button
                        className="w-full"
                        onClick={handleGenerateDraft}
                        disabled={!selectedTemplate || isGenerating}
                    >
                        {isGenerating ? (
                            <>
                                <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                                Generating Draft...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4 mr-2" />
                                Generate Draft
                            </>
                        )}
                    </Button>
                </div>
            </Card>

            {/* 3. Email Preview */}
            {editableDraft && (
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <Mail className="h-5 w-5 text-zinc-400" />
                            Email Preview
                        </h3>
                        <Badge variant="secondary">Draft</Badge>
                    </div>

                    <div className="space-y-4">
                        {/* Subject Line */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Subject</label>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs"
                                        onClick={() => {
                                            if (!selectedTemplate) {
                                                alert('Please select a template first')
                                                return
                                            }
                                            generateSubjectLines({
                                                leadId,
                                                templateId: selectedTemplate,
                                                emailBody: editableDraft?.body,
                                                tone,
                                                count: 3
                                            })
                                            setShowSubjectLineDialog(true)
                                        }}
                                        disabled={isGeneratingSubjects || !selectedTemplate}
                                    >
                                        {isGeneratingSubjects ? (
                                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                        ) : (
                                            <Sparkles className="h-3 w-3 mr-1" />
                                        )}
                                        Generate Options
                                    </Button>
                                    <Badge variant="outline" className="text-xs">
                                        {editableDraft?.subject?.length || 0} chars
                                    </Badge>
                                </div>
                            </div>
                            <Textarea
                                value={editableDraft?.subject || ''}
                                onChange={(e) => editableDraft && setEditableDraft({ subject: e.target.value, body: editableDraft.body })}
                                className="resize-none"
                                rows={1}
                            />
                        </div>

                        <Separator />

                        {/* Email Body */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Body</label>
                                <Badge variant="outline" className="text-xs">
                                    {editableDraft?.body?.length || 0} chars
                                </Badge>
                            </div>
                            <Textarea
                                value={editableDraft?.body || ''}
                                onChange={(e) => editableDraft && setEditableDraft({ subject: editableDraft.subject, body: e.target.value })}
                                className="resize-none font-mono text-sm"
                                rows={12}
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-4">
                            <Button
                                variant="outline"
                                onClick={handleGenerateDraft}
                                disabled={isGenerating || !selectedTemplate}
                            >
                                <Sparkles className="h-4 w-4 mr-2" />
                                Regenerate
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={handleCopyToClipboard}
                            >
                                <Copy className="h-4 w-4 mr-2" />
                                Copy to Clipboard
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={handleMarkAsSent}
                            >
                                <Send className="h-4 w-4 mr-2" />
                                Mark as Sent
                            </Button>
                        </div>

                        <p className="text-xs text-muted-foreground text-center">
                            💡 Copy the email and paste it into your email client, then mark as sent to track in timeline
                        </p>
                    </div>
                </Card>
            )}

            {/* Subject Line Selection Dialog */}
            <Dialog open={showSubjectLineDialog} onOpenChange={setShowSubjectLineDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-indigo-500" />
                            Choose a Subject Line
                        </DialogTitle>
                        <DialogDescription>
                            Select one of the AI-generated subject lines below, or close to keep your current subject.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 mt-4">
                        {isGeneratingSubjects ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                                <span className="ml-3 text-sm text-zinc-600 dark:text-zinc-400">
                                    Generating subject line options...
                                </span>
                            </div>
                        ) : subjectLinesData?.subjectLines && subjectLinesData.subjectLines.length > 0 ? (
                            subjectLinesData.subjectLines.map((subjectLine: any, index: number) => (
                                <button
                                    key={index}
                                    className="w-full p-4 text-left border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors group"
                                    onClick={() => {
                                        if (editableDraft) {
                                            setEditableDraft({
                                                subject: subjectLine.text,
                                                body: editableDraft.body
                                            })
                                        }
                                        setShowSubjectLineDialog(false)
                                    }}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <h4 className="font-medium text-sm text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                            Option {index + 1}
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs">
                                                {subjectLine.approach}
                                            </Badge>
                                            <Badge variant="secondary" className="text-xs">
                                                {subjectLine.length} chars
                                            </Badge>
                                        </div>
                                    </div>
                                    <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-1">
                                        "{subjectLine.text}"
                                    </p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        Tone: {subjectLine.tone}
                                    </p>
                                </button>
                            ))
                        ) : (
                            <div className="text-center py-8 text-sm text-zinc-500">
                                No subject lines generated yet. Click "Generate Options" to create some.
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
