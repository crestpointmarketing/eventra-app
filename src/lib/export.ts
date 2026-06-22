// CSV Export Utility

import type { Borders } from 'exceljs'
import { normalizeEventPriority } from '@/lib/events/priority'
import { normalizeEngagementType, normalizeEventType } from '@/lib/events/taxonomy'

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

export async function exportEventsToCSV(events: any[]) {
    const ExcelJS = (await import('exceljs')).default

    const COLUMNS = [
        { key: 'name',               label: 'Event Name',      width: 40 },
        { key: 'event_type',         label: 'Type',            width: 14 },
        { key: 'status',             label: 'Status',          width: 14 },
        { key: 'start_date',         label: 'Start Date',      width: 14 },
        { key: 'end_date',           label: 'End Date',        width: 14 },
        { key: 'location',           label: 'Location',        width: 28 },
        { key: 'website_url',        label: 'Website',         width: 42 },
        { key: 'source',             label: 'Source',          width: 16 },
        { key: 'discovery_priority', label: 'Priority',        width: 12 },
        { key: 'engagement_type',    label: 'Engagement',      width: 16 },
        { key: 'focus_area',         label: 'Focus Area',      width: 24 },
        { key: 'target_audience',    label: 'Target Audience', width: 28 },
        { key: 'description',        label: 'Description',     width: 60 },
    ]

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Events')

    ws.columns = COLUMNS.map(c => ({ header: c.label, key: c.key, width: c.width }))

    // Freeze header row
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }]

    const border: Partial<Borders> = {
        top:    { style: 'thin', color: { argb: 'FFD4D4D8' } },
        bottom: { style: 'thin', color: { argb: 'FFD4D4D8' } },
        left:   { style: 'thin', color: { argb: 'FFD4D4D8' } },
        right:  { style: 'thin', color: { argb: 'FFD4D4D8' } },
    }

    // Header row — dark background, white bold text, centered, 36px tall
    const headerRow = ws.getRow(1)
    headerRow.height = 36
    headerRow.eachCell({ includeEmpty: true }, cell => {
        cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3F3F46' } }
        cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' }
        cell.border    = border
    })

    // Data rows — wrap text, top-aligned, bordered
    events.forEach(e => {
        const normalizedEvent = {
            ...e,
            event_type: normalizeEventType(e.event_type),
            discovery_priority: normalizeEventPriority(e.discovery_priority),
            engagement_type: normalizeEngagementType(e.engagement_type),
        }
        const row = ws.addRow(COLUMNS.reduce((acc, c) => ({ ...acc, [c.key]: normalizedEvent[c.key] ?? '' }), {}))
        row.eachCell({ includeEmpty: true }, cell => {
            cell.alignment = { wrapText: true, vertical: 'top' }
            cell.border    = border
            cell.font      = { size: 10 }
        })
    })

    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `eventra_events_${new Date().toISOString().split('T')[0]}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
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
