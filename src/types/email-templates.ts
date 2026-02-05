// =========================
// EMAIL TEMPLATES TYPES
// =========================

export type EmailTemplateCategory = 'follow_up' | 'warm_up' | 'product_info'
export type EmailTemplateGoal = 'book_meeting' | 'share_info' | 'reengage' | 'qualify'
export type EmailTemplateTone = 'professional' | 'friendly' | 'concise' | 'technical'
export type EmailTemplateLanguage = 'en' | 'zh' | 'bilingual'
export type EmailTemplateStatus = 'active' | 'disabled' | 'archived'
export type EmailBlockType = 'opening' | 'event_context' | 'value_prop' | 'proof' | 'cta' | 'signature'
export type EmailCtaType = 'book_call' | 'reply' | 'download' | 'visit_page'

export interface EmailTemplate {
    id: string
    created_by: string | null
    name: string
    category: EmailTemplateCategory
    goal: EmailTemplateGoal
    tone: EmailTemplateTone
    language: EmailTemplateLanguage
    status: EmailTemplateStatus
    personas: string[]
    is_system: boolean
    updated_by: string | null
    version: number
    usage_count: number
    max_words: number | null
    forbidden_claims: string[]
    notes: string | null
    created_at: string
    updated_at: string
    deleted_at: string | null
}

export interface EmailTemplateSubject {
    id: string
    template_id: string
    sort_order: number
    subject: string
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface EmailTemplateBlock {
    id: string
    template_id: string
    block_type: EmailBlockType
    sort_order: number
    content: string
    allowed_vars: string[]
    ai_guidance: string | null
    created_at: string
    updated_at: string
}

export interface EmailTemplateCta {
    id: string
    template_id: string
    cta_type: EmailCtaType
    cta_text: string
    cta_url: string | null
    created_at: string
    updated_at: string
}

// Full template with all related data
export interface EmailTemplateWithDetails extends EmailTemplate {
    subjects: EmailTemplateSubject[]
    blocks: EmailTemplateBlock[]
    cta: EmailTemplateCta | null
}

// For creating/updating templates
export interface CreateEmailTemplateInput {
    name: string
    category: EmailTemplateCategory
    goal: EmailTemplateGoal
    tone?: EmailTemplateTone
    language?: EmailTemplateLanguage
    status?: EmailTemplateStatus
    personas?: string[]
    max_words?: number | null
    forbidden_claims?: string[]
    notes?: string | null
    subjects: Array<{
        sort_order: number
        subject: string
        is_active?: boolean
    }>
    blocks: Array<{
        block_type: EmailBlockType
        sort_order: number
        content: string
        allowed_vars: string[]
        ai_guidance?: string | null
    }>
    cta: {
        cta_type: EmailCtaType
        cta_text: string
        cta_url?: string | null
    }
}

export interface UpdateEmailTemplateInput extends Partial<CreateEmailTemplateInput> {
    id: string
}

// Filter and search params
export interface EmailTemplateFilters {
    category?: EmailTemplateCategory
    goal?: EmailTemplateGoal
    tone?: EmailTemplateTone
    status?: EmailTemplateStatus
    is_system?: boolean
    search?: string
}
