import { useMutation } from '@tanstack/react-query'

interface SubjectLine {
    text: string
    tone: string
    length: number
    approach: string
}

interface SubjectLineResponse {
    subjectLines: SubjectLine[]
    metadata: {
        tokensUsed: number
        leadName: string
        templateName: string
    }
}

interface GenerateSubjectLinesParams {
    leadId: string
    templateId: string
    emailBody?: string
    tone?: string
    count?: number
}

export function useSubjectLineGenerator() {
    return useMutation<SubjectLineResponse, Error, GenerateSubjectLinesParams>({
        mutationFn: async (params) => {
            const response = await fetch('/api/ai/generate-subject-lines', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to generate subject lines')
            }

            return response.json()
        },
    })
}
