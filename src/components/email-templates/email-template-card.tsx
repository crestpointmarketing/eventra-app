'use client'

import { useState } from 'react'
import { Copy, Edit, Trash2, MoreVertical, Eye, Power } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    useDuplicateEmailTemplate,
    useDeleteEmailTemplate,
    useUpdateTemplateStatus,
} from '@/hooks/useEmailTemplates'
import type { EmailTemplate } from '@/types/email-templates'

interface EmailTemplateCardProps {
    template: EmailTemplate
    onViewDetails?: (templateId: string) => void
    onEdit?: (templateId: string) => void
}

export function EmailTemplateCard({ template, onViewDetails, onEdit }: EmailTemplateCardProps) {
    const duplicateMutation = useDuplicateEmailTemplate()
    const deleteMutation = useDeleteEmailTemplate()
    const updateStatusMutation = useUpdateTemplateStatus()

    const handleViewDetails = () => {
        if (onViewDetails) {
            onViewDetails(template.id)
        }
    }

    const handleEdit = () => {
        if (onEdit) {
            onEdit(template.id)
        }
    }

    const handleDuplicate = () => {
        duplicateMutation.mutate({
            templateId: template.id,
            newName: `${template.name} (Copy)`,
        })
    }

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this template?')) {
            deleteMutation.mutate(template.id)
        }
    }

    const handleToggleStatus = () => {
        const newStatus = template.status === 'active' ? 'disabled' : 'active'
        updateStatusMutation.mutate({ id: template.id, status: newStatus })
    }

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'follow_up':
                return 'bg-blue-100 text-blue-700'
            case 'warm_up':
                return 'bg-green-100 text-green-700'
            case 'product_info':
                return 'bg-purple-100 text-purple-700'
            default:
                return 'bg-gray-100 text-gray-700'
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

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <Badge className={getCategoryColor(template.category)} variant="secondary">
                                {getCategoryLabel(template.category)}
                            </Badge>
                            {template.is_system && (
                                <Badge variant="outline" className="text-xs">
                                    System
                                </Badge>
                            )}
                            {template.status === 'disabled' && (
                                <Badge variant="secondary" className="text-xs">
                                    Disabled
                                </Badge>
                            )}
                        </div>
                        <h3 className="font-semibold text-lg leading-tight">{template.name}</h3>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleViewDetails}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleDuplicate}>
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicate
                            </DropdownMenuItem>
                            {!template.is_system && (
                                <>
                                    <DropdownMenuItem onClick={handleEdit}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleToggleStatus}>
                                        <Power className="mr-2 h-4 w-4" />
                                        {template.status === 'active' ? 'Disable' : 'Enable'}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={handleDelete}
                                        className="text-destructive"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>

            <CardContent className="pb-3">
                <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Goal:</span>
                        <span className="font-medium">{getGoalLabel(template.goal)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Tone:</span>
                        <span className="font-medium capitalize">{template.tone}</span>
                    </div>
                    {template.personas.length > 0 && (
                        <div className="flex items-start justify-between">
                            <span className="text-muted-foreground">Personas:</span>
                            <span className="font-medium text-right">
                                {template.personas.join(', ')}
                            </span>
                        </div>
                    )}
                    {template.max_words && (
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Max words:</span>
                            <span className="font-medium">{template.max_words}</span>
                        </div>
                    )}
                </div>

                {template.notes && (
                    <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
                        {template.notes}
                    </p>
                )}
            </CardContent>

            <CardFooter className="pt-3 border-t">
                <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
                    <span>Used {template.usage_count} times</span>
                    <span>v{template.version}</span>
                </div>
            </CardFooter>
        </Card>
    )
}
