'use client'

import { useState } from 'react'
import { useEventTasks, useUpdateTask } from '@/hooks/useTasks'
import { CreateTaskDialog } from '@/components/tasks/create-task-dialog'
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
    Calendar,
    AlertCircle,
    CheckCircle2,
    Circle,
    User as UserIcon,
    Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

import { TaskDependencyViewer } from '@/components/ai/task-dependency-viewer'

interface EventTasksTabProps {
    eventId: string
}

export function EventTasksTab({ eventId }: EventTasksTabProps) {
    const { data: tasks, isLoading, error } = useEventTasks(eventId)
    const { mutate: updateTask } = useUpdateTask()
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

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

    const handleToggleDone = (taskId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'done' ? 'pending' : 'done'
        updateTask({
            taskId,
            updates: {
                status: newStatus as any,
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-white">Preparation Checklist</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage tasks and requirements for this event</p>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Task
                </Button>
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
                                        <p className={cn(
                                            "font-medium text-zinc-900 dark:text-white truncate",
                                            task.status === 'done' && "line-through text-zinc-500 dark:text-zinc-500"
                                        )}>
                                            {task.title}
                                        </p>
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
                                            <DropdownMenuItem>Edit Task</DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 mt-3">
                                    <Badge variant="secondary" className={cn("text-xs font-normal", getPriorityColor(task.priority))}>
                                        {task.priority}
                                    </Badge>

                                    {task.due_date && (
                                        <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>{format(new Date(task.due_date), 'MMM d, yyyy')}</span>
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
