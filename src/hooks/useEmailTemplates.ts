// =========================
// EMAIL TEMPLATES HOOKS
// =========================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
    getEmailTemplates,
    getEmailTemplateById,
    createEmailTemplate,
    updateEmailTemplate,
    deleteEmailTemplate,
    duplicateEmailTemplate,
    updateTemplateStatus,
} from '@/lib/api/email-templates'
import type {
    EmailTemplateFilters,
    CreateEmailTemplateInput,
    UpdateEmailTemplateInput,
} from '@/types/email-templates'

// Query keys
export const emailTemplateKeys = {
    all: ['email-templates'] as const,
    lists: () => [...emailTemplateKeys.all, 'list'] as const,
    list: (filters?: EmailTemplateFilters) => [...emailTemplateKeys.lists(), filters] as const,
    details: () => [...emailTemplateKeys.all, 'detail'] as const,
    detail: (id: string) => [...emailTemplateKeys.details(), id] as const,
}

// Fetch all templates
export function useEmailTemplates(filters?: EmailTemplateFilters) {
    return useQuery({
        queryKey: emailTemplateKeys.list(filters),
        queryFn: () => getEmailTemplates(filters),
    })
}

// Fetch single template with details
export function useEmailTemplate(id: string | undefined) {
    return useQuery({
        queryKey: emailTemplateKeys.detail(id!),
        queryFn: () => getEmailTemplateById(id!),
        enabled: !!id,
    })
}

// Create template
export function useCreateEmailTemplate() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (input: CreateEmailTemplateInput) => createEmailTemplate(input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: emailTemplateKeys.lists() })
            toast.success('Template created successfully')
        },
        onError: (error: Error) => {
            toast.error(`Failed to create template: ${error.message}`)
        },
    })
}

// Update template
export function useUpdateEmailTemplate() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (input: UpdateEmailTemplateInput) => updateEmailTemplate(input),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: emailTemplateKeys.lists() })
            queryClient.invalidateQueries({ queryKey: emailTemplateKeys.detail(variables.id) })
            toast.success('Template updated successfully')
        },
        onError: (error: Error) => {
            toast.error(`Failed to update template: ${error.message}`)
        },
    })
}

// Delete template
export function useDeleteEmailTemplate() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => deleteEmailTemplate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: emailTemplateKeys.lists() })
            toast.success('Template deleted successfully')
        },
        onError: (error: Error) => {
            toast.error(`Failed to delete template: ${error.message}`)
        },
    })
}

// Duplicate template
export function useDuplicateEmailTemplate() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ templateId, newName }: { templateId: string; newName?: string }) =>
            duplicateEmailTemplate(templateId, newName),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: emailTemplateKeys.lists() })
            toast.success('Template duplicated successfully')
        },
        onError: (error: Error) => {
            toast.error(`Failed to duplicate template: ${error.message}`)
        },
    })
}

// Update template status
export function useUpdateTemplateStatus() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: 'active' | 'disabled' | 'archived' }) =>
            updateTemplateStatus(id, status),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: emailTemplateKeys.lists() })
            queryClient.invalidateQueries({ queryKey: emailTemplateKeys.detail(variables.id) })
            toast.success('Template status updated')
        },
        onError: (error: Error) => {
            toast.error(`Failed to update status: ${error.message}`)
        },
    })
}
