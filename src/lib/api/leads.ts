import { createClient } from '@/lib/supabase/client'
import { createLeadSchema } from '@/lib/leads/model'
import type { z } from 'zod'
export type CreateLeadDTO = z.input<typeof createLeadSchema>
export async function createLead(input: CreateLeadDTO) {
    const db = createClient()
    const { data: { user }, error: authError } = await db.auth.getUser()
    if (authError || !user) throw new Error('Please sign in again')
    const lead = createLeadSchema.parse(input)
    const { data, error } = await db.from('leads').insert({ ...lead, owner_id: user.id, normalized_email: lead.email }).select().single()
    if (error) throw new Error(error.code === '23505' ? 'This event already has a lead with this email' : error.message)
    return data
}
