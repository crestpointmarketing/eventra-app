// Event Intelligence Service
// Analyzes events to identify target audience, suitable industries, budget recommendations, and ROI insights

import OpenAI from 'openai'
import { getCompanyContext, createAISystemPrompt } from './company-context'

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
})

// ============================================================================
// Types
// ============================================================================

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

export interface Event {
    id: string
    name: string
    event_type: string
    description?: string
    start_date?: string
    end_date?: string
    location?: string
    budget?: number
    expected_attendees?: number
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Analyze event to generate comprehensive profile
 */
export async function analyzeEventProfile(event: Event): Promise<EventProfile> {
    try {
        // Get company intelligence context
        const companyContext = await getCompanyContext()

        const prompt = `Analyze this event and provide detailed insights:

Event Details:
- Name: ${event.name}
- Type: ${event.event_type}
- Description: ${event.description || 'Not provided'}
- Budget: ${event.budget ? `$${event.budget.toLocaleString()}` : 'Not specified'}
- Expected Attendees: ${event.expected_attendees || 'Not specified'}
- Location: ${event.location || 'Not specified'}

Provide a comprehensive analysis with:
1. Target Audience (demographics, job roles, interests, company sizes)
2. Top 5 Suitable Industries (with fit scores 0-100 and reasoning)
3. Budget Breakdown (percentage allocation across 6 categories with recommendations)
4. ROI Insights (attendance range, lead gen potential, networking value, brand awareness, ROI estimate)
5. 5-7 Actionable Recommendations
6. Brief 2-sentence summary

Format as JSON matching this structure:
{
  "targetAudience": {
    "demographics": ["age range", "education level", etc.],
    "jobRoles": ["CEO", "Marketing Director", etc.],
    "interests": ["innovation", "networking", etc.],
    "companySize": ["1-50", "50-200", etc.]
  },
  "suitableIndustries": [
    { "industry": "Technology", "fitScore": 95, "reasoning": "why it fits" }
  ],
  "budgetBreakdown": {
    "venue": { "percentage": 30, "recommendation": "specific advice" },
    "marketing": { "percentage": 25, "recommendation": "specific advice" },
    "catering": { "percentage": 20, "recommendation": "specific advice" },
    "technology": { "percentage": 10, "recommendation": "specific advice" },
    "speakers": { "percentage": 10, "recommendation": "specific advice" },
    "miscellaneous": { "percentage": 5, "recommendation": "specific advice" }
  },
  "roiInsights": {
    "expectedAttendance": { "min": 100, "max": 150 },
    "leadGenerationPotential": "high",
    "networkingValue": "very_high",
    "brandAwareness": "high",
    "estimatedROI": "200-300% based on X factors"
  },
  "recommendations": ["recommendation 1", "recommendation 2", ...],
  "summary": "Two sentence overview of the event and its value proposition"
}`

        // Create system prompt with company context
        const systemPrompt = createAISystemPrompt(
            companyContext,
            'You are an expert event planner and marketing strategist. Provide detailed, actionable insights based on event data and company goals. Focus recommendations on the company\'s primary business goal and ICP. Be specific and realistic in your recommendations.'
        )

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.4,
            response_format: { type: 'json_object' }
        })

        const analysis = JSON.parse(response.choices[0].message.content || '{}')

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
export async function generateEventSummary(event: Event): Promise<string> {
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
