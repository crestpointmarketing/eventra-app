import { useMutation, useQueryClient } from '@tanstack/react-query'

export interface EmailDraftParams {
    leadId: string
    templateId: string
    tone?: string
    language?: string
    personalizationPoints?: string[]
}

export interface EmailDraft {
    subject: string
    body: string
    variables: Record<string, string>
    selectedCta?: string
    metadata: {
        templateName: string
        templateGoal: string
        tone: string
        language: string
        leadName: string
        leadCompany: string
        tokensUsed: number
    }
}

export function useEmailDraftGenerator() {
    const queryClient = useQueryClient()

    return useMutation<EmailDraft, Error, EmailDraftParams>({
        mutationFn: async (params) => {
            const response = await fetch('/api/ai/generate-email-draft', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to generate email draft')
            }

            return response.json()
        },
        onSuccess: (data, variables) => {
            // Optionally invalidate related queries
            queryClient.invalidateQueries({ queryKey: ['email-recommendation', variables.leadId] })
        },
    })
}
