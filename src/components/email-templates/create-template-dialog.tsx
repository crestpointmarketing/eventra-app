'use client'

import { useState } from 'react'
import { Plus, X, Trash2 } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useCreateEmailTemplate } from '@/hooks/useEmailTemplates'
import { VariableSelector } from './variable-selector'
import type { CreateEmailTemplateInput } from '@/types/email-templates'

interface CreateTemplateDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CreateTemplateDialog({
    open,
    onOpenChange,
}: CreateTemplateDialogProps) {
    const createMutation = useCreateEmailTemplate()
    const [formData, setFormData] = useState<Partial<CreateEmailTemplateInput>>({
        name: '',
        category: 'follow_up',
        goal: 'book_meeting',
        tone: 'professional',
        language: 'en',
        status: 'disabled',
        personas: [],
        max_words: 150,
        forbidden_claims: [],
        notes: '',
        subjects: [{ sort_order: 1, subject: '', is_active: true }],
        blocks: [
            { block_type: 'opening', sort_order: 1, content: '', allowed_vars: [], ai_guidance: '' },
        ],
        cta: { cta_type: 'reply', cta_text: 'Reply to this email', cta_url: '' },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        createMutation.mutate(formData as CreateEmailTemplateInput, {
            onSuccess: () => {
                onOpenChange(false)
                // Reset form
                setFormData({
                    name: '',
                    category: 'follow_up',
                    goal: 'book_meeting',
                    tone: 'professional',
                    language: 'en',
                    status: 'disabled',
                    personas: [],
                    max_words: 150,
                    forbidden_claims: [],
                    notes: '',
                    subjects: [{ sort_order: 1, subject: '', is_active: true }],
                    blocks: [
                        { block_type: 'opening', sort_order: 1, content: '', allowed_vars: [], ai_guidance: '' },
                    ],
                    cta: { cta_type: 'reply', cta_text: 'Reply to this email', cta_url: '' },
                })
            },
        })
    }

    // Subject line management
    const addSubject = () => {
        setFormData((prev) => ({
            ...prev,
            subjects: [
                ...(prev.subjects || []),
                {
                    sort_order: (prev.subjects?.length || 0) + 1,
                    subject: '',
                    is_active: true,
                },
            ],
        }))
    }

    const removeSubject = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            subjects: prev.subjects?.filter((_, i) => i !== index),
        }))
    }

    const updateSubject = (index: number, value: string) => {
        setFormData((prev) => ({
            ...prev,
            subjects: prev.subjects?.map((s, i) =>
                i === index ? { ...s, subject: value } : s
            ),
        }))
    }

    // Block management
    const addBlock = () => {
        setFormData((prev) => ({
            ...prev,
            blocks: [
                ...(prev.blocks || []),
                {
                    block_type: 'opening',
                    sort_order: (prev.blocks?.length || 0) + 1,
                    content: '',
                    allowed_vars: [],
                    ai_guidance: '',
                },
            ],
        }))
    }

    const removeBlock = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            blocks: prev.blocks?.filter((_, i) => i !== index),
        }))
    }

    const updateBlock = (index: number, field: string, value: any) => {
        setFormData((prev) => ({
            ...prev,
            blocks: prev.blocks?.map((b, i) =>
                i === index ? { ...b, [field]: value } : b
            ),
        }))
    }

    const updateBlockVariable = (blockIndex: number, variables: string) => {
        const varsArray = variables
            .split(',')
            .map((v) => v.trim())
            .filter((v) => v)
        updateBlock(blockIndex, 'allowed_vars', varsArray)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create Email Template</DialogTitle>
                    <DialogDescription>
                        Create a new email template with AI-powered content blocks and guardrails
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="name">Template Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                                }
                                placeholder="e.g., Post-Event Follow-up"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="category">Category *</Label>
                                <Select
                                    value={formData.category}
                                    onValueChange={(value: any) =>
                                        setFormData((prev) => ({ ...prev, category: value }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="follow_up">Follow-up</SelectItem>
                                        <SelectItem value="warm_up">Warm-up</SelectItem>
                                        <SelectItem value="product_info">Product/Service</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="goal">Goal *</Label>
                                <Select
                                    value={formData.goal}
                                    onValueChange={(value: any) =>
                                        setFormData((prev) => ({ ...prev, goal: value }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="book_meeting">Book Meeting</SelectItem>
                                        <SelectItem value="share_info">Share Info</SelectItem>
                                        <SelectItem value="reengage">Re-engage</SelectItem>
                                        <SelectItem value="qualify">Qualify</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="tone">Tone</Label>
                                <Select
                                    value={formData.tone}
                                    onValueChange={(value: any) =>
                                        setFormData((prev) => ({ ...prev, tone: value }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="professional">Professional</SelectItem>
                                        <SelectItem value="friendly">Friendly</SelectItem>
                                        <SelectItem value="concise">Concise</SelectItem>
                                        <SelectItem value="technical">Technical</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="max_words">Max Words</Label>
                                <Input
                                    id="max_words"
                                    type="number"
                                    value={formData.max_words || ''}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            max_words: parseInt(e.target.value) || undefined,
                                        }))
                                    }
                                    placeholder="150"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                value={formData.notes || ''}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                                }
                                placeholder="Internal notes about this template..."
                                rows={2}
                            />
                        </div>
                    </div>

                    <Separator />

                    {/* Subject Lines */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Subject Lines *</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addSubject}
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Subject
                            </Button>
                        </div>
                        {formData.subjects?.map((subject, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <Input
                                    value={subject.subject}
                                    onChange={(e) => updateSubject(index, e.target.value)}
                                    placeholder={`Subject line ${index + 1}`}
                                    required
                                />
                                {formData.subjects && formData.subjects.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeSubject(index)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>

                    <Separator />

                    {/* Content Blocks */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>Content Blocks *</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addBlock}>
                                <Plus className="h-4 w-4 mr-1" />
                                Add Block
                            </Button>
                        </div>
                        {formData.blocks?.map((block, index) => (
                            <div
                                key={index}
                                className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg space-y-3"
                            >
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs text-muted-foreground">
                                        Block {index + 1}
                                    </Label>
                                    {formData.blocks && formData.blocks.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeBlock(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>

                                <div>
                                    <Label className="text-xs">Block Type</Label>
                                    <Select
                                        value={block.block_type}
                                        onValueChange={(value: any) =>
                                            updateBlock(index, 'block_type', value)
                                        }
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="opening">Opening</SelectItem>
                                            <SelectItem value="event_context">Event Context</SelectItem>
                                            <SelectItem value="value_prop">Value Proposition</SelectItem>
                                            <SelectItem value="proof">Proof/Social Proof</SelectItem>
                                            <SelectItem value="cta">Call to Action</SelectItem>
                                            <SelectItem value="signature">Signature</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label className="text-xs">Content Template</Label>
                                    <Textarea
                                        value={block.content}
                                        onChange={(e) => updateBlock(index, 'content', e.target.value)}
                                        placeholder="e.g., Hi {{lead_name}}, great meeting you at {{event_name}}..."
                                        rows={3}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label className="text-xs">AI Guidance (optional)</Label>
                                    <Textarea
                                        value={block.ai_guidance || ''}
                                        onChange={(e) =>
                                            updateBlock(index, 'ai_guidance', e.target.value)
                                        }
                                        placeholder="e.g., Reference specific conversation topic. Keep under 30 words."
                                        rows={2}
                                        className="mt-1"
                                    />
                                </div>

                                <VariableSelector
                                    selectedVariables={block.allowed_vars}
                                    onChange={(vars) => updateBlock(index, 'allowed_vars', vars)}
                                    label="Allowed Variables"
                                />
                            </div>
                        ))}
                    </div>

                    <Separator />

                    {/* CTA */}
                    <div className="space-y-3">
                        <Label>Call to Action</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs">CTA Type</Label>
                                <Select
                                    value={formData.cta?.cta_type}
                                    onValueChange={(value: any) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            cta: { ...prev.cta!, cta_type: value },
                                        }))
                                    }
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="book_call">Book Call</SelectItem>
                                        <SelectItem value="reply">Reply</SelectItem>
                                        <SelectItem value="download">Download</SelectItem>
                                        <SelectItem value="visit_page">Visit Page</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="text-xs">CTA Text</Label>
                                <Input
                                    value={formData.cta?.cta_text || ''}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            cta: { ...prev.cta!, cta_text: e.target.value },
                                        }))
                                    }
                                    placeholder="e.g., Book a 15-min call"
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        {formData.cta?.cta_type !== 'reply' && (
                            <div>
                                <Label className="text-xs">CTA URL</Label>
                                <Input
                                    value={formData.cta?.cta_url || ''}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            cta: { ...prev.cta!, cta_url: e.target.value },
                                        }))
                                    }
                                    placeholder="https://..."
                                    className="mt-1"
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending}>
                            {createMutation.isPending ? 'Creating...' : 'Create Template'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
