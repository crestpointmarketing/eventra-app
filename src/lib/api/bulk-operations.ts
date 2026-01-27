import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted'

/**
 * Bulk update lead status for multiple leads
 */
export async function bulkUpdateLeadStatus(
    leadIds: string[],
    newStatus: LeadStatus
): Promise<void> {
    if (leadIds.length === 0) {
        throw new Error('No leads provided for bulk update')
    }

    const { error } = await supabase
        .from('leads')
        .update({ lead_status: newStatus })
        .in('id', leadIds)

    if (error) {
        throw new Error(`Failed to update lead status: ${error.message}`)
    }
}
