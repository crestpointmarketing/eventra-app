import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// ============================================
// Types
// ============================================
export interface Task {
    id: string
    event_id: string
    title: string
    description: string | null
    status: 'draft' | 'pending' | 'in_progress' | 'review' | 'done' | 'archived'
    priority: 'low' | 'medium' | 'high' | 'urgent'
    assigned_to: string | null
    due_date: string | null
    estimated_cost: number | null
    actual_cost: number | null
    payment_status: 'unpaid' | 'partial' | 'paid' | null
    vendor_company: string | null
    contact_person: string | null
    created_at: string
    updated_at: string
    completed_at: string | null
    archived_at: string | null
    // Joined data
    events?: { id: string; name: string }
    assigned_user?: { id: string; email: string }
}

export interface TaskFilters {
    search?: string
    eventIds?: string[]
    statuses?: Task['status'][]
    assignedTo?: string
    dateFrom?: string
    dateTo?: string
    priorities?: Task['priority'][]
}

export interface CreateTaskData {
    event_id: string
    title: string
    description?: string
    status?: Task['status']
    priority?: Task['priority']
    assigned_to?: string
    due_date?: string
    estimated_cost?: number
    actual_cost?: number
    payment_status?: Task['payment_status']
    vendor_company?: string
    contact_person?: string
}

export interface UpdateTaskData extends Partial<CreateTaskData> {
    completed_at?: string | null
    archived_at?: string | null
}

// ============================================
// Fetch Tasks (with filters)
// ============================================
export async function fetchTasks(filters?: TaskFilters) {
    console.log('🔵 fetchTasks called with filters:', filters)

    let query = supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true })

    // Apply filters
    if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    if (filters?.eventIds && filters.eventIds.length > 0) {
        query = query.in('event_id', filters.eventIds)
    }

    if (filters?.statuses && filters.statuses.length > 0) {
        query = query.in('status', filters.statuses)
    }

    if (filters?.priorities && filters.priorities.length > 0) {
        query = query.in('priority', filters.priorities)
    }

    if (filters?.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo)
    }

    if (filters?.dateFrom) {
        query = query.gte('due_date', filters.dateFrom)
    }

    if (filters?.dateTo) {
        query = query.lte('due_date', filters.dateTo)
    }

    // Exclude archived by default
    query = query.is('archived_at', null)

    console.log('🟡 Executing query...')
    const { data, error } = await query

    if (error) {
        console.error('🔴 fetchTasks error:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        })
        throw error
    }

    console.log('🟢 fetchTasks success:', { count: data?.length, data })
    return data as Task[]
}

// ============================================
// Fetch Tasks for Specific Event
// ============================================
export async function fetchEventTasks(eventId: string) {
    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('event_id', eventId)
        .is('archived_at', null)
        .order('due_date', { ascending: true })

    if (error) throw error
    return data as Task[]
}

// ============================================
// Fetch Single Task
// ============================================
export async function fetchTask(taskId: string) {
    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single()

    if (error) throw error
    return data as Task
}

// ============================================
// Create Task
// ============================================
export async function createTask(taskData: CreateTaskData) {
    const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single()

    if (error) throw error
    return data as Task
}

// ============================================
// Update Task
// ============================================
export async function updateTask(taskId: string, updates: UpdateTaskData) {
    console.log('🔵 API: Updating task in database:', { taskId, updates })

    const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single()

    if (error) {
        console.error('🔴 API: Update task failed:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        })
        throw error
    }

    console.log('🟢 API: Task updated successfully:', data)
    return data as Task
}

// ============================================
// Delete Task
// ============================================
export async function deleteTask(taskId: string) {
    const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

    if (error) throw error
}

// ============================================
// Archive Task
// ============================================
export async function archiveTask(taskId: string) {
    const { data, error } = await supabase
        .from('tasks')
        .update({
            status: 'archived' as Task['status'],
            archived_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .select()
        .single()

    if (error) throw error
    return data as Task
}

// ============================================
// Mark Task as Done
// ============================================
export async function markTaskAsDone(taskId: string) {
    const { data, error } = await supabase
        .from('tasks')
        .update({
            status: 'done' as Task['status'],
            completed_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .select()
        .single()

    if (error) throw error
    return data as Task
}
