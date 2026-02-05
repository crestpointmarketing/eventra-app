'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAnalyzeDependencies, type TaskDependency } from '@/hooks/useAI'
import { Loader2, Network, CheckCircle2, Clock, Lock, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Task } from '@/lib/api/tasks'

interface TaskDependencyViewerProps {
    eventId: string
    tasks: Task[]
}

export function TaskDependencyViewer({ eventId, tasks }: TaskDependencyViewerProps) {
    const [showDependencies, setShowDependencies] = useState(false)
    const { mutate: analyzeDependencies, isPending, data, error } = useAnalyzeDependencies()

    // Create a map for quick task lookup
    const tasksMap = useMemo(() => {
        const map = new Map<string, Task>()
        tasks.forEach(task => map.set(task.id, task))
        return map
    }, [tasks])

    const handleAnalyze = () => {
        analyzeDependencies(
            { eventId },
            {
                onSuccess: () => {
                    setShowDependencies(true)
                }
            }
        )
    }

    // Determine task status (ready, blocked, completed)
    const getTaskStatus = (taskId: string, dependency?: TaskDependency) => {
        const task = tasksMap.get(taskId)
        if (!task) return 'unknown'

        if (task.status === 'done') return 'completed'

        if (!dependency || dependency.dependsOn.length === 0) {
            return 'ready'
        }

        // Check if all dependencies are completed
        const allDepsCompleted = dependency.dependsOn.every(depId => {
            const depTask = tasksMap.get(depId)
            return depTask?.status === 'done'
        })

        return allDepsCompleted ? 'ready' : 'blocked'
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle2 className="w-5 h-5 text-lime-500" />
            case 'ready':
                return <Clock className="w-5 h-5 text-blue-500" />
            case 'blocked':
                return <Lock className="w-5 h-5 text-orange-500" />
            default:
                return <AlertCircle className="w-5 h-5 text-gray-400" />
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <Badge className="bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300">Completed</Badge>
            case 'ready':
                return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">Ready</Badge>
            case 'blocked':
                return <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">Blocked</Badge>
            default:
                return <Badge variant="outline">Unknown</Badge>
        }
    }

    // Organize tasks: those with dependencies and those without
    const { tasksWithDeps, tasksWithoutDeps } = useMemo(() => {
        if (!data?.dependencies) {
            return { tasksWithDeps: [], tasksWithoutDeps: tasks }
        }

        const depsSet = new Set(data.dependencies.map(d => d.taskId))
        const withDeps = data.dependencies
        const withoutDeps = tasks.filter(t => !depsSet.has(t.id))

        return { tasksWithDeps: withDeps, tasksWithoutDeps: withoutDeps }
    }, [data, tasks])

    if (tasks.length < 2) {
        return (
            <Card className="border-2 border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Network className="w-5 h-5 text-indigo-400 dark:text-indigo-500" />
                        <CardTitle className="text-xl text-zinc-500 dark:text-zinc-400">Task Dependencies</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Add at least 2 tasks to analyzing dependencies and blockers.
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-2 border-indigo-200 dark:border-indigo-900 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        <Network className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <CardTitle className="text-xl">Task Dependencies</CardTitle>
                    </div>
                    <Button
                        onClick={handleAnalyze}
                        disabled={isPending}
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <Network className="w-4 h-4 mr-2" />
                                Analyze Dependencies
                            </>
                        )}
                    </Button>
                </div>
                <CardDescription>
                    Understand task relationships and execution order with AI analysis
                </CardDescription>
            </CardHeader>

            <AnimatePresence>
                {showDependencies && data && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <CardContent className="space-y-3">
                            {/* Tasks with dependencies */}
                            {tasksWithDeps.length > 0 && (
                                <div className="space-y-3">
                                    {tasksWithDeps.map((dependency) => {
                                        const task = tasksMap.get(dependency.taskId)
                                        if (!task) return null

                                        const status = getTaskStatus(task.id, dependency)
                                        const completedDeps = dependency.dependsOn.filter(
                                            depId => tasksMap.get(depId)?.status === 'done'
                                        ).length

                                        return (
                                            <motion.div
                                                key={task.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700"
                                            >
                                                {/* Task Header */}
                                                <div className="flex items-start gap-3 mb-3">
                                                    {getStatusIcon(status)}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="font-semibold text-zinc-900 dark:text-white truncate">
                                                                {task.title}
                                                            </h4>
                                                            {getStatusBadge(status)}
                                                        </div>
                                                        {task.description && (
                                                            <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                                                                {task.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Dependencies */}
                                                <div className="ml-8 space-y-2">
                                                    <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                                        <span>📌 Depends on:</span>
                                                        <span className="text-xs text-zinc-500">
                                                            ({completedDeps}/{dependency.dependsOn.length} completed)
                                                        </span>
                                                    </div>
                                                    <ul className="space-y-1">
                                                        {dependency.dependsOn.map(depId => {
                                                            const depTask = tasksMap.get(depId)
                                                            if (!depTask) return null

                                                            const isCompleted = depTask.status === 'done'

                                                            return (
                                                                <li
                                                                    key={depId}
                                                                    className="flex items-center gap-2 text-sm"
                                                                >
                                                                    {isCompleted ? (
                                                                        <CheckCircle2 className="w-4 h-4 text-lime-500 flex-shrink-0" />
                                                                    ) : (
                                                                        <Clock className="w-4 h-4 text-orange-500 flex-shrink-0" />
                                                                    )}
                                                                    <span className={isCompleted ? 'text-zinc-500 line-through' : 'text-zinc-700 dark:text-zinc-300'}>
                                                                        {depTask.title}
                                                                    </span>
                                                                </li>
                                                            )
                                                        })}
                                                    </ul>

                                                    {/* Reasoning */}
                                                    {dependency.reasoning && (
                                                        <div className="mt-2 p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded text-xs text-indigo-700 dark:text-indigo-300">
                                                            💡 {dependency.reasoning}
                                                        </div>
                                                    )}

                                                    {/* Status message */}
                                                    {status === 'ready' && (
                                                        <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                                                            ✨ Ready to start
                                                        </div>
                                                    )}
                                                    {status === 'blocked' && (
                                                        <div className="mt-2 text-xs text-orange-600 dark:text-orange-400 font-medium">
                                                            ⚠️ Waiting for {dependency.dependsOn.length - completedDeps} prerequisite{dependency.dependsOn.length - completedDeps > 1 ? 's' : ''}
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* Tasks without dependencies */}
                            {tasksWithoutDeps.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                                        Independent Tasks ({tasksWithoutDeps.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {tasksWithoutDeps.map(task => {
                                            const status = task.status === 'done' ? 'completed' : 'ready'
                                            return (
                                                <div
                                                    key={task.id}
                                                    className="flex items-center gap-3 p-3 bg-white/50 dark:bg-slate-800/50 rounded border border-zinc-200 dark:border-zinc-700"
                                                >
                                                    {getStatusIcon(status)}
                                                    <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 truncate">
                                                        {task.title}
                                                    </span>
                                                    {getStatusBadge(status)}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Summary */}
                            {data.dependencies && data.dependencies.length === 0 && (
                                <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                                    <Network className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p className="font-medium">No dependencies detected</p>
                                    <p className="text-sm mt-1">All tasks can be executed independently</p>
                                </div>
                            )}
                        </CardContent>
                    </motion.div>
                )}
            </AnimatePresence>

            {error && (
                <CardContent>
                    <div className="text-center py-4 text-red-600 dark:text-red-400">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">Failed to analyze dependencies</p>
                    </div>
                </CardContent>
            )}
        </Card>
    )
}
