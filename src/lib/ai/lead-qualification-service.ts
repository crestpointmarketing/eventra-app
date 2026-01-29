// Lead Qualification Service
// Assesses lead-company fit based on industry alignment, company size, and product needs

import OpenAI from 'openai'
import { getCompanyContext, createAISystemPrompt } from './company-context'

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
})

// ============================================================================
// Types
// ============================================================================

export interface LeadQualification {
    fitScore: number // 0-100 overall product-company alignment
    industryMatch: {
        score: number // 0-100
        reasoning: string
        isTargetIndustry: boolean
    }
    companySizeMatch: {
        score: number // 0-100
        reasoning: string
        appropriateForProducts: boolean
    }
    painPoints: string[] // Identified needs the company can address
    opportunities: string[] // Specific ways to add value
    risks: string[] // Potential challenges or concerns
    recommendations: string[] // Next steps for engagement
    qualification: 'high' | 'medium' | 'low' | 'not_qualified'
    reasoning: string // Overall assessment explanation
}

export interface Lead {
    id: string
    name: string
    email: string
    company?: string
    title?: string
    industry?: string
    company_size?: string
    notes?: string
    lead_score?: number
}

export interface CompanyProfile {
    name: string
    products: string[]
    targetIndustries: string[]
    idealCustomerProfile: {
        companySizes: string[]
        jobRoles: string[]
        commonPainPoints: string[]
    }
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Assess lead qualification and product-company fit
 */
export async function assessLeadQualification(
    lead: Lead,
    companyProfile?: CompanyProfile
): Promise<LeadQualification> {
    try {
        // Get company intelligence context
        const companyContext = await getCompanyContext()

        // Default company profile if not provided
        const profile = companyProfile || getDefaultCompanyProfile()

        const prompt = `Analyze this lead and assess their fit for our products/services:

Lead Information:
- Name: ${lead.name}
- Company: ${lead.company || 'Not specified'}
- Title: ${lead.title || 'Not specified'}
- Industry: ${lead.industry || 'Not specified'}
- Company Size: ${lead.company_size || 'Not specified'}
- Notes: ${lead.notes || 'None'}
- Current Lead Score: ${lead.lead_score || 'Not scored'}

Our Company Profile:
- Products: ${profile.products.join(', ')}
- Target Industries: ${profile.targetIndustries.join(', ')}
- Ideal Customer: ${profile.idealCustomerProfile.companySizes.join(', ')} companies
- Common Pain Points We Address: ${profile.idealCustomerProfile.commonPainPoints.join(', ')}

Provide a detailed qualification assessment with:
1. Overall Fit Score (0-100)
2. Industry Match (score, reasoning, is target industry?)
3. Company Size Match (score, reasoning, appropriate for products?)
4. Identified Pain Points (3-5 specific needs we can address)
5. Opportunities (3-5 ways to add value)
6. Risks (2-3 potential challenges)
7. Recommendations (3-5 next steps)
8. Overall Qualification (high/medium/low/not_qualified)
9. Brief reasoning for the qualification level

Format as JSON:
{
  "fitScore": 85,
  "industryMatch": {
    "score": 90,
    "reasoning": "why industry fits",
    "isTargetIndustry": true
  },
  "companySizeMatch": {
    "score": 80,
    "reasoning": "why size fits",
    "appropriateForProducts": true
  },
  "painPoints": ["pain 1", "pain 2", ...],
  "opportunities": ["opportunity 1", "opportunity 2", ...],
  "risks": ["risk 1", "risk 2", ...],
  "recommendations": ["recommendation 1", "recommendation 2", ...],
  "qualification": "high",
  "reasoning": "Overall assessment explanation"
}`

        // Create system prompt with company context
        const systemPrompt = createAISystemPrompt(
            companyContext,
            'You are a B2B sales qualification expert. Analyze leads objectively based on the company\'s specific goals and strategy. Provide actionable insights that align with the company\'s primary business goal and ICP. Be honest about fit and specific in recommendations.'
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
            temperature: 0.3,
            response_format: { type: 'json_object' }
        })

        const analysis = JSON.parse(response.choices[0].message.content || '{}')

        return {
            fitScore: analysis.fitScore || 50,
            industryMatch: analysis.industryMatch || {
                score: 50,
                reasoning: 'Industry information limited',
                isTargetIndustry: false
            },
            companySizeMatch: analysis.companySizeMatch || {
                score: 50,
                reasoning: 'Company size information limited',
                appropriateForProducts: true
            },
            painPoints: analysis.painPoints || [],
            opportunities: analysis.opportunities || [],
            risks: analysis.risks || [],
            recommendations: analysis.recommendations || ['Gather more information about the lead'],
            qualification: analysis.qualification || 'medium',
            reasoning: analysis.reasoning || 'Requires further qualification'
        }
    } catch (error) {
        console.error('Error assessing lead qualification:', error)

        // Return fallback qualification
        return {
            fitScore: 50,
            industryMatch: {
                score: 50,
                reasoning: 'Unable to assess industry fit',
                isTargetIndustry: false
            },
            companySizeMatch: {
                score: 50,
                reasoning: 'Unable to assess company size fit',
                appropriateForProducts: true
            },
            painPoints: ['Requires discovery call to identify needs'],
            opportunities: ['Learn more about their business challenges'],
            risks: ['Limited information available'],
            recommendations: [
                'Schedule discovery call',
                'Research company background',
                'Identify key decision makers'
            ],
            qualification: 'medium',
            reasoning: 'Insufficient data for complete assessment'
        }
    }
}

