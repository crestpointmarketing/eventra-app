'use client'

import { useState, useMemo } from 'react'
import { useTasks, useDeleteTask, useArchiveTask } from '@/hooks/useTasks'
import { useEvents } from '@/hooks/useEvents'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import Link from 'next/link'
import { TableLoadingSkeleton } from '@/components/ui/loading-skeletons'
import { useDebounce } from '@/hooks/useDebounce'
import { Search, MoreVertical, Eye, Edit, Archive, Trash2, Plus, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/animations/page-transition'
import { AITaskGenerator } from '@/components/ai/ai-task-generator'
import { useQueryClient } from '@tanstack/react-query'
import type { Task } from '@/lib/api/tasks'
import { format } from 'date-fns'

type SortField = 'title' | 'due_date' | 'priority' | 'status' | null

export default function TasksPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [priorityFilter, setPriorityFilter] = useState<string>('all')
    const [eventFilter, setEventFilter] = useState<string>('all')
    const debouncedSearch = useDebounce(searchQuery, 300)

    // Fetch data
    const { data: tasks, isLoading, error } = useTasks()
    const { data: events } = useEvents()

    // Mutations
    const { mutate: deleteTask } = useDeleteTask()
    const { mutate: archiveTask } = useArchiveTask()

    // State for quick view dialog
    const [selectedTask, setSelectedTask] = useState<Task | null>(null)
    const [isQuickViewOpen, setIsQuickViewOpen] = useState(false)

    // State for AI task generation dialog
    const [isAIDialogOpen, setIsAIDialogOpen] = useState(false)
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

    // Query client for cache invalidation
    const queryClient = useQueryClient()

    // Filter and search tasks
    const filteredTasks = useMemo(() => {
        if (!tasks) return []

        return tasks.filter(task => {
            // Search filter
            const matchesSearch = task.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                task.description?.toLowerCase().includes(debouncedSearch.toLowerCase())

            // Status filter
            const matchesStatus = statusFilter === 'all' || task.status === statusFilter

            // Priority filter
            const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter

            // Event filter
            const matchesEvent = eventFilter === 'all' || task.event_id === eventFilter

            return matchesSearch && matchesStatus && matchesPriority && matchesEvent
        })
    }, [tasks, debouncedSearch, statusFilter, priorityFilter, eventFilter])

    // Status badge variant
    const getStatusVariant = (status: Task['status']) => {
        switch (status) {
            case 'done': return 'outline'
            case 'in_progress': return 'default'
            case 'review': return 'secondary'
            case 'pending': return 'secondary'
            case 'archived': return 'outline'
            default: return 'secondary'
        }
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

    // Format due date with overdue check
    const formatDueDate = (dueDate: string | null) => {
        if (!dueDate) return <span className="text-zinc-400">No due date</span>

        const date = new Date(dueDate)
        const today = new Date()
        const isOverdue = date < today

        return (
            <span className={isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-zinc-700 dark:text-zinc-300'}>
                {format(date, 'MMM d, yyyy')}
                {isOverdue && ' (Overdue)'}
            </span>
        )
    }

    // Handle quick view
    const handleQuickView = (task: Task) => {
        setSelectedTask(task)
        setIsQuickViewOpen(true)
    }

    // Handle delete
    const handleDelete = (taskId: string) => {
        if (confirm('Are you sure you want to delete this task?')) {
            deleteTask(taskId)
        }
    }

    // Handle archive
    const handleArchive = (taskId: string) => {
        archiveTask(taskId)
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                        Error loading tasks
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-400">{error.message}</p>
                </div>
            </div>
        )
    }

    return (
        <PageTransition>
            <div className="container mx-auto p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-5xl font-medium text-zinc-900 dark:text-white">Tasks</h1>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-2">
                            Manage and track all your event tasks
                        </p>
                    </div>
                    <Link href="/tasks/new">
                        <Button size="lg" className="gap-2">
                            <Plus className="w-4 h-4" />
                            New Task
                        </Button>
                    </Link>
                </div>

                {/* Filters */}
                <Card className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-4 h-4" />
                            <Input
                                type="text"
                                placeholder="Search tasks..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* Event Filter */}
                        <Select value={eventFilter} onValueChange={setEventFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="All Events" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Events</SelectItem>
                                {events?.map(event => (
                                    <SelectItem key={event.id} value={event.id}>
                                        {event.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Status Filter */}
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="review">Review</SelectItem>
                                <SelectItem value="done">Done</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Priority Filter */}
                        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="All Priorities" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Priorities</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </Card>

                {/* Tasks Table */}
                <Card>
                    {isLoading ? (
                        <TableLoadingSkeleton rows={6} />
                    ) : filteredTasks.length === 0 ? (
                        <div className="text-center py-12">
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                                No tasks found
                            </h3>
                            <p className="text-zinc-500 dark:text-zinc-400">
                                {tasks?.length === 0 ? 'Create your first task to get started' : 'Try adjusting your filters'}
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Task Name</TableHead>
                                    <TableHead>Related Event</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTasks.map((task) => (
                                    <TableRow key={task.id}>
                                        <TableCell>
                                            <Link
                                                href={`/tasks/${task.id}`}
                                                className="font-medium text-zinc-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                            >
                                                {task.title}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Link
                                                href={`/events/${task.event_id}`}
                                                className="text-blue-600 dark:text-blue-400 hover:underline"
                                            >
                                                {task.events?.name || 'Unknown Event'}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{formatDueDate(task.due_date)}</TableCell>
                                        <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusVariant(task.status)}>
                                                {task.status.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleQuickView(task)}>
                                                        <Eye className="w-4 h-4 mr-2" />
                                                        Quick View
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/tasks/${task.id}`}>
                                                            <Edit className="w-4 h-4 mr-2" />
                                                            Edit
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handleArchive(task.id)}>
                                                        <Archive className="w-4 h-4 mr-2" />
                                                        Archive
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(task.id)}
                                                        className="text-red-600 dark:text-red-400"
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </Card>

                {/* Quick View Dialog */}
                <Dialog open={isQuickViewOpen} onOpenChange={setIsQuickViewOpen}>
                    <DialogContent className="max-w-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                        <DialogHeader>
                            <DialogTitle className="text-zinc-900 dark:text-white">{selectedTask?.title}</DialogTitle>
                            <DialogDescription className="text-zinc-600 dark:text-zinc-400">
                                {selectedTask?.events?.name}
                            </DialogDescription>
                        </DialogHeader>
                        {selectedTask && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Priority</p>
                                        <div className="mt-1">{getPriorityBadge(selectedTask.priority)}</div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Status</p>
                                        <div className="mt-1">
                                            <Badge variant={getStatusVariant(selectedTask.status)}>
                                                {selectedTask.status.replace('_', ' ')}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Due Date</p>
                                        <p className="mt-1 text-zinc-900 dark:text-white">
                                            {formatDueDate(selectedTask.due_date)}
                                        </p>
                                    </div>
                                    {selectedTask.estimated_cost && (
                                        <div>
                                            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Budget</p>
                                            <p className="mt-1 text-zinc-900 dark:text-white">
                                                ${selectedTask.estimated_cost.toLocaleString()}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                {selectedTask.description && (
                                    <div>
                                        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Description</p>
                                        <p className="mt-1 text-zinc-700 dark:text-zinc-300">
                                            {selectedTask.description}
                                        </p>
                                    </div>
                                )}
                                <div className="flex gap-2 pt-4">
                                    <Link href={`/tasks/${selectedTask.id}`} className="flex-1">
                                        <Button className="w-full">View Full Details</Button>
                                    </Link>
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsQuickViewOpen(false)}
                                    >
                                        Close
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* AI Task Generation Dialog */}
                <Dialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-2 border-zinc-200 dark:border-zinc-700">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-zinc-900 dark:text-white">
                                <Sparkles className="w-5 h-5 text-purple-600" />
                                Generate AI Tasks
                            </DialogTitle>
                            <DialogDescription className="text-zinc-600 dark:text-zinc-300">
                                Select an event to generate intelligent task suggestions with AI
                            </DialogDescription>
                        </DialogHeader>

                        {/* Event Selector */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block text-zinc-900 dark:text-white">
                                    Choose Event
                                </label>
                                <Select
                                    value={selectedEventId || undefined}
                                    onValueChange={setSelectedEventId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an event to generate tasks for..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {events && events.length > 0 ? (
                                            events.map((event) => (
                                                <SelectItem key={event.id} value={event.id}>
                                                    {event.name || 'Untitled Event'}
                                                    {event.start_date && ` (${format(new Date(event.start_date), 'MMM d, yyyy')})`}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="none" disabled>
                                                No events available
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* AI Task Generator */}
                            {selectedEventId && (() => {
                                const selectedEvent = events?.find(e => e.id === selectedEventId)
                                return selectedEvent ? (
                                    <div className="mt-4">
                                        <AITaskGenerator
                                            eventId={selectedEventId}
                                            eventDate={selectedEvent.start_date || undefined}
                                            onTasksCreated={() => {
                                                // Close dialog and refresh tasks
                                                setIsAIDialogOpen(false)
                                                setSelectedEventId(null)
                                                queryClient.invalidateQueries({ queryKey: ['tasks'] })
                                                toast.success('Tasks created successfully!')
                                            }}
                                        />
                                    </div>
                                ) : null
                            })()}

                            {/* No Event Selected State */}
                            {!selectedEventId && (
                                <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                                    <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p className="dark:text-white">Select an event above to start generating tasks</p>
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Floating Action Button */}
                <motion.button
                    onClick={() => setIsAIDialogOpen(true)}
                    className="fixed bottom-8 right-8 z-50 text-white rounded-full p-4 flex items-center gap-2 group border-4 border-white/20"
                    style={{
                        background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #6366f1 100%)',
                        boxShadow: '0 10px 40px rgba(168, 85, 247, 0.6), 0 0 20px rgba(168, 85, 247, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)'
                    }}
                    whileHover={{
                        scale: 1.1,
                        boxShadow: '0 15px 50px rgba(168, 85, 247, 0.8), 0 0 30px rgba(168, 85, 247, 0.6), inset 0 1px 0 rgba(255,255,255,0.3)'
                    }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <Sparkles className="w-6 h-6 drop-shadow-lg" />
                    <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap font-semibold drop-shadow-lg">
                        AI Tasks
                    </span>
                    <Plus className="w-6 h-6 drop-shadow-lg" />
                </motion.button>
            </div>
        </PageTransition>
    )
}
