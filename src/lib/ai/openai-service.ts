// OpenAI Service
// Wrapper around OpenAI API with error handling, cost tracking, and rate limiting

import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// OpenAI Configuration
export const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
})

// Pricing per 1M tokens (as of Jan 2026)
const PRICING = {
    'gpt-4o-mini': {
        prompt: 0.150, // $0.150 per 1M input tokens
        completion: 0.600, // $0.600 per 1M output tokens
    },
    'gpt-4o': {
        prompt: 2.50, // $2.50 per 1M input tokens
        completion: 10.00, // $10.00 per 1M output tokens
    },
} as const

// Rate limiting configuration
const RATE_LIMITS = {
    maxRequestsPerMinute: 20,
    maxTokensPerRequest: 2000,
    maxRequestsPerDay: 500,
}

export type AIFeature =
    | 'lead_scoring'
    | 'lead_summary'
    | 'content_generation'
    | 'task_suggestions'
    | 'chat_assistant'
    | 'event_insights'

export interface AIUsageRecord {
    user_id?: string
    feature: AIFeature
    model: string
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    estimated_cost: number
    request_data?: any
    response_time_ms: number
    status: 'success' | 'error' | 'rate_limited'
    error_message?: string
}

/**
 * Calculate cost based on token usage and model
 */
function calculateCost(
    model: keyof typeof PRICING,
    promptTokens: number,
    completionTokens: number
): number {
    const pricing = PRICING[model]
    const promptCost = (promptTokens / 1_000_000) * pricing.prompt
    const completionCost = (completionTokens / 1_000_000) * pricing.completion
    return promptCost + completionCost
}

/**
 * Track AI usage in database
 */
async function trackUsage(usage: AIUsageRecord): Promise<void> {
    try {
        const { error } = await supabase
            .from('ai_usage')
            .insert({
                user_id: usage.user_id,
                feature: usage.feature,
                model: usage.model,
                prompt_tokens: usage.prompt_tokens,
                completion_tokens: usage.completion_tokens,
                total_tokens: usage.total_tokens,
                estimated_cost: usage.estimated_cost,
                request_data: usage.request_data,
                response_time_ms: usage.response_time_ms,
                status: usage.status,
                error_message: usage.error_message,
            })

        if (error) {
            console.error('Failed to track AI usage:', error)
        }
    } catch (error) {
        console.error('Error tracking AI usage:', error)
    }
}

/**
 * Check rate limits for user
 */
async function checkRateLimits(userId?: string): Promise<boolean> {
    if (!userId) return true // Skip rate limiting for anonymous requests

    try {
        // Check daily limit
        const oneDayAgo = new Date()
        oneDayAgo.setDate(oneDayAgo.getDate() - 1)

        const { count, error } = await supabase
            .from('ai_usage')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('created_at', oneDayAgo.toISOString())

        if (error) {
            console.error('Error checking rate limits:', error)
            return true // Allow on error
        }

        if (count && count >= RATE_LIMITS.maxRequestsPerDay) {
            console.warn(`User ${userId} exceeded daily rate limit`)
            return false
        }

        return true
    } catch (error) {
        console.error('Error in rate limit check:', error)
        return true // Allow on error
    }
}

/**
 * Generate chat completion using OpenAI
 */
export async function generateChatCompletion(params: {
    messages: OpenAI.Chat.ChatCompletionMessageParam[]
    model?: 'gpt-4o-mini' | 'gpt-4o'
    maxTokens?: number
    temperature?: number
    userId?: string
    feature: AIFeature
    requestData?: any
}): Promise<{
    content: string | null
    usage: OpenAI.Completions.CompletionUsage | undefined
    error?: string
}> {
    const startTime = Date.now()
    const model = params.model || 'gpt-4o-mini'

    try {
        // Check rate limits
        const withinLimits = await checkRateLimits(params.userId)
        if (!withinLimits) {
            const error = 'Rate limit exceeded'
            await trackUsage({
                user_id: params.userId,
                feature: params.feature,
                model,
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0,
                estimated_cost: 0,
                request_data: params.requestData,
                response_time_ms: Date.now() - startTime,
                status: 'rate_limited',
                error_message: error,
            })
            return { content: null, usage: undefined, error }
        }

        // Call OpenAI
        const completion = await openai.chat.completions.create({
            model,
            messages: params.messages,
            max_tokens: params.maxTokens || 1000,
            temperature: params.temperature ?? 0.7,
        })

        const content = completion.choices[0]?.message?.content || null
        const usage = completion.usage

        // Track usage
        if (usage) {
            const cost = calculateCost(
                model,
                usage.prompt_tokens,
                usage.completion_tokens
            )

            await trackUsage({
                user_id: params.userId,
                feature: params.feature,
                model,
                prompt_tokens: usage.prompt_tokens,
                completion_tokens: usage.completion_tokens,
                total_tokens: usage.total_tokens,
                estimated_cost: cost,
                request_data: params.requestData,
                response_time_ms: Date.now() - startTime,
                status: 'success',
            })
        }

        return { content, usage }
    } catch (error: any) {
        console.error('OpenAI API error:', error)

        // Track error
        await trackUsage({
            user_id: params.userId,
            feature: params.feature,
            model,
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
            estimated_cost: 0,
            request_data: params.requestData,
            response_time_ms: Date.now() - startTime,
            status: 'error',
            error_message: error.message || 'Unknown error',
        })

        return {
            content: null,
            usage: undefined,
            error: error.message || 'Failed to generate completion',
        }
    }
}

