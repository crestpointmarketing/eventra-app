import { createClient } from '@/lib/supabase/client'

export interface CreateLeadDTO {
    first_name: string
    last_name: string
    email: string
    company?: string
    job_title?: string
    phone?: string
    location?: string
    lead_score?: number
    status?: string
    priority?: string
    event_id?: string
    industry?: string
}

export async function createLead(lead: CreateLeadDTO) {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('leads')
        .insert([lead])
        .select()
        .single()

    if (error) {
        throw new Error(error.message)
    }

    return data
}
