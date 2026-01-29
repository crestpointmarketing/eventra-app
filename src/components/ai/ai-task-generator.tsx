// AI Task Generator Component
// Interactive UI for generating and managing AI task suggestions

'use client'

import { useState } from 'react'
import { useGenerateTasks, type SuggestedTask } from '@/hooks/useAI'
import { useCreateTask } from '@/hooks/useTasks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Brain, Sparkles, RefreshCcw, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { format, addDays } from 'date-fns'

interface AITaskGeneratorProps {
    eventId: string
    eventDate?: string
    onTasksCreated?: () => void
}

export function AITaskGenerator({ eventId, eventDate, onTasksCreated }: AITaskGeneratorProps) {
    const [suggestedTasks, setSuggestedTasks] = useState<SuggestedTask[]>([])
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set())
    const [isGenerating, setIsGenerating] = useState(false)
    const [isCreating, setIsCreating] = useState(false)

    const generateTasks = useGenerateTasks()
    const createTask = useCreateTask()

    // Handle task generation
    const handleGenerate = async () => {
        setIsGenerating(true)
        setSuggestedTasks([])
        setSelectedTaskIds(new Set())

        try {
            const result = await generateTasks.mutateAsync({ eventId })
            setSuggestedTasks(result.tasks)
            setSelectedTaskIds(new Set(result.tasks.map((_, idx) => idx)))
        } catch (error) {
            console.error('Failed to generate tasks:', error)
        } finally {
            setIsGenerating(false)
        }
    }

    const toggleTask = (index: number) => {
        const newSelection = new Set(selectedTaskIds)
        if (newSelection.has(index)) {
            newSelection.delete(index)
        } else {
            newSelection.add(index)
        }
        setSelectedTaskIds(newSelection)
    }

    const toggleAll = () => {
        if (selectedTaskIds.size === suggestedTasks.length) {
            setSelectedTaskIds(new Set())
        } else {
            setSelectedTaskIds(new Set(suggestedTasks.map((_, idx) => idx)))
        }
    }

    const calculateDueDate = (daysBeforeEvent: number): string | undefined => {
        if (!eventDate) return undefined
        const eventDateObj = new Date(eventDate)
        const dueDate = addDays(eventDateObj, daysBeforeEvent)
        return dueDate.toISOString().split('T')[0]
    }

    const handleCreateTasks = async () => {
        const tasksToCreate = Array.from(selectedTaskIds)
            .map(idx => suggestedTasks[idx])
            .filter(Boolean)

        if (tasksToCreate.length === 0) {
            toast.error('Please select at least one task')
            return
        }

        setIsCreating(true)

        try {
            let successCount = 0
            for (const task of tasksToCreate) {
                await createTask.mutateAsync({
                    event_id: eventId,
                    title: task.title,
                    description: task.description,
                    priority: task.priority,
                    due_date: calculateDueDate(task.estimated_days_before_event),
                    estimated_cost: task.estimated_cost,
                    status: 'pending',
                })
                successCount++
            }

            toast.success(`Created ${successCount} task${successCount > 1 ? 's' : ''} successfully`)
            setSuggestedTasks([])
            setSelectedTaskIds(new Set())
            onTasksCreated?.()
        } catch (error) {
            console.error('Failed to create tasks:', error)
            toast.error('Some tasks failed to create')
        } finally {
            setIsCreating(false)
        }
    }

    const getPriorityBadge = (priority: string) => {
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

    return (
        <Card className="border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 mb-6">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <CardTitle className="text-lg text-zinc-900 dark:text-white">AI Task Assistant</CardTitle>
                    </div>
                    <Button
                        onClick={handleGenerate}
                        disabled={isGenerating || !eventDate}
                        size="sm"
                        className="gap-2"
                    >
                        {isGenerating ? (
                            <>
                                <RefreshCcw className="h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                Generate Tasks
                            </>
                        )}
                    </Button>
                </div>
                <CardDescription className="text-zinc-600 dark:text-zinc-300">
                    {!eventDate
                        ? 'Set an event date to generate AI task suggestions'
                        : 'Let AI generate a comprehensive task checklist for your event'}
                </CardDescription>
            </CardHeader>

            {suggestedTasks.length > 0 && (
                <CardContent>
                    <div className="flex items-center justify-between mb-4 pb-4 border-b">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                checked={selectedTaskIds.size === suggestedTasks.length}
                                onCheckedChange={toggleAll}
                                aria-label="Select all"
                            />
                            <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                {selectedTaskIds.size} of {suggestedTasks.length} selected
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleGenerate}
                                disabled={isGenerating}
                            >
                                <RefreshCcw className="w-4 h-4 mr-2" />
                                Regenerate
                            </Button>
                            <Button
                                onClick={handleCreateTasks}
                                disabled={selectedTaskIds.size === 0 || isCreating}
                                size="sm"
                                className="gap-2"
                            >
                                {isCreating ? (
                                    <>
                                        <RefreshCcw className="w-4 h-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Create Selected
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <AnimatePresence>
                            {suggestedTasks.map((task, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ delay: index * 0.03 }}
                                    className={`border rounded-lg p-4 transition-colors ${selectedTaskIds.has(index)
                                        ? 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/20'
                                        : 'border-zinc-200 dark:border-zinc-800'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <Checkbox
                                            checked={selectedTaskIds.has(index)}
                                            onCheckedChange={() => toggleTask(index)}
                                            className="mt-1"
                                        />
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <h4 className="font-medium text-zinc-900 dark:text-white">
                                                        {task.title}
                                                    </h4>
                                                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                                                        {task.description}
                                                    </p>
                                                </div>
                                                {getPriorityBadge(task.priority)}
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
                                                {task.category && (
                                                    <span className="flex items-center gap-1">
                                                        📁 {task.category}
                                                    </span>
                                                )}
                                                <span>
                                                    📅 {Math.abs(task.estimated_days_before_event)} days before event
                                                    {eventDate && calculateDueDate(task.estimated_days_before_event) && (
                                                        <> ({format(new Date(calculateDueDate(task.estimated_days_before_event)!), 'MMM d, yyyy')})</>
                                                    )}
                                                </span>
                                                {task.estimated_cost && (
                                                    <span>💰 ${task.estimated_cost.toLocaleString()}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </CardContent>
            )}
        </Card>
    )
}
