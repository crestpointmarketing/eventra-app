import { z } from 'zod'

export const createLeadSchema = z.object({
    first_name: z.string().trim().min(1).max(255), last_name: z.string().trim().max(255).default(''),
    email: z.email().trim().toLowerCase(), company: z.string().trim().max(500).default(''),
    job_title: z.string().max(255).optional(), phone: z.string().max(50).optional(),
    location: z.string().optional(), industry: z.string().max(100).optional(),
    event_id: z.preprocess(v => v === '' || v === undefined ? null : v, z.uuid().nullable()).optional(),
    stage: z.enum(['new', 'contacted', 'qualified', 'converted']).default('new'),
    priority: z.enum(['hot', 'warm', 'cold']).default('cold'),
})

export function leadForAI<T extends Record<string, any>>(lead: T) {
    return { ...lead, id: String(lead.id), email: String(lead.email ?? ""), name: [lead.first_name, lead.last_name].filter(Boolean).join(' '),
        title: lead.job_title, notes: lead.raw_notes, status: lead.stage,
        lead_score: lead.metadata?.ai_score ?? null }
}
