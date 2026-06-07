import type { SupabaseClient } from '@supabase/supabase-js'
import { dateOnlyToLocalDate } from '@/lib/date-only'

interface DefaultTaskTemplate {
    title: string
    description: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    daysBeforeEvent: number
}

const DEFAULT_TASKS: DefaultTaskTemplate[] = [
    {
        title: 'Confirm event fit and target audience',
        description: 'Review audience profile, sponsor value, and whether the event aligns with current campaign priorities.',
        priority: 'high',
        daysBeforeEvent: 90,
    },
    {
        title: 'Build sponsor or attendance ROI plan',
        description: 'Estimate cost, lead target, meeting goals, and success metrics before committing resources.',
        priority: 'medium',
        daysBeforeEvent: 75,
    },
    {
        title: 'Create target lead and account list',
        description: 'Identify priority companies, speakers, sponsors, and attendees to research before the event.',
        priority: 'high',
        daysBeforeEvent: 60,
    },
    {
        title: 'Prepare outreach and campaign assets',
        description: 'Draft email copy, social posts, landing page notes, and talking points for event outreach.',
        priority: 'medium',
        daysBeforeEvent: 45,
    },
    {
        title: 'Schedule meetings and follow-up workflow',
        description: 'Book high-priority meetings and define the post-event follow-up sequence.',
        priority: 'high',
        daysBeforeEvent: 30,
    },
]

function formatDateOnlyLocal(date: Date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function dueDateBeforeEvent(startDate: string | null | undefined, daysBeforeEvent: number) {
    if (!startDate) return null
    const date = dateOnlyToLocalDate(startDate)
    date.setDate(date.getDate() - daysBeforeEvent)
    return formatDateOnlyLocal(date)
}

export function buildDefaultEventTasks(eventId: string, startDate?: string | null) {
    return DEFAULT_TASKS.map(task => ({
        event_id: eventId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        due_date: dueDateBeforeEvent(startDate, task.daysBeforeEvent),
        status: 'pending',
    }))
}

export async function seedDefaultEventTasks(
    supabase: SupabaseClient,
    eventId: string,
    startDate?: string | null
) {
    const tasks = buildDefaultEventTasks(eventId, startDate)
    const { error } = await supabase.from('tasks').insert(tasks)
    if (error) throw error
    return tasks.length
}
