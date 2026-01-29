// Company Intelligence Types

export interface CompanyDNA {
    description?: string
    products: string[]
    industries: string[]
    stage?: 'startup' | 'growth' | 'enterprise'
    compliance: string[]
    market?: 'us' | 'apac' | 'europe' | 'global'
}

export interface ICPData {
    companySizes: string[]
    jobTitles: string[]
    industries: string[]
    budgetMin?: number
    budgetMax?: number
}

export interface GTMStrategy {
    goal?: 'brand_awareness' | 'pipeline' | 'revenue' | 'partnership'
    icp: ICPData
    dealSize: {
        min?: number
        max?: number
    }
    salesCycle?: '1-3mo' | '3-6mo' | '6-12mo' | '12mo+'
    differentiators: string[]
    notes?: string
}

export interface AIGuidanceRules {
    followupStyle?: 'aggressive' | 'balanced' | 'consultative'
    riskTolerance?: 'conservative' | 'moderate' | 'aggressive'
    behaviors: string[]
    tone?: 'professional' | 'friendly' | 'casual'
}

export interface CompanyContext {
    dna: CompanyDNA
    gtm: GTMStrategy
    ai_rules: AIGuidanceRules
}

export interface CompanyIntelligence {
    id?: string
    user_id?: string
    organization_id?: string

    // Company DNA
    company_description?: string
    core_products: string[]
    target_industries: string[]
    company_stage?: 'startup' | 'growth' | 'enterprise'
    compliance_requirements: string[]
    primary_market?: 'us' | 'apac' | 'europe' | 'global'

    // GTM Strategy
    primary_business_goal?: 'brand_awareness' | 'pipeline' | 'revenue' | 'partnership'
    icp_data: ICPData
    typical_deal_size_min?: number
    typical_deal_size_max?: number
    sales_cycle_length?: '1-3mo' | '3-6mo' | '6-12mo' | '12mo+'
    key_differentiators: string[]
    strategic_notes?: string

    // AI Guidance Rules
    followup_style?: 'aggressive' | 'balanced' | 'consultative'
    risk_tolerance?: 'conservative' | 'moderate' | 'aggressive'
    ai_behaviors: string[]
    tone_preference?: 'professional' | 'friendly' | 'casual'

    // Metadata
    is_draft: boolean
    created_at?: string
    updated_at?: string
}

// Helper function to convert DB format to context format
export function intelligenceToContext(intelligence: CompanyIntelligence | null): CompanyContext {
    if (!intelligence) {
        return getDefaultContext()
    }

    return {
        dna: {
            description: intelligence.company_description,
            products: intelligence.core_products || [],
            industries: intelligence.target_industries || [],
            stage: intelligence.company_stage,
            compliance: intelligence.compliance_requirements || [],
            market: intelligence.primary_market
        },
        gtm: {
            goal: intelligence.primary_business_goal,
            icp: intelligence.icp_data || {
                companySizes: [],
                jobTitles: [],
                industries: [],
            },
            dealSize: {
                min: intelligence.typical_deal_size_min,
                max: intelligence.typical_deal_size_max
            },
            salesCycle: intelligence.sales_cycle_length,
            differentiators: intelligence.key_differentiators || [],
            notes: intelligence.strategic_notes
        },
        ai_rules: {
            followupStyle: intelligence.followup_style,
            riskTolerance: intelligence.risk_tolerance,
            behaviors: intelligence.ai_behaviors || [],
            tone: intelligence.tone_preference
        }
    }
}

// Default context when no intelligence is configured
export function getDefaultContext(): CompanyContext {
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

// Empty template for new users
export function getEmptyIntelligence(): Partial<CompanyIntelligence> {
    return {
        core_products: [],
        target_industries: [],
        compliance_requirements: [],
        icp_data: {
            companySizes: [],
            jobTitles: [],
            industries: []
        },
        key_differentiators: [],
        ai_behaviors: [],
        is_draft: true
    }
}
