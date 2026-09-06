import { createClient } from '@/lib/supabase/server'
import type { CompanyIntelligence, CompanyContext } from '@/types/company-intelligence'
import { intelligenceToContext } from '@/types/company-intelligence'

/**
 * Get company context for AI injection
 * This function should be called by all AI services before making OpenAI requests
 */
export async function getCompanyContext(): Promise<CompanyContext> {
    const db = await createClient()
    const { data: { user } } = await db.auth.getUser()
    if (!user) throw new Error('Authentication required')
    const { data, error } = await db.from('company_intelligence').select('*').eq('user_id', user.id).maybeSingle()
    if (error) throw new Error('Company intelligence could not be loaded')
    return data ? intelligenceToContext(data as CompanyIntelligence) : getDefaultContext()

}

/**
 * Format company context as AI system prompt
 * Use this to inject company context into OpenAI requests
 */
export function formatCompanyContextPrompt(context: CompanyContext): string {
    const parts: string[] = []

    // Company DNA
    if (context.dna.description) {
        parts.push(`Company: ${context.dna.description}`)
    }

    if (context.dna.products.length > 0) {
        parts.push(`Products/Services: ${context.dna.products.join(', ')}`)
    }

    if (context.dna.industries.length > 0) {
        parts.push(`Target Industries: ${context.dna.industries.join(', ')}`)
    }

    if (context.dna.stage) {
        parts.push(`Company Stage: ${context.dna.stage}`)
    }

    // GTM Strategy
    if (context.gtm.goal) {
        const goalMap = {
            brand_awareness: 'Brand Awareness',
            pipeline: 'Pipeline Generation',
            revenue: 'Revenue / Deal Closing',
            partnership: 'Partnership / Channel'
        }
        parts.push(`Primary Business Goal: ${goalMap[context.gtm.goal]}`)
    }

    if (context.gtm.icp.companySizes.length > 0) {
        parts.push(`ICP Company Sizes: ${context.gtm.icp.companySizes.join(', ')}`)
    }

    if (context.gtm.icp.jobTitles.length > 0) {
        parts.push(`ICP Job Titles: ${context.gtm.icp.jobTitles.join(', ')}`)
    }

    if (context.gtm.dealSize.min || context.gtm.dealSize.max) {
        const dealRange = `$${context.gtm.dealSize.min || 0} - $${context.gtm.dealSize.max || '∞'}`
        parts.push(`Typical Deal Size: ${dealRange}`)
    }

    if (context.gtm.salesCycle) {
        parts.push(`Sales Cycle: ${context.gtm.salesCycle}`)
    }

    if (context.gtm.differentiators.length > 0) {
        parts.push(`Key Differentiators: ${context.gtm.differentiators.join(', ')}`)
    }

    if (context.gtm.notes) {
        parts.push(`Strategic Notes: ${context.gtm.notes}`)
    }

    // AI Guidance Rules
    if (context.ai_rules.followupStyle) {
        parts.push(`Follow-up Style: ${context.ai_rules.followupStyle}`)
    }

    if (context.ai_rules.riskTolerance) {
        parts.push(`Risk Tolerance: ${context.ai_rules.riskTolerance}`)
    }

    if (context.ai_rules.tone) {
        parts.push(`Tone Preference: ${context.ai_rules.tone}`)
    }

    if (context.ai_rules.behaviors.length > 0) {
        parts.push(`AI Behaviors: ${context.ai_rules.behaviors.join(', ')}`)
    }

    return parts.length > 0
        ? `Company Context:\n${parts.join('\n')}`
        : ''
}

/**
 * Create AI system prompt with company context
 * This is the recommended way to inject context into AI requests
 */
export function createAISystemPrompt(context: CompanyContext, basePrompt?: string): string {
    const contextPrompt = formatCompanyContextPrompt(context)

    const defaultBase = `You are a revenue operations assistant. Provide actionable recommendations based on the company's goals and strategy.`

    if (!contextPrompt) {
        return basePrompt || defaultBase
    }

    return `${basePrompt || defaultBase}

${contextPrompt}

Based on this context, analyze the following and provide recommendations that align with the company's ${context.gtm.goal || 'business'} goal.`
}

// Default context fallback
function getDefaultContext(): CompanyContext {
    return {
        dna: {
            products: [],
            industries: [],
            compliance: []
        },
        gtm: {
            icp: {
                companySizes: [],
                jobTitles: [],
                industries: []
            },
            dealSize: {},
            differentiators: []
        },
        ai_rules: {
            behaviors: []
        }
    }
}
