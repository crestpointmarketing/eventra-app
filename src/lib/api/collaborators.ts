import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// ============================================
// Types
// ============================================
export interface TaskCollaborator {
    id: string
    task_id: string
    user_id: string
    role: string
    created_at: string
    // Joined data
    user?: { id: string; email: string }
}

export interface AddCollaboratorData {
    task_id: string
    user_id: string
    role?: string
}

// ============================================
// Fetch Collaborators for Task
// ============================================
export async function fetchTaskCollaborators(taskId: string) {
    const { data, error } = await supabase
        .from('task_collaborators')
        .select(`
      *,
      user:user_id (id, email)
    `)
        .eq('task_id', taskId)

    if (error) throw error
    return data as TaskCollaborator[]
}

// ============================================
// Add Collaborator
// ============================================
export async function addCollaborator(collaboratorData: AddCollaboratorData) {
    const { data, error } = await supabase
        .from('task_collaborators')
        .insert(collaboratorData)
        .select(`
      *,
      user:user_id (id, email)
    `)
        .single()

    if (error) throw error
    return data as TaskCollaborator
}

// ============================================
// Remove Collaborator
// ============================================
export async function removeCollaborator(collaboratorId: string) {
    const { error } = await supabase
        .from('task_collaborators')
        .delete()
        .eq('id', collaboratorId)

    if (error) throw error
}

// ============================================
// Update Collaborator Role
// ============================================
export async function updateCollaboratorRole(collaboratorId: string, role: string) {
    const { data, error } = await supabase
        .from('task_collaborators')
        .update({ role })
        .eq('id', collaboratorId)
        .select(`
      *,
      user:user_id (id, email)
    `)
        .single()

    if (error) throw error
    return data as TaskCollaborator
}
