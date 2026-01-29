import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { CompanyIntelligence } from '@/types/company-intelligence'

// Fetch company intelligence
async function fetchCompanyIntelligence() {
    const response = await fetch('/api/company-intelligence')

    if (!response.ok) {
        throw new Error('Failed to fetch company intelligence')
    }

    const data = await response.json()
    return data
}

// Update company intelligence
async function updateCompanyIntelligence(data: Partial<CompanyIntelligence> & { isDraft?: boolean }) {
    const response = await fetch('/api/company-intelligence', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })

    if (!response.ok) {
        throw new Error('Failed to update company intelligence')
    }

    return response.json()
}

export function useCompanyIntelligence() {
    const queryClient = useQueryClient()

    const { data, isLoading, error } = useQuery({
        queryKey: ['company-intelligence'],
        queryFn: fetchCompanyIntelligence,
        staleTime: 1000 * 60 * 5, // 5 minutes
    })

    const { mutate: updateIntelligence, isPending: isUpdating } = useMutation({
        mutationFn: updateCompanyIntelligence,
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ['company-intelligence'] })

            if (response.message) {
                toast.success(response.message)
            }
        },
        onError: (error: Error) => {
            toast.error(`Failed to save: ${error.message}`)
        }
    })

    const { mutate: saveDraft, isPending: isSavingDraft } = useMutation({
        mutationFn: (data: Partial<CompanyIntelligence>) =>
            updateCompanyIntelligence({ ...data, isDraft: true }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['company-intelligence'] })
            toast.success('Draft saved')
        },
        onError: (error: Error) => {
            toast.error(`Failed to save draft: ${error.message}`)
        }
    })

    return {
        intelligence: data?.intelligence,
        isNew: data?.isNew || false,
        isLoading,
        error,
        updateIntelligence,
        saveDraft,
        isUpdating: isUpdating || isSavingDraft
    }
}
