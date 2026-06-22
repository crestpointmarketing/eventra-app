'use client'

import { useState, useEffect } from 'react'
import { useCreateTask } from '@/hooks/useTasks'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
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
import { UserSelect } from '@/components/users/user-select' // Ensure this path is correct based on previous steps
import { TASK_MODULES, type TaskModuleId } from '@/lib/tasks/modules'

interface CreateTaskDialogProps {
    eventId: string
    open: boolean
    onOpenChange: (open: boolean) => void
    initialTitle?: string
    initialDescription?: string
}

export function CreateTaskDialog({ eventId, open, onOpenChange, initialTitle = '', initialDescription = '' }: CreateTaskDialogProps) {
    const { mutate: createTask, isPending } = useCreateTask()
    const [title, setTitle] = useState(initialTitle)
    const [description, setDescription] = useState(initialDescription)
    const [status, setStatus] = useState<'pending' | 'in_progress' | 'review' | 'done'>('pending')
    const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
    const [dueDate, setDueDate] = useState('')
    const [reminderAt, setReminderAt] = useState('')
    const [assignedTo, setAssignedTo] = useState<string>('')
    const [module, setModule] = useState<TaskModuleId>('strategy')

    // Reset/Sync form when dialog opens
    useEffect(() => {
        if (open) {
            setTitle(initialTitle)
            setDescription(initialDescription)
        }
    }, [open, initialTitle, initialDescription])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        createTask({
            event_id: eventId,
            title,
            description: description || undefined,
            status,
            priority,
            due_date: dueDate || undefined,
            reminder_at: reminderAt || null,
            assigned_to: assignedTo || undefined,
            module,
        }, {
            onSuccess: () => {
                onOpenChange(false)
                // Reset form
                setTitle('')
                setDescription('')
                setStatus('pending')
                setPriority('medium')
                setDueDate('')
                setReminderAt('')
                setAssignedTo('')
                setModule('strategy')
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                <DialogHeader>
                    <DialogTitle className="text-zinc-900 dark:text-white">Add New Task</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Task Title</Label>
                        <Input
                            id="title"
                            placeholder="e.g., Book catering service"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            placeholder="Add details..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Module</Label>
                        <Select value={module} onValueChange={(value) => setModule(value as TaskModuleId)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {TASK_MODULES.map((taskModule) => (
                                    <SelectItem key={taskModule.id} value={taskModule.id}>
                                        {taskModule.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
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
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="priority">Priority</Label>
                            <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="due_date">Due Date</Label>
                            <Input
                                id="due_date"
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="reminder_at">Reminder</Label>
                            <Input
                                id="reminder_at"
                                type="datetime-local"
                                value={reminderAt}
                                onChange={(e) => setReminderAt(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Assigned To</Label>
                        <UserSelect
                            value={assignedTo}
                            onValueChange={setAssignedTo}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? 'Creating...' : 'Create Task'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