/**
 * Batch qualify multiple leads efficiently
 */
export async function batchQualifyLeads(
    leads: Lead[],
    companyProfile?: CompanyProfile
): Promise<Map<string, LeadQualification>> {
    const qualifications = new Map<string, LeadQualification>()

    // Process in batches of 5 to avoid rate limits
    const batchSize = 5
    for (let i = 0; i < leads.length; i += batchSize) {
        const batch = leads.slice(i, i + batchSize)

        const results = await Promise.all(
            batch.map(lead => assessLeadQualification(lead, companyProfile))
        )

        batch.forEach((lead, index) => {
            qualifications.set(lead.id, results[index])
        })

        // Small delay between batches
        if (i + batchSize < leads.length) {
            await new Promise(resolve => setTimeout(resolve, 500))
        }
    }

    return qualifications
}

/**
 * Quick fit score calculation (lightweight, no AI)
 */
export function calculateQuickFitScore(lead: Lead, companyProfile?: CompanyProfile): number {
    const profile = companyProfile || getDefaultCompanyProfile()
    let score = 50 // Base score

    // Industry match (+30 points)
    if (lead.industry && profile.targetIndustries.some(
        ind => ind.toLowerCase() === lead.industry?.toLowerCase()
    )) {
        score += 30
    }

    // Company size match (+20 points)
    if (lead.company_size && profile.idealCustomerProfile.companySizes.includes(lead.company_size)) {
        score += 20
    }

    // Has company info (+10 points)
    if (lead.company) {
        score += 10
    }

    // Has title info (+10 points)
    if (lead.title) {
        score += 10
    }

    // Existing lead score influence (-20 to +20)
    if (lead.lead_score) {
        if (lead.lead_score >= 80) score += 20
        else if (lead.lead_score >= 60) score += 10
        else if (lead.lead_score < 40) score -= 10
        else if (lead.lead_score < 20) score -= 20
    }

    return Math.max(0, Math.min(100, score))
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDefaultCompanyProfile(): CompanyProfile {
    return {
        name: 'Eventra',
        products: [
            'Event Management Platform',
            'Lead Generation Tools',
            'Marketing Automation',
            'Analytics & Reporting'
        ],
        targetIndustries: [
            'Technology',
            'Professional Services',
            'Marketing & Advertising',
            'Education',
            'Healthcare',
            'Finance',
            'Manufacturing'
        ],
        idealCustomerProfile: {
            companySizes: ['1-50', '50-200', '200-1000', '1000+'],
            jobRoles: [
                'Event Manager',
                'Marketing Director',
                'Sales Director',
                'VP Marketing',
                'CMO'
            ],
            commonPainPoints: [
                'Manual event planning processes',
                'Inefficient lead tracking',
                'Lack of marketing automation',
                'Poor event ROI visibility',
                'Fragmented event tools'
            ]
        }
    }
}
