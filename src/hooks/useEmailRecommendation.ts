import { useQuery } from '@tanstack/react-query'

interface EmailRecommendation {
    shouldSend: 'yes' | 'wait' | 'no'
    // Backward compatibility fields
    recommendedTemplateId: string
    recommendedTemplateName: string
    reasons: string[]
    // New fields for multiple template recommendations
    recommendedTemplates?: Array<{
        templateId: string
        templateName: string
        score: number
        reasons: string[]
        goal?: string
        tone?: string
    }>
    primaryRecommendation?: string
    riskFlags: string[]
    metadata: {
        leadStatus: string
        leadScore: number
        daysSinceLastContact: number
        daysSinceEvent: number
        contactFrequency: number
    }
}

export function useEmailRecommendation(leadId: string) {
    return useQuery<EmailRecommendation>({
        queryKey: ['email-recommendation', leadId],
        queryFn: async () => {
            const response = await fetch('/api/ai/recommend-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ leadId }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to get email recommendation')
            }

            return response.json()
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
    })
}
