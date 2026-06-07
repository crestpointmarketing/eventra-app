// Event Intelligence Service
// Analyzes events to identify target audience, suitable industries, budget recommendations, and ROI insights

import { getCompanyContext, createAISystemPrompt } from './company-context'
import type { AIEvent } from './types'
import { createPerplexityClient } from './perplexity'
export type { AIEvent as Event } from './types'

export interface EventProfile {
    targetAudience: {
        demographics: string[]
        jobRoles: string[]
        interests: string[]
        companySize: string[]
    }
    suitableIndustries: Array<{
        industry: string
        fitScore: number // 0-100
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

interface EventIntelligenceInput extends AIEvent {
    website_url?: string | null
    focus_area?: string | null
    target_audience?: string | null
    expected_attendees?: number | null
    discovery_priority?: string | null
    total_budget?: number | null
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Analyze event to generate comprehensive profile
 */
export async function analyzeEventProfile(event: AIEvent): Promise<EventProfile> {
    try {
        const intelligenceEvent = event as EventIntelligenceInput
        const companyContext = await getCompanyContext()

        const eventDetails = [
            `Name: ${event.name}`,
            `Type: ${event.event_type || 'conference'}`,
            event.description        ? `Description: ${event.description}` : null,
            event.location           ? `Location: ${event.location}` : null,
            intelligenceEvent.website_url        ? `Website: ${intelligenceEvent.website_url}` : null,
            intelligenceEvent.focus_area         ? `Focus Area: ${intelligenceEvent.focus_area}` : null,
            intelligenceEvent.target_audience    ? `Known Target Audience: ${intelligenceEvent.target_audience}` : null,
            intelligenceEvent.expected_attendees ? `Expected Attendees: ${intelligenceEvent.expected_attendees}` : null,
            intelligenceEvent.discovery_priority ? `Strategic Priority: ${intelligenceEvent.discovery_priority}` : null,
            intelligenceEvent.total_budget       ? `Budget: $${intelligenceEvent.total_budget.toLocaleString()}` : null,
        ].filter(Boolean).join('\n')

        const prompt = `Search the web for information about this event and provide a detailed intelligence analysis.

EVENT:
${eventDetails}

Using what you find online about this specific event, return a JSON object with this exact structure:
{
  "targetAudience": {
    "demographics": ["specific demographics based on real attendee profiles"],
    "jobRoles": ["specific job titles that attend this event"],
    "interests": ["specific professional interests"],
    "companySize": ["company size ranges typical for attendees"]
  },
  "suitableIndustries": [
    { "industry": "Industry Name", "fitScore": 95, "reasoning": "specific reason based on event content" }
  ],
  "budgetBreakdown": {
    "venue": { "percentage": 30, "recommendation": "specific advice for this event type" },
    "marketing": { "percentage": 25, "recommendation": "specific advice" },
    "catering": { "percentage": 20, "recommendation": "specific advice" },
    "technology": { "percentage": 10, "recommendation": "specific advice" },
    "speakers": { "percentage": 10, "recommendation": "specific advice" },
    "miscellaneous": { "percentage": 5, "recommendation": "specific advice" }
  },
  "roiInsights": {
    "expectedAttendance": { "min": 500, "max": 1000 },
    "leadGenerationPotential": "high",
    "networkingValue": "very_high",
    "brandAwareness": "high",
    "estimatedROI": "specific ROI estimate with reasoning"
  },
  "recommendations": ["5-7 specific, actionable recommendations for sponsoring or attending this event"],
  "summary": "2-sentence summary based on what you found about this event online"
}

Return ONLY valid JSON. Use real data from your search — do NOT use generic placeholders.`

        const systemPrompt = createAISystemPrompt(
            companyContext,
            'You are an expert event intelligence analyst. Search the web for real information about the event before responding. Provide specific, data-driven insights — never generic placeholders. Base all analysis on actual event details found online.'
        )

        const response = await createPerplexityClient().chat.completions.create({
            model: 'sonar-pro',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user',   content: prompt },
            ],
            temperature: 0.2,
        })

        const raw = response.choices[0].message.content || '{}'
        const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
        const match = cleaned.match(/\{[\s\S]*\}/)
        const analysis = JSON.parse(match ? match[0] : cleaned)

        return {
            targetAudience: analysis.targetAudience || {
                demographics: [],
                jobRoles: [],
                interests: [],
                companySize: []
            },
            suitableIndustries: analysis.suitableIndustries || [],
            budgetBreakdown: analysis.budgetBreakdown || getDefaultBudgetBreakdown(),
            roiInsights: analysis.roiInsights || getDefaultROIInsights(),
            recommendations: analysis.recommendations || [],
            summary: analysis.summary || `${event.event_type} event focused on ${event.name}`
        }
    } catch (error) {
        console.error('Error analyzing event profile:', error)

        // Return fallback analysis
        return {
            targetAudience: {
                demographics: ['Business professionals', 'Industry specialists'],
                jobRoles: ['Managers', 'Directors', 'Executives'],
                interests: ['Networking', 'Professional development'],
                companySize: ['All sizes']
            },
            suitableIndustries: [
                {
                    industry: 'General Business',
                    fitScore: 70,
                    reasoning: 'Broadly applicable event type'
                }
            ],
            budgetBreakdown: getDefaultBudgetBreakdown(),
            roiInsights: getDefaultROIInsights(),
            recommendations: [
                'Define clear event objectives',
                'Identify and segment target audience',
                'Develop comprehensive marketing plan',
                'Establish measurable success metrics'
            ],
            summary: `${event.event_type} event: ${event.name}`
        }
    }
}

/**
 * Generate concise event summary
 */
export async function generateEventSummary(event: AIEvent): Promise<string> {
    try {
        const prompt = `Create a compelling 2-3 sentence summary for this event that highlights its key value proposition and target audience:

Event: ${event.name}
Type: ${event.event_type}
Description: ${event.description || 'Not provided'}

Make it engaging and suitable for marketing materials.`

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are a marketing copywriter creating engaging event descriptions.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 150
        })

        return response.choices[0].message.content || `${event.event_type} event: ${event.name}`
    } catch (error) {
        console.error('Error generating event summary:', error)
        return `${event.event_type} event: ${event.name}`
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDefaultBudgetBreakdown() {
    return {
        venue: { percentage: 30, recommendation: 'Allocate for location rental and setup' },
        marketing: { percentage: 25, recommendation: 'Invest in promotion and advertising' },
        catering: { percentage: 20, recommendation: 'Provide quality food and beverages' },
        technology: { percentage: 10, recommendation: 'AV equipment and tech support' },
        speakers: { percentage: 10, recommendation: 'Expert presenters and facilitators' },
        miscellaneous: { percentage: 5, recommendation: 'Contingency and unexpected costs' }
    }
}

function getDefaultROIInsights() {
    return {
        expectedAttendance: { min: 50, max: 100 },
        leadGenerationPotential: 'medium' as const,
        networkingValue: 'medium' as const,
        brandAwareness: 'medium' as const,
        estimatedROI: '150-200% based on typical event metrics'
    }
}
