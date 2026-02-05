'use client'

import { useState } from 'react'
import { X, Edit, Copy, Trash2 } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useEmailTemplate, useDuplicateEmailTemplate, useDeleteEmailTemplate } from '@/hooks/useEmailTemplates'
import { EmailPreview } from './email-preview'
import type { EmailTemplateWithDetails } from '@/types/email-templates'

interface TemplateDetailDialogProps {
    templateId: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onEdit?: (templateId: string) => void
}

export function TemplateDetailDialog({
    templateId,
    open,
    onOpenChange,
    onEdit,
}: TemplateDetailDialogProps) {
    const { data: template, isLoading } = useEmailTemplate(templateId || undefined)
    const duplicateMutation = useDuplicateEmailTemplate()
    const deleteMutation = useDeleteEmailTemplate()
    const [activeTab, setActiveTab] = useState<'details' | 'preview'>('preview')

    const handleDuplicate = () => {
        if (!template) return
        duplicateMutation.mutate(
            {
                templateId: template.id,
                newName: `${template.name} (Copy)`,
            },
            {
                onSuccess: () => {
                    onOpenChange(false)
                },
            }
        )
    }

    const handleDelete = () => {
        if (!template) return
        if (confirm('Are you sure you want to delete this template?')) {
            deleteMutation.mutate(template.id, {
                onSuccess: () => {
                    onOpenChange(false)
                },
            })
        }
    }

    const handleEdit = () => {
        if (template && onEdit) {
            onEdit(template.id)
            onOpenChange(false)
        }
    }

    if (!open || !templateId) return null

    const getCategoryLabel = (category: string) => {
        switch (category) {
            case 'follow_up':
                return 'Follow-up'
            case 'warm_up':
                return 'Warm-up'
            case 'product_info':
                return 'Product/Service'
            default:
                return category
        }
    }

    const getGoalLabel = (goal: string) => {
        switch (goal) {
            case 'book_meeting':
                return 'Book Meeting'
            case 'share_info':
                return 'Share Info'
            case 'reengage':
                return 'Re-engage'
            case 'qualify':
                return 'Qualify'
            default:
                return goal
        }
    }

    const getBlockTypeLabel = (type: string) => {
        switch (type) {
            case 'opening':
                return 'Opening'
            case 'event_context':
                return 'Event Context'
            case 'value_prop':
                return 'Value Proposition'
            case 'proof':
                return 'Proof/Social Proof'
            case 'cta':
                return 'Call to Action'
            case 'signature':
                return 'Signature'
            default:
                return type
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl">{template?.name || 'Loading...'}</DialogTitle>
                    <DialogDescription>
                        {template && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary">
                                        {getCategoryLabel(template.category)}
                                    </Badge>
                                    {template.is_system && (
                                        <Badge variant="outline">System</Badge>
                                    )}
                                    <Badge variant="outline" className="capitalize">
                                        {template.status}
                                    </Badge>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDuplicate}
                                        className="flex items-center"
                                    >
                                        <Copy className="h-4 w-4 mr-2" />
                                        Duplicate
                                    </Button>
                                    {!template.is_system && (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleEdit}
                                                className="flex items-center"
                                            >
                                                <Edit className="h-4 w-4 mr-2" />
                                                Edit
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleDelete}
                                                className="flex items-center text-destructive hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="py-8 text-center text-muted-foreground">
                        Loading template details...
                    </div>
                ) : template ? (
                    <div className="space-y-6">
                        {/* Tabs */}
                        <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-700">
                            <button
                                onClick={() => setActiveTab('preview')}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'preview'
                                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                📧 Email Preview
                            </button>
                            <button
                                onClick={() => setActiveTab('details')}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details'
                                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                📋 Template Details
                            </button>
                        </div>

                        {/* Preview Tab */}
                        {activeTab === 'preview' && (
                            <EmailPreview template={template} />
                        )}

                        {/* Details Tab */}
                        {activeTab === 'details' && (
                            <div className="space-y-6">
                                {/* Metadata */}
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Goal:</span>
                                        <span className="ml-2 font-medium">{getGoalLabel(template.goal)}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Tone:</span>
                                        <span className="ml-2 font-medium capitalize">{template.tone}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Language:</span>
                                        <span className="ml-2 font-medium uppercase">{template.language}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Max Words:</span>
                                        <span className="ml-2 font-medium">{template.max_words || 'N/A'}</span>
                                    </div>
                                    {template.personas.length > 0 && (
                                        <div className="col-span-2">
                                            <span className="text-muted-foreground">Personas:</span>
                                            <span className="ml-2 font-medium">{template.personas.join(', ')}</span>
                                        </div>
                                    )}
                                    <div className="col-span-2">
                                        <span className="text-muted-foreground">Usage:</span>
                                        <span className="ml-2 font-medium">{template.usage_count} times</span>
                                        <span className="ml-4 text-muted-foreground">Version:</span>
                                        <span className="ml-2 font-medium">v{template.version}</span>
                                    </div>
                                </div>

                                {template.notes && (
                                    <>
                                        <Separator />
                                        <div>
                                            <h3 className="text-sm font-semibold mb-2">Notes</h3>
                                            <p className="text-sm text-muted-foreground">{template.notes}</p>
                                        </div>
                                    </>
                                )}

                                {/* Subject Lines */}
                                <Separator />
                                <div>
                                    <h3 className="text-sm font-semibold mb-3">Subject Lines ({template.subjects.length})</h3>
                                    <div className="space-y-2">
                                        {template.subjects.map((subject, index) => (
                                            <div
                                                key={subject.id}
                                                className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg"
                                            >
                                                <span className="text-xs font-medium text-muted-foreground mt-0.5">
                                                    #{index + 1}
                                                </span>
                                                <div className="flex-1">
                                                    <p className="text-sm">{subject.subject}</p>
                                                </div>
                                                {!subject.is_active && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        Inactive
                                                    </Badge>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Content Blocks */}
                                <Separator />
                                <div>
                                    <h3 className="text-sm font-semibold mb-3">Content Blocks ({template.blocks.length})</h3>
                                    <div className="space-y-4">
                                        {template.blocks.map((block, index) => (
                                            <div
                                                key={block.id}
                                                className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg space-y-3"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-medium text-muted-foreground">
                                                            Block {index + 1}
                                                        </span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {getBlockTypeLabel(block.block_type)}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                {block.content && (
                                                    <div>
                                                        <p className="text-xs text-muted-foreground mb-1">Content:</p>
                                                        <p className="text-sm whitespace-pre-wrap">{block.content}</p>
                                                    </div>
                                                )}

                                                {block.ai_guidance && (
                                                    <div>
                                                        <p className="text-xs text-muted-foreground mb-1">AI Guidance:</p>
                                                        <p className="text-sm text-blue-600 dark:text-blue-400 italic">
                                                            {block.ai_guidance}
                                                        </p>
                                                    </div>
                                                )}

                                                {block.allowed_vars.length > 0 && (
                                                    <div>
                                                        <p className="text-xs text-muted-foreground mb-1">Allowed Variables:</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {block.allowed_vars.map((variable) => (
                                                                <code
                                                                    key={variable}
                                                                    className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded"
                                                                >
                                                                    {`{{${variable}}}`}
                                                                </code>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* CTA */}
                                {template.cta && (
                                    <>
                                        <Separator />
                                        <div>
                                            <h3 className="text-sm font-semibold mb-3">Call to Action</h3>
                                            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg space-y-2">
                                                <div>
                                                    <span className="text-xs text-muted-foreground">Type:</span>
                                                    <span className="ml-2 text-sm font-medium capitalize">
                                                        {template.cta.cta_type.replace('_', ' ')}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-muted-foreground">Text:</span>
                                                    <span className="ml-2 text-sm font-medium">{template.cta.cta_text}</span>
                                                </div>
                                                {template.cta.cta_url && (
                                                    <div>
                                                        <span className="text-xs text-muted-foreground">URL:</span>
                                                        <span className="ml-2 text-sm font-medium">{template.cta.cta_url}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Guardrails */}
                                {template.forbidden_claims.length > 0 && (
                                    <>
                                        <Separator />
                                        <div>
                                            <h3 className="text-sm font-semibold mb-3">Forbidden Claims</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {template.forbidden_claims.map((claim, index) => (
                                                    <Badge key={index} variant="destructive" className="text-xs">
                                                        {claim}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-8 text-center text-muted-foreground">
                        Template not found
                    </div>
                )}
            </DialogContent>
        </Dialog >
    )
}
