// CSV Export Utility

export function convertToCSV(data: any[], headers: string[]): string {
    if (!data || data.length === 0) return ''

    // Create header row
    const headerRow = headers.join(',')

    // Create data rows
    const dataRows = data.map(row => {
        return headers.map(header => {
            const value = row[header]

            // Handle null/undefined
            if (value === null || value === undefined) return ''

            // Escape quotes and wrap in quotes if contains comma or quote
            const stringValue = String(value)
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`
            }

            return stringValue
        }).join(',')
    })

    return [headerRow, ...dataRows].join('\n')
}

export function downloadCSV(csvContent: string, filename: string) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

export function exportEventsToCSV(events: any[]) {
    const headers = ['name', 'event_type', 'start_date', 'end_date', 'location', 'total_budget', 'target_leads', 'actual_leads']
    const csv = convertToCSV(events, headers)
    const timestamp = new Date().toISOString().split('T')[0]
    downloadCSV(csv, `eventra_events_${timestamp}.csv`)
}

export function exportLeadsToCSV(leads: any[]) {
    const processedLeads = leads.map(lead => ({
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        company: lead.company,
        job_title: lead.job_title,
        event: lead.events?.name || 'N/A',
        lead_score: lead.lead_score || 0,
        lead_status: lead.lead_status || lead.stage || 'new'
    }))

    const headers = ['first_name', 'last_name', 'email', 'company', 'job_title', 'event', 'lead_score', 'lead_status']
    const csv = convertToCSV(processedLeads, headers)
    const timestamp = new Date().toISOString().split('T')[0]
    downloadCSV(csv, `eventra_leads_${timestamp}.csv`)
}

export function exportTasksToCSV(tasks: any[]) {
    const processedTasks = tasks.map(task => ({
        title: task.title,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date,
        event: task.events?.name || 'N/A',
        owner: task.assigned_user?.email || 'Unassigned',
        description: task.description || ''
    }))

    const headers = ['title', 'status', 'priority', 'due_date', 'event', 'owner', 'description']
    const csv = convertToCSV(processedTasks, headers)
    const timestamp = new Date().toISOString().split('T')[0]
    downloadCSV(csv, `eventra_tasks_${timestamp}.csv`)
}

export function downloadCSVTemplate() {
    const headers = ['first_name', 'last_name', 'email', 'company', 'job_title', 'phone', 'industry', 'event_id']
    // Create an empty row or sample row to help users understand format
    const sampleRow = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        company: 'Acme Corp',
        job_title: 'Manager',
        phone: '123-456-7890',
        industry: 'SaaS',
        event_id: 'optional-event-id'
    }
    const csv = convertToCSV([sampleRow], headers)
    downloadCSV(csv, 'lead_import_template.csv')
}
