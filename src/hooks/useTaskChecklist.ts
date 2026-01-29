import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    fetchTaskChecklist,
    createChecklistItem,
    toggleChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    reorderChecklistItems,
    type ChecklistItem,
    type CreateChecklistItemData
} from '@/lib/api/checklist'
import { toast } from 'sonner'

// ============================================
// Fetch Checklist for Task
// ============================================
export function useTaskChecklist(taskId: string | undefined) {
    return useQuery({
        queryKey: ['checklist', taskId],
        queryFn: () => fetchTaskChecklist(taskId!),
        enabled: !!taskId,
        staleTime: 1000 * 60 * 5,
    })
}

// ============================================
// Create Checklist Item Mutation
// ============================================
export function useCreateChecklistItem() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: CreateChecklistItemData) => createChecklistItem(data),
        onSuccess: (newItem) => {
            queryClient.invalidateQueries({ queryKey: ['checklist', newItem.task_id] })
            toast.success('Checklist item added')
        },
        onError: (error) => {
            console.error('Error creating checklist item:', error)
            toast.error('Failed to add checklist item')
        },
    })
}

// ============================================
// Toggle Checklist Item Mutation
// ============================================
export function useToggleChecklistItem() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ itemId, isCompleted }: { itemId: string; isCompleted: boolean }) =>
            toggleChecklistItem(itemId, isCompleted),
        onSuccess: (updatedItem, variables) => {
            // Find task_id from the updated item
            queryClient.invalidateQueries({ queryKey: ['checklist'] })
            // No toast for toggle (too noisy)
        },
        onError: (error) => {
            console.error('Error toggling checklist item:', error)
            toast.error('Failed to update checklist item')
        },
    })
}

// ============================================
// Update Checklist Item Mutation
// ============================================
export function useUpdateChecklistItem() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ itemId, updates }: { itemId: string; updates: Partial<ChecklistItem> }) =>
            updateChecklistItem(itemId, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['checklist'] })
            toast.success('Checklist item updated')
        },
        onError: (error) => {
            console.error('Error updating checklist item:', error)
            toast.error('Failed to update checklist item')
        },
    })
}

// ============================================
// Delete Checklist Item Mutation
// ============================================
export function useDeleteChecklistItem() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (itemId: string) => deleteChecklistItem(itemId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['checklist'] })
            toast.success('Checklist item deleted')
        },
        onError: (error) => {
            console.error('Error deleting checklist item:', error)
            toast.error('Failed to delete checklist item')
        },
    })
}

// ============================================
// Reorder Checklist Items Mutation
// ============================================
export function useReorderChecklistItems() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ taskId, itemIds }: { taskId: string; itemIds: string[] }) =>
            reorderChecklistItems(taskId, itemIds),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['checklist', variables.taskId] })
        },
        onError: (error) => {
            console.error('Error reordering checklist items:', error)
            toast.error('Failed to reorder checklist items')
        },
    })
}
