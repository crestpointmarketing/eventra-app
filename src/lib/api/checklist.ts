import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// ============================================
// Types
// ============================================
export interface ChecklistItem {
    id: string
    task_id: string
    title: string
    is_completed: boolean
    position: number
    created_at: string
    completed_at: string | null
}

export interface CreateChecklistItemData {
    task_id: string
    title: string
    position?: number
}

// ============================================
// Fetch Checklist Items for Task
// ============================================
export async function fetchTaskChecklist(taskId: string) {
    const { data, error } = await supabase
        .from('task_checklist_items')
        .select('*')
        .eq('task_id', taskId)
        .order('position', { ascending: true })

    if (error) throw error
    return data as ChecklistItem[]
}

// ============================================
// Create Checklist Item
// ============================================
export async function createChecklistItem(itemData: CreateChecklistItemData) {
    // If no position provided, get the max position and add 1
    if (itemData.position === undefined) {
        const { data: existingItems } = await supabase
            .from('task_checklist_items')
            .select('position')
            .eq('task_id', itemData.task_id)
            .order('position', { ascending: false })
            .limit(1)

        const maxPosition = existingItems?.[0]?.position ?? -1
        itemData.position = maxPosition + 1
    }

    const { data, error } = await supabase
        .from('task_checklist_items')
        .insert(itemData)
        .select()
        .single()

    if (error) throw error
    return data as ChecklistItem
}

// ============================================
// Toggle Checklist Item Completion
// ============================================
export async function toggleChecklistItem(itemId: string, isCompleted: boolean) {
    const { data, error } = await supabase
        .from('task_checklist_items')
        .update({
            is_completed: isCompleted,
            completed_at: isCompleted ? new Date().toISOString() : null
        })
        .eq('id', itemId)
        .select()
        .single()

    if (error) throw error
    return data as ChecklistItem
}

// ============================================
// Update Checklist Item
// ============================================
export async function updateChecklistItem(itemId: string, updates: Partial<ChecklistItem>) {
    const { data, error } = await supabase
        .from('task_checklist_items')
        .update(updates)
        .eq('id', itemId)
        .select()
        .single()

    if (error) throw error
    return data as ChecklistItem
}

// ============================================
// Delete Checklist Item
// ============================================
export async function deleteChecklistItem(itemId: string) {
    const { error } = await supabase
        .from('task_checklist_items')
        .delete()
        .eq('id', itemId)

    if (error) throw error
}

// ============================================
// Reorder Checklist Items
// ============================================
export async function reorderChecklistItems(taskId: string, itemIds: string[]) {
    // Update position for each item based on array order
    const updates = itemIds.map((id, index) =>
        supabase
            .from('task_checklist_items')
            .update({ position: index })
            .eq('id', id)
            .eq('task_id', taskId)
    )

    const results = await Promise.all(updates)

    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
        throw errors[0].error
    }
}
