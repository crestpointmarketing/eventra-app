// =========================
// EMAIL TEMPLATES API
// =========================

import { createClient } from '@/lib/supabase/client'
import { safeGetUser } from '@/lib/supabase/auth'
import type {
    EmailTemplate,
    EmailTemplateWithDetails,
    CreateEmailTemplateInput,
    UpdateEmailTemplateInput,
    EmailTemplateFilters,
} from '@/types/email-templates'

let _supabase: ReturnType<typeof createClient> | null = null
function getSupabase(): ReturnType<typeof createClient> {
    if (!_supabase) _supabase = createClient()
    return _supabase
}

// Fetch all templates with optional filters
export async function getEmailTemplates(filters?: EmailTemplateFilters) {
    let query = getSupabase()
        .from('email_templates')
        .select('*')
        .is('deleted_at', null)
        .order('category')
        .order('name')

    if (filters?.category) {
        query = query.eq('category', filters.category)
    }

    if (filters?.goal) {
        query = query.eq('goal', filters.goal)
    }

    if (filters?.tone) {
        query = query.eq('tone', filters.tone)
    }

    if (filters?.status) {
        query = query.eq('status', filters.status)
    }

    if (filters?.is_system !== undefined) {
        query = query.eq('is_system', filters.is_system)
    }

    if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) throw error
    return data as EmailTemplate[]
}

// Fetch a single template with all details
export async function getEmailTemplateById(id: string) {
    const { data: template, error: templateError } = await getSupabase()
        .from('email_templates')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single()

    if (templateError) throw templateError

    // Fetch subjects
    const { data: subjects, error: subjectsError } = await getSupabase()
        .from('email_template_subjects')
        .select('*')
        .eq('template_id', id)
        .order('sort_order')

    if (subjectsError) throw subjectsError

    // Fetch blocks
    const { data: blocks, error: blocksError } = await getSupabase()
        .from('email_template_blocks')
        .select('*')
        .eq('template_id', id)
        .order('sort_order')

    if (blocksError) throw blocksError

    // Fetch CTA
    const { data: cta, error: ctaError } = await getSupabase()
        .from('email_template_ctas')
        .select('*')
        .eq('template_id', id)
        .maybeSingle()

    if (ctaError) throw ctaError

    return {
        ...template,
        subjects: subjects || [],
        blocks: blocks || [],
        cta: cta || null,
    } as EmailTemplateWithDetails
}

async function saveTemplate(input: CreateEmailTemplateInput | UpdateEmailTemplateInput) {
    const { data, error } = await getSupabase().rpc('save_email_template', { payload: input })
    if (error) throw new Error(error.code === '40001' ? 'This template changed. Reload it before saving.' : error.message)
    return data as EmailTemplate
}
export async function createEmailTemplate(input: CreateEmailTemplateInput) { return saveTemplate(input) }
export async function updateEmailTemplate(input: UpdateEmailTemplateInput) { return saveTemplate(input) }

// Soft delete a template
export async function deleteEmailTemplate(id: string) {
    const user = await safeGetUser(getSupabase())
    const { data: template, error: readError } = await getSupabase().from('email_templates').select('created_by,is_system').eq('id', id).single()
    if (readError) throw readError
    if (!user || template.is_system || template.created_by !== user.id) throw new Error('Only the template owner can delete it')
    const { error } = await getSupabase()
        .from('email_templates')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

    if (error) throw error
}

// Duplicate a template (uses RPC function)
export async function duplicateEmailTemplate(templateId: string, newName?: string) {
    const { data, error } = await getSupabase().rpc('rpc_duplicate_email_template', {
        p_template_id: templateId,
        p_new_name: newName || null,
    })

    if (error) throw error
    return data as string // Returns new template ID
}

// Update template status
export async function updateTemplateStatus(
    id: string,
    status: 'active' | 'disabled' | 'archived'
) {
    const { data, error } = await getSupabase()
        .from('email_templates')
        .update({ status })
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as EmailTemplate
}

// Increment usage count
export async function incrementTemplateUsage(id: string) {
    // Fetch current count
    const { data: template } = await getSupabase()
        .from('email_templates')
        .select('usage_count')
        .eq('id', id)
        .single()

    if (!template) throw new Error('Template not found')

    // Update with incremented count
    const { error } = await getSupabase()
        .from('email_templates')
        .update({ usage_count: template.usage_count + 1 })
        .eq('id', id)

    if (error) throw error
}
