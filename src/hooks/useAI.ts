// React Hooks for AI Features
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

// ============================================
// Types
// ============================================

export interface LeadScore {
    score: number
    confidence: number
    reasoning: string
    strengths: string[]
    weaknesses: string[]
    recommendations: string[]
}

export interface LeadSummary {
    summary: string
    keyInsights: string[]
    nextSteps: string[]
    sentiment: 'positive' | 'neutral' | 'negative'
    urgency: 'high' | 'medium' | 'low'
}

export interface ContentGenerationParams {
    type: 'email_followup' | 'event_description' | 'event_invitation' | 'task_description'
    context: Record<string, any>
    userId?: string
}

export interface SuggestedTask {
    title: string
    description: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    estimated_days_before_event: number
    category?: string
    estimated_cost?: number
}

export interface TaskDependency {
    taskId: string
    dependsOn: string[]
    reasoning: string
}

// ============================================
// API Functions
// ============================================

async function scoreLeadAPI(leadId: string, userId?: string): Promise<LeadScore> {
    const response = await fetch('/api/ai/score-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, userId }),
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to score lead')
    }

    const data = await response.json()
    return data
}

async function getCachedLeadScore(leadId: string): Promise<LeadScore | null> {
    const response = await fetch(`/api/ai/score-lead?leadId=${leadId}`)

    if (response.status === 404) {
        return null // No cached score
    }

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to get cached score')
    }

    const data = await response.json()
    return data.cached ? data : null
}

async function summarizeLeadAPI(leadId: string, userId?: string): Promise<LeadSummary> {
    const response = await fetch('/api/ai/summarize-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, userId }),
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to summarize lead')
    }

    return await response.json()
}

async function generateContentAPI(params: ContentGenerationParams): Promise<{ content: string }> {
    const response = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate content')
    }

    return await response.json()
}

async function generateTasksAPI(eventId: string, userId?: string): Promise<{ tasks: SuggestedTask[]; count: number; confidence: number }> {
    const response = await fetch('/api/ai/generate-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, userId }),
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate tasks')
    }

    return await response.json()
}

async function analyzeDependenciesAPI(
    eventId: string,
    taskIds?: string[],
    userId?: string
): Promise<{ dependencies: TaskDependency[]; count: number }> {
    const response = await fetch('/api/ai/analyze-dependencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, taskIds, userId }),
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to analyze dependencies')
    }

    return await response.json()
}

// ============================================
// React Hooks
// ============================================

/**
 * Hook to score a lead using AI
 */
export function useScoreLead() {
    return useMutation({
        mutationFn: ({ leadId, userId }: { leadId: string; userId?: string }) =>
            scoreLeadAPI(leadId, userId),
        onSuccess: () => {
            toast.success('Lead scored successfully')
        },
        onError: (error: Error) => {
            toast.error(`Failed to score lead: ${error.message}`)
        },
    })
}

/**
 * Hook to get cached lead score
 */
export function useCachedLeadScore(leadId: string, enabled = true) {
    return useQuery({
        queryKey: ['ai', 'lead-score', leadId],
        queryFn: () => getCachedLeadScore(leadId),
        enabled: enabled && !!leadId,
        staleTime: 1000 * 60 * 30, // 30 minutes
        retry: false,
    })
}

/**
 * Hook to generate AI summary for a lead
 */
export function useSummarizeLead() {
    return useMutation({
        mutationFn: ({ leadId, userId }: { leadId: string; userId?: string }) =>
            summarizeLeadAPI(leadId, userId),
        onSuccess: () => {
            toast.success('Lead summary generated')
        },
        onError: (error: Error) => {
            toast.error(`Failed to generate summary: ${error.message}`)
        },
    })
}

/**
 * Hook to generate content using AI
 */
export function useGenerateContent() {
    return useMutation({
        mutationFn: (params: ContentGenerationParams) => generateContentAPI(params),
        onSuccess: () => {
            toast.success('Content generated successfully')
        },
        onError: (error: Error) => {
            toast.error(`Failed to generate content: ${error.message}`)
        },
    })
}

/**
 * Hook to generate AI task suggestions for an event
 */
export function useGenerateTasks() {
    return useMutation({
        mutationFn: ({ eventId, userId }: { eventId: string; userId?: string }) =>
            generateTasksAPI(eventId, userId),
        onSuccess: (data) => {
            toast.success(`Generated ${data.count} task suggestions`)
        },
        onError: (error: Error) => {
            toast.error(`Failed to generate tasks: ${error.message}`)
        },
    })
}

/**
 * Hook to analyze task dependencies
 */
export function useAnalyzeDependencies() {
    return useMutation({
        mutationFn: ({ eventId, taskIds, userId }: { eventId: string; taskIds?: string[]; userId?: string }) =>
            analyzeDependenciesAPI(eventId, taskIds, userId),
        onSuccess: (data) => {
            toast.success(`Found ${data.count} task dependencies`)
        },
        onError: (error: Error) => {
            toast.error(`Failed to analyze dependencies: ${error.message}`)
        },
    })
}

/**
 * Hook to get AI usage statistics (placeholder for future implementation)
 */
export function useAIUsageStats(userId: string, days = 7) {
    return useQuery({
        queryKey: ['ai', 'usage-stats', userId, days],
        queryFn: async () => {
            // TODO: Implement API endpoint for usage stats
            return {
                totalRequests: 0,
                totalCost: 0,
                totalTokens: 0,
                byFeature: {},
            }
        },
        enabled: !!userId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    })
}

