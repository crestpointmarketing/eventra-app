// =========================
// EMAIL TEMPLATES API
// =========================

import { createClient } from '@/lib/supabase/client'
import type {
    EmailTemplate,
    EmailTemplateWithDetails,
    CreateEmailTemplateInput,
    UpdateEmailTemplateInput,
    EmailTemplateFilters,
} from '@/types/email-templates'

const supabase = createClient()

// Fetch all templates with optional filters
export async function getEmailTemplates(filters?: EmailTemplateFilters) {
    let query = supabase
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
    const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single()

    if (templateError) throw templateError

    // Fetch subjects
    const { data: subjects, error: subjectsError } = await supabase
        .from('email_template_subjects')
        .select('*')
        .eq('template_id', id)
        .order('sort_order')

    if (subjectsError) throw subjectsError

    // Fetch blocks
    const { data: blocks, error: blocksError } = await supabase
        .from('email_template_blocks')
        .select('*')
        .eq('template_id', id)
        .order('sort_order')

    if (blocksError) throw blocksError

    // Fetch CTA
    const { data: cta, error: ctaError } = await supabase
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

// Create a new template
export async function createEmailTemplate(input: CreateEmailTemplateInput) {
    const { subjects, blocks, cta, ...templateData } = input

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Create template
    const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .insert({
            ...templateData,
            created_by: user.id,
            is_system: false,
        })
        .select()
        .single()

    if (templateError) throw templateError

    // Create subjects
    const { error: subjectsError } = await supabase
        .from('email_template_subjects')
        .insert(
            subjects.map((s) => ({
                template_id: template.id,
                ...s,
            }))
        )

    if (subjectsError) throw subjectsError

    // Create blocks
    const { error: blocksError } = await supabase
        .from('email_template_blocks')
        .insert(
            blocks.map((b) => ({
                template_id: template.id,
                ...b,
            }))
        )

    if (blocksError) throw blocksError

    // Create CTA
    const { error: ctaError } = await supabase
        .from('email_template_ctas')
        .insert({
            template_id: template.id,
            ...cta,
        })

    if (ctaError) throw ctaError

    return template as EmailTemplate
}

// Update an existing template
export async function updateEmailTemplate(input: UpdateEmailTemplateInput) {
    const { id, subjects, blocks, cta, ...templateData } = input

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Update template (version will auto-increment via trigger)
    const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .update({
            ...templateData,
            updated_by: user.id,
        })
        .eq('id', id)
        .select()
        .single()

    if (templateError) throw templateError

    // Update subjects if provided
    if (subjects) {
        // Delete existing subjects
        await supabase.from('email_template_subjects').delete().eq('template_id', id)

        // Insert new subjects
        const { error: subjectsError } = await supabase
            .from('email_template_subjects')
            .insert(
                subjects.map((s) => ({
                    template_id: id,
                    ...s,
                }))
            )

        if (subjectsError) throw subjectsError
    }

    // Update blocks if provided
    if (blocks) {
        // Delete existing blocks
        await supabase.from('email_template_blocks').delete().eq('template_id', id)

        // Insert new blocks
        const { error: blocksError } = await supabase
            .from('email_template_blocks')
            .insert(
                blocks.map((b) => ({
                    template_id: id,
                    ...b,
                }))
            )

        if (blocksError) throw blocksError
    }

    // Update CTA if provided
    if (cta) {
        // Delete existing CTA
        await supabase.from('email_template_ctas').delete().eq('template_id', id)

        // Insert new CTA
        const { error: ctaError } = await supabase
            .from('email_template_ctas')
            .insert({
                template_id: id,
                ...cta,
            })

        if (ctaError) throw ctaError
    }

    return template as EmailTemplate
}

// Soft delete a template
export async function deleteEmailTemplate(id: string) {
    const { error } = await supabase
        .from('email_templates')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

    if (error) throw error
}

// Duplicate a template (uses RPC function)
export async function duplicateEmailTemplate(templateId: string, newName?: string) {
    const { data, error } = await supabase.rpc('rpc_duplicate_email_template', {
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
    const { data, error } = await supabase
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
    const { data: template } = await supabase
        .from('email_templates')
        .select('usage_count')
        .eq('id', id)
        .single()

    if (!template) throw new Error('Template not found')

    // Update with incremented count
    const { error } = await supabase
        .from('email_templates')
        .update({ usage_count: template.usage_count + 1 })
        .eq('id', id)

    if (error) throw error
}
