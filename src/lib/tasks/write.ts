import type { SupabaseClient } from '@supabase/supabase-js'

/** Default new tasks to their creator, who can then manage and delete them. */
export async function insertAssignedTask(db: SupabaseClient, input: Record<string, unknown>) {
    const { data: { user }, error: authError } = await db.auth.getUser()
    if (authError || !user) throw new Error('Please sign in again before creating a task.')
    const { data, error } = await db.from('tasks')
        .insert({ ...input, assigned_to: input.assigned_to || user.id })
        .select().single()
    if (error) throw error
    return data
}
