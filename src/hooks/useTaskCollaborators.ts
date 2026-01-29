import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    fetchTaskCollaborators,
    addCollaborator,
    removeCollaborator,
    updateCollaboratorRole,
    type TaskCollaborator,
    type AddCollaboratorData
} from '@/lib/api/collaborators'
import { toast } from 'sonner'

// ============================================
// Fetch Collaborators for Task
// ============================================
export function useTaskCollaborators(taskId: string | undefined) {
    return useQuery({
        queryKey: ['collaborators', taskId],
        queryFn: () => fetchTaskCollaborators(taskId!),
        enabled: !!taskId,
        staleTime: 1000 * 60 * 5,
    })
}

// ============================================
// Add Collaborator Mutation
// ============================================
export function useAddCollaborator() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: AddCollaboratorData) => addCollaborator(data),
        onSuccess: (newCollaborator) => {
            queryClient.invalidateQueries({ queryKey: ['collaborators', newCollaborator.task_id] })
            toast.success('Collaborator added successfully')
        },
        onError: (error) => {
            console.error('Error adding collaborator:', error)
            toast.error('Failed to add collaborator')
        },
    })
}

// ============================================
// Remove Collaborator Mutation
// ============================================
export function useRemoveCollaborator() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (collaboratorId: string) => removeCollaborator(collaboratorId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['collaborators'] })
            toast.success('Collaborator removed')
        },
        onError: (error) => {
            console.error('Error removing collaborator:', error)
            toast.error('Failed to remove collaborator')
        },
    })
}

// ============================================
// Update Collaborator Role Mutation
// ============================================
export function useUpdateCollaboratorRole() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ collaboratorId, role }: { collaboratorId: string; role: string }) =>
            updateCollaboratorRole(collaboratorId, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['collaborators'] })
            toast.success('Collaborator role updated')
        },
        onError: (error) => {
            console.error('Error updating collaborator role:', error)
            toast.error('Failed to update collaborator role')
        },
    })
}