/**
 * Store AI insight in database
 */
export async function storeAIInsight(params: {
    entityType: 'lead' | 'event' | 'task'
    entityId: string
    insightType: 'score' | 'summary' | 'recommendation' | 'prediction'
    content: any
    confidence?: number
    metadata?: any
    expiresInHours?: number
}): Promise<{ error?: string }> {
    try {
        const expiresAt = params.expiresInHours
            ? new Date(Date.now() + params.expiresInHours * 60 * 60 * 1000)
            : null

        const { error } = await supabase
            .from('ai_insights')
            .insert({
                entity_type: params.entityType,
                entity_id: params.entityId,
                insight_type: params.insightType,
                content: params.content,
                confidence: params.confidence,
                metadata: params.metadata || {},
                expires_at: expiresAt,
            })

        if (error) {
            console.error('Failed to store AI insight:', error)
            return { error: error.message }
        }

        return {}
    } catch (error: any) {
        console.error('Error storing AI insight:', error)
        return { error: error.message || 'Unknown error' }
    }
}

/**
 * Get AI insight from database
 */
export async function getAIInsight(params: {
    entityType: 'lead' | 'event' | 'task'
    entityId: string
    insightType?: 'score' | 'summary' | 'recommendation' | 'prediction'
}): Promise<any | null> {
    try {
        let query = supabase
            .from('ai_insights')
            .select('*')
            .eq('entity_type', params.entityType)
            .eq('entity_id', params.entityId)
            .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
            .order('created_at', { ascending: false })

        if (params.insightType) {
            query = query.eq('insight_type', params.insightType)
        }

        const { data, error } = await query.limit(1).single()

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
            console.error('Failed to get AI insight:', error)
            return null
        }

        return data
    } catch (error) {
        console.error('Error getting AI insight:', error)
        return null
    }
}

/**
 * Get AI usage statistics for user
 */
export async function getAIUsageStats(userId: string, days: number = 7): Promise<{
    totalRequests: number
    totalCost: number
    totalTokens: number
    byFeature: Record<string, { requests: number; cost: number }>
}> {
    try {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        const { data, error } = await supabase
            .from('ai_usage')
            .select('*')
            .eq('user_id', userId)
            .gte('created_at', startDate.toISOString())

        if (error) {
            console.error('Failed to get AI usage stats:', error)
            return {
                totalRequests: 0,
                totalCost: 0,
                totalTokens: 0,
                byFeature: {},
            }
        }

        const stats = {
            totalRequests: data.length,
            totalCost: data.reduce((sum: number, record: any) => sum + (Number(record.estimated_cost) || 0), 0),
            totalTokens: data.reduce((sum: number, record: any) => sum + (record.total_tokens || 0), 0),
            byFeature: {} as Record<string, { requests: number; cost: number }>,
        }

        // Group by feature
        data.forEach((record: any) => {
            if (!stats.byFeature[record.feature]) {
                stats.byFeature[record.feature] = { requests: 0, cost: 0 }
            }
            stats.byFeature[record.feature].requests++
            stats.byFeature[record.feature].cost += Number(record.estimated_cost) || 0
        })

        return stats
    } catch (error) {
        console.error('Error getting AI usage stats:', error)
        return {
            totalRequests: 0,
            totalCost: 0,
            totalTokens: 0,
            byFeature: {},
        }
    }
}
