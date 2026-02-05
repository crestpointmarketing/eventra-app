'use client'

import { useState } from 'react'
import { Plus, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useEmailTemplates } from '@/hooks/useEmailTemplates'
import { EmailTemplateCard } from '@/components/email-templates/email-template-card'
import { CreateTemplateDialog } from '@/components/email-templates/create-template-dialog'
import { EditTemplateDialog } from '@/components/email-templates/edit-template-dialog'
import { TemplateDetailDialog } from '@/components/email-templates/template-detail-dialog'
import type { EmailTemplateFilters } from '@/types/email-templates'

export default function EmailTemplatesPage() {
    const [filters, setFilters] = useState<EmailTemplateFilters>({})
    const [search, setSearch] = useState('')
    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
    const [editTemplateId, setEditTemplateId] = useState<string | null>(null)

    const { data: templates, isLoading } = useEmailTemplates({
        ...filters,
        search: search || undefined,
    })

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b bg-white px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Email Templates</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Manage AI-powered email templates for lead outreach
                        </p>
                    </div>
                    <Button onClick={() => setShowCreateDialog(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Template
                    </Button>
                </div>

                {/* Filters */}
                <div className="mt-4 flex items-center gap-3">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search templates..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    {/* Category Filter */}
                    <Select
                        value={filters.category || 'all'}
                        onValueChange={(value) =>
                            setFilters((prev) => ({
                                ...prev,
                                category: value === 'all' ? undefined : (value as any),
                            }))
                        }
                    >
                        <SelectTrigger className="w-[180px]">
                            <Filter className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            <SelectItem value="follow_up">Follow-up</SelectItem>
                            <SelectItem value="warm_up">Warm-up</SelectItem>
                            <SelectItem value="product_info">Product/Service</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Goal Filter */}
                    <Select
                        value={filters.goal || 'all'}
                        onValueChange={(value) =>
                            setFilters((prev) => ({
                                ...prev,
                                goal: value === 'all' ? undefined : (value as any),
                            }))
                        }
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Goal" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Goals</SelectItem>
                            <SelectItem value="book_meeting">Book Meeting</SelectItem>
                            <SelectItem value="share_info">Share Info</SelectItem>
                            <SelectItem value="reengage">Re-engage</SelectItem>
                            <SelectItem value="qualify">Qualify</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Status Filter */}
                    <Select
                        value={filters.status || 'all'}
                        onValueChange={(value) =>
                            setFilters((prev) => ({
                                ...prev,
                                status: value === 'all' ? undefined : (value as any),
                            }))
                        }
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="disabled">Disabled</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* System/User Filter */}
                    <Select
                        value={
                            filters.is_system === undefined
                                ? 'all'
                                : filters.is_system
                                    ? 'system'
                                    : 'user'
                        }
                        onValueChange={(value) =>
                            setFilters((prev) => ({
                                ...prev,
                                is_system:
                                    value === 'all' ? undefined : value === 'system',
                            }))
                        }
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Templates</SelectItem>
                            <SelectItem value="system">System Templates</SelectItem>
                            <SelectItem value="user">My Templates</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-muted-foreground">Loading templates...</div>
                    </div>
                ) : templates && templates.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {templates.map((template) => (
                            <EmailTemplateCard
                                key={template.id}
                                template={template}
                                onViewDetails={setSelectedTemplateId}
                                onEdit={setEditTemplateId}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <p className="text-muted-foreground mb-4">
                            {search || Object.keys(filters).length > 0
                                ? 'No templates match your filters'
                                : 'No templates yet'}
                        </p>
                        {!search && Object.keys(filters).length === 0 && (
                            <Button onClick={() => setShowCreateDialog(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Create Your First Template
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Create Dialog */}
            <CreateTemplateDialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
            />

            {/* Edit Dialog */}
            <EditTemplateDialog
                templateId={editTemplateId}
                open={!!editTemplateId}
                onOpenChange={(open) => !open && setEditTemplateId(null)}
            />

            {/* Detail Dialog */}
            <TemplateDetailDialog
                templateId={selectedTemplateId}
                open={!!selectedTemplateId}
                onOpenChange={(open) => !open && setSelectedTemplateId(null)}
                onEdit={(id) => {
                    setEditTemplateId(id)
                    setSelectedTemplateId(null)
                }}
            />
        </div>
    )
}
