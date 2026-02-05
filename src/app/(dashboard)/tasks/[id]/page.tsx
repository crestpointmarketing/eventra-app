'use client'

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTask, useUpdateTask, useMarkTaskAsDone } from '@/hooks/useTasks'
import { useTaskChecklist, useCreateChecklistItem, useToggleChecklistItem, useDeleteChecklistItem } from '@/hooks/useTaskChecklist'
import { useTaskCollaborators, useAddCollaborator, useRemoveCollaborator } from '@/hooks/useTaskCollaborators'
import { useAssets, useUploadAsset, useDeleteAsset } from '@/hooks/useAssets'
import { useEvents } from '@/hooks/useEvents'
import { useUser } from '@/hooks/useUser'
import { useUsers } from '@/hooks/useUsers'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TableLoadingSkeleton } from '@/components/ui/loading-skeletons'
import { ArrowLeft, Calendar, Check, Plus, Trash2, Users, FileText, DollarSign, Paperclip, Upload, File, Image as ImageIcon, Video } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import Link from 'next/link'
import { PageTransition } from '@/components/animations/page-transition'
import type { Task } from '@/lib/api/tasks'

export default function TaskDetailPage() {
    const params = useParams()
    const router = useRouter()
    const taskId = params?.id as string

    // Fetch data
    const { data: task, isLoading } = useTask(taskId)
    const { data: checklist } = useTaskChecklist(taskId)
    const { data: collaborators } = useTaskCollaborators(taskId)
    const { data: assets } = useAssets({ taskId })
    const { data: events } = useEvents()
    const { data: user } = useUser()
    const { data: users } = useUsers()

    // Mutations
    const { mutate: updateTask } = useUpdateTask()
    const { mutate: markAsDone } = useMarkTaskAsDone()
    const { mutate: createChecklistItem } = useCreateChecklistItem()
    const { mutate: toggleChecklistItem } = useToggleChecklistItem()
    const { mutate: deleteChecklistItem } = useDeleteChecklistItem()
    const { mutate: addCollaborator } = useAddCollaborator()
    const { mutate: removeCollaborator } = useRemoveCollaborator()
    const { mutate: uploadAsset, isPending: isUploading } = useUploadAsset()
    const { mutate: deleteAsset } = useDeleteAsset()

    // Local state for editing
    const [editedTitle, setEditedTitle] = useState('')
    const [editedDescription, setEditedDescription] = useState('')
    const [editedDueDate, setEditedDueDate] = useState('')
    const [editedPriority, setEditedPriority] = useState<Task['priority']>('medium')
    const [editedEventId, setEditedEventId] = useState('')
    const [editedVendor, setEditedVendor] = useState('')
    const [editedContact, setEditedContact] = useState('')
    const [newChecklistItem, setNewChecklistItem] = useState('')
    const [editedEstimatedCost, setEditedEstimatedCost] = useState('')
    const [editedActualCost, setEditedActualCost] = useState('')
    const [newCollaboratorUserId, setNewCollaboratorUserId] = useState('')
    const [newCollaboratorRole, setNewCollaboratorRole] = useState('')
    const [editedPaymentStatus, setEditedPaymentStatus] = useState<'unpaid' | 'partial' | 'paid' | null>(null)
    const [isDragging, setIsDragging] = useState(false)

    // Initialize local state when task loads
    useState(() => {
        if (task) {
            setEditedTitle(task.title)
            setEditedDescription(task.description || '')
            setEditedDueDate(task.due_date || '')
            setEditedPriority(task.priority)
            setEditedEventId(task.event_id)
            setEditedVendor(task.vendor_company || '')
            setEditedContact(task.contact_person || '')
            setEditedEstimatedCost(task.estimated_cost?.toString() || '')
            setEditedActualCost(task.actual_cost?.toString() || '')
            setEditedPaymentStatus(task.payment_status)
        }
    })

    // Auto-save when fields change
    const handleFieldUpdate = (field: keyof Task, value: any) => {
        updateTask({
            taskId,
            updates: { [field]: value }
        })
    }

    // Handle checklist item creation
    const handleAddChecklistItem = () => {
        if (!newChecklistItem.trim()) return

        createChecklistItem({
            task_id: taskId,
            title: newChecklistItem
        })
        setNewChecklistItem('')
    }

    // File upload handlers
    const handleFileSelect = useCallback((files: FileList | null) => {
        if (!files) return

        Array.from(files).forEach(file => {
            const fileType = file.type.startsWith('image/') ? 'image' :
                file.type.startsWith('video/') ? 'video' : 'document'

            uploadAsset({
                file,
                userId: user?.id || 'anonymous', // Use 'anonymous' if no user
                taskId: taskId
            })
        })
    }, [uploadAsset, taskId, user])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        handleFileSelect(e.dataTransfer.files)
    }, [handleFileSelect])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    // Calculate budget variance
    const budgetVariance = task && task.estimated_cost && task.actual_cost
        ? task.actual_cost - task.estimated_cost
        : null

    const budgetUtilization = task && task.estimated_cost && task.actual_cost
        ? (task.actual_cost / task.estimated_cost) * 100
        : null

    // Get file icon
    const getFileIcon = (fileType: string) => {
        if (fileType === 'image') return <ImageIcon className="w-4 h-4" />
        if (fileType === 'video') return <Video className="w-4 h-4" />
        return <File className="w-4 h-4" />
    }

    // Priority badge styling
    const getPriorityBadge = (priority: Task['priority']) => {
        switch (priority) {
            case 'urgent':
                return <Badge className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">URGENT</Badge>
            case 'high':
                return <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">High</Badge>
            case 'medium':
                return <Badge variant="secondary">Medium</Badge>
            case 'low':
                return <Badge variant="outline">Low</Badge>
        }
    }

    // Status badge variant
    const getStatusVariant = (status: Task['status']) => {
        switch (status) {
            case 'done': return 'outline'
            case 'in_progress': return 'default'
            case 'review': return 'secondary'
            default: return 'secondary'
        }
    }

    if (isLoading) {
        return (
            <div className="container mx-auto p-6">
                <TableLoadingSkeleton rows={10} />
            </div>
        )
    }

    if (!task) {
        return (
            <div className="container mx-auto p-6">
                <Card className="p-12 text-center">
                    <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-2">
                        Task not found
                    </h2>
                    <p className="text-zinc-500 dark:text-zinc-400 mb-4">
                        The task you're looking for doesn't exist or you don't have access to it.
                    </p>
                    <Link href="/tasks">
                        <Button>Back to Tasks</Button>
                    </Link>
                </Card>
            </div>
        )
    }

    return (
        <PageTransition>
            <div className="container mx-auto p-6">
                {/* Header */}
                <div className="mb-6">
                    <Link href="/tasks" className="inline-flex items-center text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white mb-4">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Tasks
                    </Link>

                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <Input
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                onBlur={() => handleFieldUpdate('title', editedTitle)}
                                className="text-3xl font-semibold border-0 px-0 focus-visible:ring-0 bg-transparent"
                                placeholder="Task Title"
                            />
                            <div className="flex items-center gap-3 mt-2">
                                {getPriorityBadge(task.priority)}
                                <Badge variant={getStatusVariant(task.status)}>
                                    {task.status.replace('_', ' ')}
                                </Badge>
                                <Link href={`/events/${task.event_id}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                                    {task.events?.name}
                                </Link>
                            </div>
                        </div>
                        <Button onClick={() => markAsDone(taskId)} disabled={task.status === 'done'}>
                            <Check className="w-4 h-4 mr-2" />
                            {task.status === 'done' ? 'Completed' : 'Mark as Done'}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2">
                        <Tabs defaultValue="overview" className="space-y-6">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="overview">
                                    <FileText className="w-4 h-4 mr-2" />
                                    Overview
                                </TabsTrigger>
                                <TabsTrigger value="people">
                                    <Users className="w-4 h-4 mr-2" />
                                    People
                                </TabsTrigger>
                                <TabsTrigger value="budget">
                                    <DollarSign className="w-4 h-4 mr-2" />
                                    Budget
                                </TabsTrigger>
                                <TabsTrigger value="assets">
                                    <Paperclip className="w-4 h-4 mr-2" />
                                    Assets
                                </TabsTrigger>
                            </TabsList>

                            {/* OVERVIEW TAB */}
                            <TabsContent value="overview" className="space-y-6">
                                {/* Basic Info Card */}
                                <Card className="p-6 space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Event Selection */}
                                        <div>
                                            <Label>Related Event</Label>
                                            <Select
                                                value={editedEventId}
                                                onValueChange={(value) => {
                                                    setEditedEventId(value)
                                                    handleFieldUpdate('event_id', value)
                                                }}
                                            >
                                                <SelectTrigger className="mt-1">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {events?.map(event => (
                                                        <SelectItem key={event.id} value={event.id}>
                                                            {event.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Due Date */}
                                        <div>
                                            <Label>Due Date</Label>
                                            <Input
                                                type="date"
                                                value={editedDueDate}
                                                onChange={(e) => setEditedDueDate(e.target.value)}
                                                onBlur={() => handleFieldUpdate('due_date', editedDueDate)}
                                                className="mt-1"
                                            />
                                        </div>
                                    </div>

                                    {/* Priority Selection */}
                                    <div>
                                        <Label>Priority</Label>
                                        <div className="flex gap-2 mt-2">
                                            {(['low', 'medium', 'high', 'urgent'] as const).map(priority => (
                                                <Button
                                                    key={priority}
                                                    variant={editedPriority === priority ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditedPriority(priority)
                                                        handleFieldUpdate('priority', priority)
                                                    }}
                                                >
                                                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <Label>Description</Label>
                                        <Textarea
                                            value={editedDescription}
                                            onChange={(e) => setEditedDescription(e.target.value)}
                                            onBlur={() => handleFieldUpdate('description', editedDescription)}
                                            placeholder="Add task description..."
                                            className="mt-1 min-h-[120px]"
                                        />
                                    </div>
                                </Card>

                                {/* Checklist Card */}
                                <Card className="p-6">
                                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                                        Checklist
                                    </h3>

                                    <div className="space-y-2 mb-4">
                                        {checklist?.map(item => (
                                            <div key={item.id} className="flex items-center gap-3 p-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800">
                                                <Checkbox
                                                    checked={item.is_completed}
                                                    onCheckedChange={(checked) =>
                                                        toggleChecklistItem({
                                                            itemId: item.id,
                                                            isCompleted: checked as boolean
                                                        })
                                                    }
                                                />
                                                <span className={`flex-1 ${item.is_completed ? 'line-through text-zinc-400' : 'text-zinc-900 dark:text-white'}`}>
                                                    {item.title}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => deleteChecklistItem(item.id)}
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-600" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add new item */}
                                    <div className="flex gap-2">
                                        <Input
                                            value={newChecklistItem}
                                            onChange={(e) => setNewChecklistItem(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                                            placeholder="Add checklist item..."
                                        />
                                        <Button onClick={handleAddChecklistItem}>
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </Card>
                            </TabsContent>

                            {/* PEOPLE TAB */}
                            <TabsContent value="people" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Owner Card */}
                                <Card className="p-6">
                                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                                        Task Owner
                                    </h3>
                                    <div>
                                        <Label>Assigned To</Label>
                                        <Select
                                            value={task.assigned_to || 'unassigned'}
                                            onValueChange={(value) => {
                                                handleFieldUpdate('assigned_to', value === 'unassigned' ? null : value)
                                            }}
                                        >
                                            <SelectTrigger className="mt-1">
                                                <SelectValue placeholder="Select owner" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="unassigned">
                                                    <span className="text-zinc-500">No owner assigned</span>
                                                </SelectItem>
                                                {users?.map(user => (
                                                    <SelectItem key={user.id} value={user.id}>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{user.name || user.email}</span>
                                                            {user.name && (
                                                                <span className="text-xs text-zinc-500">{user.email}</span>
                                                            )}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                            Select the person responsible for this task
                                        </p>
                                    </div>
                                </Card>

                                {/* External Contact Card */}
                                <Card className="p-6 space-y-4">
                                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                        External Contact
                                    </h3>
                                    <div>
                                        <Label>Vendor/Company</Label>
                                        <Input
                                            value={editedVendor}
                                            onChange={(e) => setEditedVendor(e.target.value)}
                                            onBlur={() => handleFieldUpdate('vendor_company', editedVendor)}
                                            placeholder="e.g., Grand Conference Center"
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label>Point of Contact</Label>
                                        <Input
                                            value={editedContact}
                                            onChange={(e) => setEditedContact(e.target.value)}
                                            onBlur={() => handleFieldUpdate('contact_person', editedContact)}
                                            placeholder="e.g., John Smith"
                                            className="mt-1"
                                        />
                                    </div>
                                </Card>

                                {/* Collaborators Card */}
                                <Card className="p-6 md:col-span-2">
                                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                                        Internal Team
                                    </h3>

                                    {/* Add Collaborator Form */}
                                    <div className="mb-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <Label className="text-xs">Team Member</Label>
                                                <Select
                                                    value={newCollaboratorUserId}
                                                    onValueChange={(value) => {
                                                        setNewCollaboratorUserId(value)
                                                    }}
                                                >
                                                    <SelectTrigger className="mt-1">
                                                        <SelectValue placeholder="Select member" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {users?.map(user => (
                                                            <SelectItem key={user.id} value={user.id}>
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium text-sm">{user.name || user.email}</span>
                                                                    {user.name && (
                                                                        <span className="text-xs text-zinc-500">{user.email}</span>
                                                                    )}
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label className="text-xs">Role (optional)</Label>
                                                <Input
                                                    value={newCollaboratorRole}
                                                    onChange={(e) => setNewCollaboratorRole(e.target.value)}
                                                    placeholder="e.g., Designer, Developer"
                                                    className="mt-1"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-end">
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    if (!newCollaboratorUserId) {
                                                        toast.error('Please select a team member')
                                                        return
                                                    }
                                                    addCollaborator({
                                                        task_id: taskId,
                                                        user_id: newCollaboratorUserId,
                                                        role: newCollaboratorRole || 'member'
                                                    })
                                                    // Reset form
                                                    setNewCollaboratorUserId('')
                                                    setNewCollaboratorRole('')
                                                }}
                                            >
                                                <Plus className="w-4 h-4 mr-1" />
                                                Add Member
                                            </Button>
                                        </div>
                                        <p className="text-xs text-zinc-500">
                                            Select a team member and optionally specify their role
                                        </p>
                                    </div>

                                    {/* Collaborators List */}
                                    <div className="space-y-2">
                                        {collaborators?.map(collab => (
                                            <div key={collab.id} className="flex items-center justify-between p-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800">
                                                <div>
                                                    <p className="text-zinc-900 dark:text-white">{collab.user?.email}</p>
                                                    <p className="text-sm text-zinc-500">{collab.role}</p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeCollaborator(collab.id)}
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-600" />
                                                </Button>
                                            </div>
                                        ))}
                                        {collaborators?.length === 0 && (
                                            <p className="text-zinc-500 dark:text-zinc-400">No collaborators added yet</p>
                                        )}
                                    </div>
                                </Card>
                            </TabsContent>

                            {/* BUDGET TAB */}
                            <TabsContent value="budget" className="space-y-6">
                                {/* Cost Inputs Card */}
                                <Card className="p-6 space-y-6">
                                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                        Cost Tracking
                                    </h3>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label>Estimated Cost</Label>
                                            <div className="relative mt-1">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                                                <Input
                                                    type="number"
                                                    value={editedEstimatedCost}
                                                    onChange={(e) => setEditedEstimatedCost(e.target.value)}
                                                    onBlur={() => handleFieldUpdate('estimated_cost', parseFloat(editedEstimatedCost) || null)}
                                                    placeholder="0.00"
                                                    className="pl-8"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <Label>Actual Cost</Label>
                                            <div className="relative mt-1">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                                                <Input
                                                    type="number"
                                                    value={editedActualCost}
                                                    onChange={(e) => setEditedActualCost(e.target.value)}
                                                    onBlur={() => handleFieldUpdate('actual_cost', parseFloat(editedActualCost) || null)}
                                                    placeholder="0.00"
                                                    className="pl-8"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Variance */}
                                    {budgetVariance !== null && (
                                        <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Variance</span>
                                                <span className={`text-lg font-semibold ${budgetVariance > 0
                                                    ? 'text-red-600 dark:text-red-400'
                                                    : 'text-green-600 dark:text-green-400'
                                                    }`}>
                                                    {budgetVariance > 0 ? '+' : ''}
                                                    ${budgetVariance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            {budgetVariance > 0 && (
                                                <p className="text-xs text-red-600 dark:text-red-400 mt-1">Over budget</p>
                                            )}
                                            {budgetVariance < 0 && (
                                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">Under budget</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Budget Utilization */}
                                    {budgetUtilization !== null && (
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <Label>Budget Utilization</Label>
                                                <span className="text-sm font-medium text-zinc-900 dark:text-white">
                                                    {budgetUtilization.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${budgetUtilization > 100
                                                        ? 'bg-red-500'
                                                        : budgetUtilization > 90
                                                            ? 'bg-orange-500'
                                                            : 'bg-green-500'
                                                        }`}
                                                    style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Payment Status */}
                                    <div>
                                        <Label>Payment Status</Label>
                                        <Select
                                            value={editedPaymentStatus || 'unpaid'}
                                            onValueChange={(value) => {
                                                setEditedPaymentStatus(value as any)
                                                handleFieldUpdate('payment_status', value)
                                            }}
                                        >
                                            <SelectTrigger className="mt-1">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="unpaid">Unpaid</SelectItem>
                                                <SelectItem value="partial">Partial</SelectItem>
                                                <SelectItem value="paid">Paid</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </Card>
                            </TabsContent>

                            {/* ASSETS TAB */}
                            <TabsContent value="assets" className="space-y-6">
                                {/* Upload Card */}
                                <Card className="p-6">
                                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                                        Upload Assets
                                    </h3>

                                    <div
                                        onDrop={handleDrop}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                                            : 'border-zinc-300 dark:border-zinc-700'
                                            }`}
                                    >
                                        <Upload className="w-12 h-12 mx-auto mb-4 text-zinc-400" />
                                        <p className="text-zinc-900 dark:text-white font-medium mb-1">
                                            {isDragging ? 'Drop files here' : 'Drag and drop files here'}
                                        </p>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                                            or click to browse
                                        </p>
                                        <input
                                            type="file"
                                            multiple
                                            onChange={(e) => handleFileSelect(e.target.files)}
                                            className="hidden"
                                            id="file-upload"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={isUploading}
                                            asChild
                                        >
                                            <label htmlFor="file-upload" className="cursor-pointer">
                                                {isUploading ? 'Uploading...' : 'Browse Files'}
                                            </label>
                                        </Button>
                                    </div>
                                </Card>

                                {/* Linked Assets Card */}
                                <Card className="p-6">
                                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                                        Linked Assets ({assets?.length || 0})
                                    </h3>

                                    {assets && assets.length > 0 ? (
                                        <div className="space-y-2">
                                            {assets.map(asset => (
                                                <div key={asset.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                                                    <div className="flex items-center gap-3">
                                                        {getFileIcon(asset.file_type)}
                                                        <div>
                                                            <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                                                {asset.filename}
                                                            </p>
                                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                                {asset.file_size ? `${(asset.file_size / 1024).toFixed(1)} KB` : 'Unknown size'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            asChild
                                                        >
                                                            <a href={asset.file_url} target="_blank" rel="noopener noreferrer">
                                                                View
                                                            </a>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => deleteAsset(asset.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4 text-red-600" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                                            No assets uploaded yet
                                        </p>
                                    )}
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Status Card */}
                        <Card className="p-6">
                            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">
                                Status
                            </h3>
                            <Select
                                value={task.status}
                                onValueChange={(value) => handleFieldUpdate('status', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="review">Review</SelectItem>
                                    <SelectItem value="done">Done</SelectItem>
                                </SelectContent>
                            </Select>
                        </Card>

                        {/* Activity/Audit Log Card */}
                        <Card className="p-6">
                            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">
                                Activity Log
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <p className="text-zinc-600 dark:text-zinc-400">Created</p>
                                    <p className="text-zinc-900 dark:text-white">
                                        {format(new Date(task.created_at), 'MMM d, yyyy')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-zinc-600 dark:text-zinc-400">Last Updated</p>
                                    <p className="text-zinc-900 dark:text-white">
                                        {format(new Date(task.updated_at), 'MMM d, yyyy')}
                                    </p>
                                </div>
                                {task.completed_at && (
                                    <div>
                                        <p className="text-zinc-600 dark:text-zinc-400">Completed</p>
                                        <p className="text-zinc-900 dark:text-white">
                                            {format(new Date(task.completed_at), 'MMM d, yyyy')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </PageTransition>
    )
}
