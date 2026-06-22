'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { useDeleteTask, useEventTasks, useUpdateTask } from '@/hooks/useTasks'
import { CreateTaskDialog } from '@/components/tasks/create-task-dialog'
import { createClient } from '@/lib/supabase/client'
import { seedDefaultEventTasks } from '@/lib/events/default-tasks'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Plus,
    MoreVertical,
    Bell,
    Calendar,
    CheckCircle2,
    User as UserIcon,
    Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDateOnly } from '@/lib/date-only'
import type { Task } from '@/lib/api/tasks'
import { getTaskModule } from '@/lib/tasks/modules'

import { TaskDependencyViewer } from '@/components/ai/task-dependency-viewer'

interface EventTasksTabProps {
    eventId: string
}

export function EventTasksTab({ eventId }: EventTasksTabProps) {
    const queryClient = useQueryClient()
    const { data: tasks, isLoading, error } = useEventTasks(eventId)
    const { mutate: updateTask } = useUpdateTask()
    const { mutate: deleteTask } = useDeleteTask()
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [isSeeding, setIsSeeding] = useState(false)

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-8 text-center text-red-500">
                Failed to load tasks. Please try again.
            </div>
        )
    }

    const handleToggleDone = (taskId: string, currentStatus: Task['status']) => {
        const newStatus: Task['status'] = currentStatus === 'done' ? 'pending' : 'done'
        updateTask({
            taskId,
            updates: {
                status: newStatus,
                completed_at: newStatus === 'done' ? new Date().toISOString() : null
            }
        })
    }

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'text-red-600 bg-red-100 dark:bg-red-900/30'
            case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30'
            case 'medium': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30'
            default: return 'text-zinc-600 bg-zinc-100 dark:bg-zinc-800'
        }
    }

    const handleDeleteTask = (task: Task) => {
        if (confirm(`Delete "${task.title}"?`)) deleteTask(task.id)
    }

    async function handleGenerateStarterTasks() {
        setIsSeeding(true)
        try {
            const supabase = createClient()
            const { data: event, error: eventError } = await supabase
                .from('events')
                .select('start_date')
                .eq('id', eventId)
                .single()
            if (eventError) throw eventError

            const count = await seedDefaultEventTasks(supabase, eventId, event?.start_date)
            await queryClient.invalidateQueries({ queryKey: ['tasks', 'event', eventId] })
            await queryClient.invalidateQueries({ queryKey: ['tasks'] })
            toast.success(count > 0 ? `${count} starter tasks created` : 'Starter tasks already exist')
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to create starter tasks')
        } finally {
            setIsSeeding(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-white">Preparation Checklist</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage tasks and requirements for this event</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button variant="outline" onClick={handleGenerateStarterTasks} disabled={isSeeding}>
                        {isSeeding ? 'Syncing...' : 'Sync Starter Tasks'}
                    </Button>
                    <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add Task
                    </Button>
                </div>
            </div>

            {/* Dependency Analysis */}
            {tasks && (
                <TaskDependencyViewer eventId={eventId} tasks={tasks} />
            )}

            <div className="space-y-3">
                {tasks?.length === 0 ? (
                    <Card className="p-12 border-dashed border-2 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-6 h-6 text-zinc-400" />
                        </div>
                        <h4 className="text-zinc-900 dark:text-white font-medium mb-1">No tasks yet</h4>
                        <p className="text-zinc-500 dark:text-zinc-400 mb-4 text-sm max-w-sm">
                            Create a checklist of items needed for this event to keep track of your progress.
                        </p>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(true)}>
                            Create First Task
                        </Button>
                    </Card>
                ) : (
                    tasks?.map((task) => (
                        <Card key={task.id} className="p-4 flex items-start gap-4 hover:shadow-sm transition-shadow">
                            <Checkbox
                                checked={task.status === 'done'}
                                onCheckedChange={() => handleToggleDone(task.id, task.status)}
                                className="mt-1"
                            />

                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                            <Link
                                                href={`/tasks/${task.id}`}
                                                className={cn(
                                            "font-medium text-zinc-900 dark:text-white truncate",
                                                    task.status === 'done' && "line-through text-zinc-500 dark:text-zinc-500"
                                                )}
                                            >
                                                {task.title}
                                            </Link>
                                        {task.description && (
                                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                                                {task.description}
                                            </p>
                                        )}
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem asChild>
                                                <Link href={`/tasks/${task.id}`}>Edit Task</Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteTask(task)}>
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 mt-3">
                                    <Badge variant="outline" className="text-xs font-normal">
                                        {getTaskModule(task.module).shortLabel}
                                    </Badge>
                                    <Badge variant="secondary" className={cn("text-xs font-normal", getPriorityColor(task.priority))}>
                                        {task.priority}
                                    </Badge>

                                    {task.due_date && (
                                        <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>{formatDateOnly(task.due_date)}</span>
                                        </div>
                                    )}

                                    {task.reminder_at && (
                                        <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                                            <Bell className="w-3.5 h-3.5" />
                                            <span>{new Date(task.reminder_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                                        </div>
                                    )}

                                    {task.assigned_user ? (
                                        <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400" title={task.assigned_user.email}>
                                            <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold">
                                                {(task.assigned_user.email[0] || '?').toUpperCase()}
                                            </div>
                                            <span className="max-w-[100px] truncate">{task.assigned_user.email}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 text-xs text-zinc-400">
                                            <UserIcon className="w-3.5 h-3.5" />
                                            <span>Unassigned</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            <CreateTaskDialog
                eventId={eventId}
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
            />
        </div>
    )
}
