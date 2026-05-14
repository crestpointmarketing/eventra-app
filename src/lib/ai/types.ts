export interface Lead {
    id: string
    name: string
    email: string
    company?: string
    title?: string
    industry?: string
    company_size?: string
    notes?: string
    lead_score?: number
}

export interface AIEvent {
    id: string
    name: string
    event_type: string
    description?: string
    url?: string
    owner_id?: string
    start_date?: string
    end_date?: string
    location?: string
    budget?: number
    expected_attendees?: number
}

export interface Task {
    id: string
    title: string
    description?: string
    status: string
    priority: string
    due_date?: string
    created_at: string
    dependencies?: string[]
}
