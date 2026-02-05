'use client'

import { useState, useMemo, useEffect } from 'react'
import { useTasks, useDeleteTask, useArchiveTask } from '@/hooks/useTasks'
import { useEvents } from '@/hooks/useEvents'
import { createClient } from '@/lib/supabase/client'
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
import { Search, MoreHorizontal, Eye, Edit, Archive, Trash2, Plus, Sparkles, Filter, ChevronLeft, ChevronRight, User as UserIcon } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/animations/page-transition'
import { AITaskGenerator } from '@/components/ai/ai-task-generator'
import { useQueryClient } from '@tanstack/react-query'
import { formatUserShortName } from '@/lib/utils'
import type { Task } from '@/lib/api/tasks'
import { format } from 'date-fns'
import { Checkbox } from '@/components/ui/checkbox'
import { useBulkSelection } from '@/hooks/useBulkSelection'
import { BulkActionsToolbar } from '@/components/bulk-actions-toolbar'
import { exportTasksToCSV } from '@/lib/export'

type SortField = 'title' | 'due_date' | 'priority' | 'status' | null

// Helper functions (restored)
const formatDueDate = (date: string | null) => {
    if (!date) return '-'
    return format(new Date(date), 'MMM d')
}

const getStatusBadge = (status: Task['status']) => {
    const variants: Record<string, string> = {
        done: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        review: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        draft: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
        archived: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500',
    }
    return (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${variants[status] || variants.draft}`}>
            {status.replace('_', ' ')}
        </span>
    )
}

export default function TasksPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [ownerFilter, setOwnerFilter] = useState<string>('all')
    const [eventFilter, setEventFilter] = useState<string>('all')
    const debouncedSearch = useDebounce(searchQuery, 300)
    const [users, setUsers] = useState<any[]>([])

    const supabase = createClient()

    // Fetch data
    const { data: tasks, isLoading, error } = useTasks()
    const { data: events } = useEvents()

    // Fetch users for filter
    useEffect(() => {
        async function fetchUsers() {
            const { data } = await supabase.from('users').select('id, name, email')
            if (data) setUsers(data)
        }
        fetchUsers()
    }, [supabase])

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

    // Read eventId from URL parameters and set filter on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search)
            const eventIdParam = urlParams.get('eventId')
            if (eventIdParam) {
                setEventFilter(eventIdParam)
            }
        }
    }, [])

    // Find the filtered event name for display
    const filteredEvent = useMemo(() => {
        if (eventFilter === 'all' || !events) return null
        return events.find((e: any) => e.id === eventFilter)
    }, [eventFilter, events])

    // Filter and search tasks
    const filteredTasks = useMemo(() => {
        if (!tasks) return []

        return tasks.filter(task => {
            // Search filter
            const matchesSearch = task.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                task.description?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                task.events?.name.toLowerCase().includes(debouncedSearch.toLowerCase())

            // Status filter
            const matchesStatus = statusFilter === 'all' || task.status === statusFilter

            // Owner filter
            const matchesOwner = ownerFilter === 'all' || task.assigned_to === ownerFilter

            // Event filter
            const matchesEvent = eventFilter === 'all' || task.event_id === eventFilter

            return matchesSearch && matchesStatus && matchesOwner && matchesEvent
        })
    }, [tasks, debouncedSearch, statusFilter, ownerFilter, eventFilter])

    // Bulk selection
    const {
        selectedIds,
        selectedItems,
        selectedCount,
        isAllSelected,
        toggleItem,
        toggleAll,
        clearSelection
    } = useBulkSelection(filteredTasks)

    // Handle bulk export
    const handleBulkExport = () => {
        try {
            exportTasksToCSV(selectedItems)
            toast.success(`Exported ${selectedCount} task${selectedCount > 1 ? 's' : ''} to CSV`)
            clearSelection()
        } catch (error) {
            toast.error('Failed to export tasks')
        }
    }

    // Handle bulk delete
    const handleBulkDelete = () => {
        if (confirm(`Are you sure you want to delete ${selectedCount} tasks? This action cannot be undone.`)) {
            selectedItems.forEach(task => deleteTask(task.id))
            clearSelection()
        }
    }

    // Status badge variant
    const getStatusBadge = (status: Task['status']) => {
        const styles = {
            draft: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
            pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
            in_progress: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            review: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            done: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            archived: 'bg-zinc-100 text-zinc-500',
        }

        const labels = {
            draft: 'Draft',
            pending: 'Pending',
            in_progress: 'In Progress',
            review: 'Review',
            done: '✓ Done',
            archived: 'Archived'
        }

        return (
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
                {labels[status] || status}
            </span>
        )
    }

    // Format due date
    const formatDueDate = (dueDate: string | null) => {
        if (!dueDate) return <span className="text-zinc-400">-</span>
        const date = new Date(dueDate)
        return <span className="text-zinc-600 dark:text-zinc-400">{format(date, 'MMM d')}</span>
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
            <div className="container mx-auto p-8 space-y-8 bg-zinc-50/50 dark:bg-black/5 min-h-screen">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    <span>WORKSPACE</span>
                    <span>›</span>
                    <span>OPERATIONS</span>
                    <span>›</span>
                    <span className="text-zinc-900 dark:text-white font-medium">WORKVIEWS</span>
                </nav>

                {/* Header */}
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight mb-2">
                            Global Workviews
                        </h1>
                        <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl">
                            Aggregate view of tasks and deliverables across all active client events.
                        </p>
                    </div>
                    <Link href="/tasks/new">
                        <Button className="gap-2">
                            <Plus className="w-4 h-4" />
                            New Task
                        </Button>
                    </Link>
                </div>

                {/* Filters Toolbar */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    {/* Search */}
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-4 h-4" />
                        <Input
                            type="text"
                            placeholder="Search tasks by name, event, or owner..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 border-none bg-transparent shadow-none focus-visible:ring-0 h-10"
                        />
                    </div>

                    {/* Right Filters */}
                    <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                        <Select value="all">
                            <SelectTrigger className="w-[110px] h-9 text-xs border-zinc-200 bg-white dark:bg-zinc-800">
                                <SelectValue placeholder="All Dates" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Dates</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={eventFilter} onValueChange={setEventFilter}>
                            <SelectTrigger className="w-[140px] h-9 text-xs border-zinc-200 bg-white dark:bg-zinc-800">
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

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[100px] h-9 text-xs border-zinc-200 bg-white dark:bg-zinc-800">
                                <SelectValue placeholder="Stage" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Stages</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="review">Review</SelectItem>
                                <SelectItem value="done">Done</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                            <SelectTrigger className="w-[100px] h-9 text-xs border-zinc-200 bg-white dark:bg-zinc-800">
                                <SelectValue placeholder="Owner" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Owners</SelectItem>
                                {users.map(user => (
                                    <SelectItem key={user.id} value={user.id}>
                                        {user.name || user.email}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-500">
                            <Filter className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Tasks Table */}
                <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    {isLoading ? (
                        <TableLoadingSkeleton rows={8} />
                    ) : filteredTasks.length === 0 ? (
                        <div className="text-center py-24 bg-white dark:bg-zinc-900">
                            <div className="flex justify-center mb-4">
                                <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                                    <Sparkles className="w-8 h-8 text-zinc-300" />
                                </div>
                            </div>
                            <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">
                                No workviews found
                            </h3>
                            <p className="text-zinc-500 dark:text-zinc-400 mb-6">
                                Try adjusting your filters or create a new task
                            </p>
                            <Link href="/tasks/new">
                                <Button>Create New Task</Button>
                            </Link>
                        </div>
                    ) : (
                        <div>
                            <Table>
                                <TableHeader className="bg-white dark:bg-zinc-900">
                                    <TableRow className="hover:bg-transparent border-b border-zinc-100 dark:border-zinc-800">
                                        <TableHead className="w-[4%] pl-6 py-4">
                                            <Checkbox
                                                checked={isAllSelected}
                                                onCheckedChange={toggleAll}
                                                aria-label="Select all"
                                            />
                                        </TableHead>
                                        <TableHead className="w-[36%] text-xs font-bold uppercase tracking-wider text-zinc-500">Task Name</TableHead>
                                        <TableHead className="w-[20%] text-xs font-bold uppercase tracking-wider text-zinc-500">Related Event</TableHead>
                                        <TableHead className="w-[10%] text-xs font-bold uppercase tracking-wider text-zinc-500">Owner</TableHead>
                                        <TableHead className="w-[10%] text-xs font-bold uppercase tracking-wider text-zinc-500">Due Date</TableHead>
                                        <TableHead className="w-[15%] text-xs font-bold uppercase tracking-wider text-zinc-500">Status</TableHead>
                                        <TableHead className="w-[5%] text-xs font-bold uppercase tracking-wider text-zinc-500 text-center">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="bg-white dark:bg-zinc-900">
                                    {filteredTasks.map((task) => (
                                        <TableRow key={task.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-b border-zinc-50 dark:border-zinc-800/50">
                                            <TableCell className="pl-6 py-4">
                                                <Checkbox
                                                    checked={selectedIds.has(task.id)}
                                                    onCheckedChange={() => toggleItem(task.id)}
                                                    aria-label={`Select task ${task.title}`}
                                                />
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="flex flex-col gap-1">
                                                    <Link
                                                        href={`/tasks/${task.id}`}
                                                        className="font-medium text-zinc-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                    >
                                                        {task.title}
                                                    </Link>
                                                    {(task.priority === 'urgent' || task.priority === 'high') && (
                                                        <span className={`text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 ${task.priority === 'urgent' ? 'text-red-600' : 'text-orange-500'
                                                            }`}>
                                                            ● {task.priority}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Link
                                                    href={`/events/${task.event_id}`}
                                                    className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                                                >
                                                    {task.events?.name || 'Unknown Event'}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                {task.assigned_user ? (
                                                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                                        {formatUserShortName(task.assigned_user)}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-zinc-400">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-4">
                                                {formatDueDate(task.due_date)}
                                            </TableCell>
                                            <TableCell className="py-4">
                                                {getStatusBadge(task.status)}
                                            </TableCell>
                                            <TableCell className="py-4 text-center">
                                                <div className="flex justify-center">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                                                                <MoreHorizontal className="w-4 h-4" />
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
                                                            <DropdownMenuItem
                                                                onClick={() => handleDelete(task.id)}
                                                                className="text-red-600 dark:text-red-400"
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-2" />
                                                                Delete
                                                            </DropdownMenuItem>

                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {/* Pagination - Visual Only for now */}
                            <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                                <span className="text-xs text-zinc-500 font-medium">
                                    Showing {filteredTasks.length} results
                                </span>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="icon" disabled className="h-8 w-8">
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    <Button variant="outline" size="icon" disabled className="h-8 w-8">
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>

                {/* Bulk Actions Toolbar */}
                <BulkActionsToolbar
                    count={selectedCount}
                    itemType="task"
                    onExport={handleBulkExport}
                    onClear={clearSelection}
                />

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
                            <div className="space-y-6 pt-4">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Status</p>
                                        {getStatusBadge(selectedTask.status)}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Due Date</p>
                                        <p className="font-medium text-zinc-900 dark:text-white">
                                            {selectedTask.due_date ? format(new Date(selectedTask.due_date), 'MMMM d, yyyy') : 'No date set'}
                                        </p>
                                    </div>
                                </div>

                                {selectedTask.description && (
                                    <div>
                                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Description</p>
                                        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                                            {selectedTask.description}
                                        </p>
                                    </div>
                                )}

                                <div className="flex gap-3 justify-end pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                    <Button variant="outline" onClick={() => setIsQuickViewOpen(false)}>
                                        Close
                                    </Button>
                                    <Link href={`/tasks/${selectedTask.id}`}>
                                        <Button>View Full Details</Button>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* AI Floating Button */}
                <motion.button
                    onClick={() => setIsAIDialogOpen(true)}
                    className="fixed bottom-8 right-8 z-50 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-full p-4 flex items-center gap-2 group shadow-xl border border-zinc-200 dark:border-zinc-700 hover:shadow-2xl transition-all"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#CBFB45] to-[#a3e635] flex items-center justify-center text-zinc-900">
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <span className="font-semibold pr-2">AI TASKS</span>
                </motion.button>

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
                                                setIsAIDialogOpen(false)
                                                setSelectedEventId(null)
                                                queryClient.invalidateQueries({ queryKey: ['tasks'] })
                                                toast.success('Tasks created successfully!')
                                            }}
                                        />
                                    </div>
                                ) : null
                            })()}
                        </div>
                    </DialogContent>
                </Dialog>
            </div >
        </PageTransition >
    )
}
