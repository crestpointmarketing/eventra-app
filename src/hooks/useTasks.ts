import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    fetchTasks,
    fetchEventTasks,
    fetchTask,
    createTask,
    updateTask,
    deleteTask,
    archiveTask,
    markTaskAsDone,
    type Task,
    type TaskFilters,
    type CreateTaskData,
    type UpdateTaskData
} from '@/lib/api/tasks'
import { toast } from 'sonner'

// ============================================
// Fetch All Tasks (with filters)
// ============================================
export function useTasks(filters?: TaskFilters) {
    return useQuery({
        queryKey: ['tasks', filters],
        queryFn: () => fetchTasks(filters),
        staleTime: 1000 * 60 * 5, // 5 minutes
    })
}

// ============================================
// Fetch Tasks for Specific Event
// ============================================
export function useEventTasks(eventId: string | undefined) {
    return useQuery({
        queryKey: ['tasks', 'event', eventId],
        queryFn: () => fetchEventTasks(eventId!),
        enabled: !!eventId,
        staleTime: 1000 * 60 * 5,
    })
}

// ============================================
// Fetch Single Task
// ============================================
export function useTask(taskId: string | undefined) {
    return useQuery({
        queryKey: ['tasks', taskId],
        queryFn: () => fetchTask(taskId!),
        enabled: !!taskId,
        staleTime: 1000 * 60 * 5,
    })
}

// ============================================
// Create Task Mutation
// ============================================
export function useCreateTask() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: CreateTaskData) => createTask(data),
        onSuccess: (newTask) => {
            // Invalidate all task queries
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
            toast.success('Task created successfully')
        },
        onError: (error) => {
            console.error('Error creating task:', error)
            toast.error('Failed to create task')
        },
    })
}

// ============================================
// Update Task Mutation
// ============================================
export function useUpdateTask() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ taskId, updates }: { taskId: string; updates: UpdateTaskData }) => {
            console.log('🔵 Updating task:', { taskId, updates })
            return updateTask(taskId, updates)
        },
        onSuccess: (updatedTask) => {
            console.log('🟢 Task updated successfully:', updatedTask)
            // Invalidate all task queries
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
            toast.success('Task updated successfully')
        },
        onError: (error: any) => {
            console.error('🔴 Error updating task:', {
                message: error?.message,
                details: error?.details,
                hint: error?.hint,
                code: error?.code,
                fullError: error
            })
            toast.error(`Failed to update task: ${error?.message || 'Unknown error'}`)
        },
    })
}

// ============================================
// Delete Task Mutation
// ============================================
export function useDeleteTask() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (taskId: string) => deleteTask(taskId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
            toast.success('Task deleted successfully')
        },
        onError: (error) => {
            console.error('Error deleting task:', error)
            toast.error('Failed to delete task')
        },
    })
}

// ============================================
// Archive Task Mutation
// ============================================
export function useArchiveTask() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (taskId: string) => archiveTask(taskId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
            toast.success('Task archived successfully')
        },
        onError: (error) => {
            console.error('Error archiving task:', error)
            toast.error('Failed to archive task')
        },
    })
}

// ============================================
// Mark Task as Done Mutation
// ============================================
export function useMarkTaskAsDone() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (taskId: string) => markTaskAsDone(taskId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
            toast.success('Task marked as done')
        },
        onError: (error) => {
            console.error('Error marking task as done:', error)
            toast.error('Failed to mark task as done')
        },
    })
}