// ============================================
// Task Prediction Hooks (Phase AI-6)
// ============================================

export interface CompletionPrediction {
    estimatedDays: number
    confidence: number
    reasoning: string
    factors: {
        complexity: 'low' | 'medium' | 'high'
        dependencies: number
        urgency: 'low' | 'medium' | 'high'
    }
}

export interface TaskRisk {
    taskId: string
    taskTitle: string
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
    risks: Array<{
        type: 'timeline' | 'dependency' | 'resource' | 'complexity'
        severity: number
        description: string
    }>
    recommendations: string[]
}

export interface ProgressInsights {
    completionRate: number
    onTrackTasks: number
    atRiskTasks: number
    completedTasks: number
    totalTasks: number
    bottlenecks: Array<{
        type: 'time' | 'dependency' | 'resource'
        affectedTasks: string[]
        impact: 'low' | 'medium' | 'high'
        description: string
        suggestion: string
    }>
    predictions: {
        eventCompletion: string
        daysUntilEvent: number
        confidence: number
    }
}

/**
 * Hook to predict task completion time
 */
export function usePredictCompletion() {
    return useMutation({
        mutationFn: async ({ taskId, eventId }: { taskId: string; eventId?: string }) => {
            const response = await fetch('/api/ai/predict-completion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId, eventId }),
            })

            if (!response.ok) {
                throw new Error('Failed to predict completion')
            }

            return response.json()
        },
        onError: (error: Error) => {
            toast.error(`Prediction failed: ${error.message}`)
        },
    })
}

/**
 * Hook to analyze task risks for an event
 */
export function useAnalyzeRisks() {
    return useMutation({
        mutationFn: async (eventId: string) => {
            const response = await fetch('/api/ai/analyze-risks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId }),
            })

            if (!response.ok) {
                throw new Error('Failed to analyze risks')
            }

            return response.json() as Promise<{
                risks: TaskRisk[]
                overallRiskScore: number
                criticalCount: number
            }>
        },
        onSuccess: (data) => {
            if (data.criticalCount > 0) {
                toast.warning(`Found ${data.criticalCount} critical risk${data.criticalCount > 1 ? 's' : ''}`)
            } else {
                toast.success('Risk analysis complete')
            }
        },
        onError: (error: Error) => {
            toast.error(`Risk analysis failed: ${error.message}`)
        },
    })
}

/**
 * Hook to get progress insights for an event
 */
export function useProgressInsights(eventId: string) {
    return useQuery({
        queryKey: ['ai', 'progress-insights', eventId],
        queryFn: async () => {
            const response = await fetch(`/api/ai/progress-insights?eventId=${eventId}`)

            if (!response.ok) {
                throw new Error('Failed to fetch progress insights')
            }

            return response.json() as Promise<ProgressInsights>
        },
        enabled: !!eventId,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
        refetchOnWindowFocus: false,
    })
}

// ============================================
// Event Intelligence & Lead Qualification Hooks (Phase AI-7)
// ============================================

export interface EventProfile {
    targetAudience: {
        demographics: string[]
        jobRoles: string[]
        interests: string[]
        companySize: string[]
    }
    suitableIndustries: Array<{
        industry: string
        fitScore: number
        reasoning: string
    }>
    budgetBreakdown: {
        venue: { percentage: number; recommendation: string }
        marketing: { percentage: number; recommendation: string }
        catering: { percentage: number; recommendation: string }
        technology: { percentage: number; recommendation: string }
        speakers: { percentage: number; recommendation: string }
        miscellaneous: { percentage: number; recommendation: string }
    }
    roiInsights: {
        expectedAttendance: { min: number; max: number }
        leadGenerationPotential: 'low' | 'medium' | 'high' | 'very_high'
        networkingValue: 'low' | 'medium' | 'high' | 'very_high'
        brandAwareness: 'low' | 'medium' | 'high' | 'very_high'
        estimatedROI: string
    }
    recommendations: string[]
    summary: string
}

export interface LeadQualification {
    fitScore: number
    industryMatch: {
        score: number
        reasoning: string
        isTargetIndustry: boolean
    }
    companySizeMatch: {
        score: number
        reasoning: string
        appropriateForProducts: boolean
    }
    painPoints: string[]
    opportunities: string[]
    risks: string[]
    recommendations: string[]
    qualification: 'high' | 'medium' | 'low' | 'not_qualified'
    reasoning: string
}

/**
 * Hook to analyze event profile
 */
export function useAnalyzeEvent() {
    return useMutation({
        mutationFn: async (eventId: string) => {
            const response = await fetch('/api/ai/analyze-event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId }),
            })

            if (!response.ok) {
                throw new Error('Failed to analyze event')
            }

            return response.json()
        },
        onSuccess: () => {
            toast.success('Event analysis complete')
        },
        onError: (error: Error) => {
            toast.error(`Event analysis failed: ${error.message}`)
        },
    })
}

/**
 * Hook to qualify a lead
 */
export function useQualifyLead() {
    return useMutation({
        mutationFn: async (leadId: string) => {
            const response = await fetch('/api/ai/qualify-lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadId }),
            })

            if (!response.ok) {
                throw new Error('Failed to qualify lead')
            }

            return response.json()
        },
        onSuccess: () => {
            toast.success('Lead qualification complete')
        },
        onError: (error: Error) => {
            toast.error(`Lead qualification failed: ${error.message}`)
        },
    })
}
