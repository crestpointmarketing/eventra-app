import { createClient } from '@/lib/supabase/server'

/**
 * Activity types for lead tracking
 */
export const ACTIVITY_TYPES = {
    // Email activities
    EMAIL_RECOMMENDED: 'email_recommended',
    EMAIL_DRAFTED: 'email_drafted',
    EMAIL_COPIED: 'email_copied',
    EMAIL_SENT: 'email_sent',

    // Other activities (for future use)
    CALL_MADE: 'call_made',
    MEETING_SCHEDULED: 'meeting_scheduled',
    NOTE_ADDED: 'note_added',
    STATUS_CHANGED: 'status_changed',
} as const

export type ActivityType = typeof ACTIVITY_TYPES[keyof typeof ACTIVITY_TYPES]

/**
 * Log an activity for a lead
 * @param leadId - The lead ID
 * @param activityType - Type of activity
 * @param activityData - Additional data specific to the activity
 * @returns The created activity record or null if failed
 */
export async function logLeadActivity(
    leadId: string,
    activityType: ActivityType,
    activityData?: Record<string, any>
) {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('lead_activities')
            .insert({
                lead_id: leadId,
                activity_type: activityType,
                activity_data: activityData || {},
            })
            .select()
            .single()

        if (error) {
            console.error('[logLeadActivity] Error:', error)
            return null
        }

        console.log(`[logLeadActivity] Logged ${activityType} for lead ${leadId}`)
        return data
    } catch (error) {
        console.error('[logLeadActivity] Exception:', error)
        return null
    }
}

/**
 * Get activities for a lead
 * @param leadId - The lead ID
 * @param limit - Maximum number of activities to return
 * @returns Array of activities
 */
export async function getLeadActivities(leadId: string, limit: number = 50) {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('lead_activities')
            .select('*')
            .eq('lead_id', leadId)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) {
            console.error('[getLeadActivities] Error:', error)
            return []
        }

        return data || []
    } catch (error) {
        console.error('[getLeadActivities] Exception:', error)
        return []
    }
}

/**
 * Get activity count by type for a lead
 * @param leadId - The lead ID
 * @param activityType - Optional filter by activity type
 * @returns Count of activities
 */
export async function getActivityCount(leadId: string, activityType?: ActivityType) {
    try {
        const supabase = await createClient()

        let query = supabase
            .from('lead_activities')
            .select('*', { count: 'exact', head: true })
            .eq('lead_id', leadId)

        if (activityType) {
            query = query.eq('activity_type', activityType)
        }

        const { count, error } = await query

        if (error) {
            console.error('[getActivityCount] Error:', error)
            return 0
        }

        return count || 0
    } catch (error) {
        console.error('[getActivityCount] Exception:', error)
        return 0
    }
}
