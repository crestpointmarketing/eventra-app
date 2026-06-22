import type { SupabaseClient } from '@supabase/supabase-js'
import { dateOnlyToLocalDate } from '@/lib/date-only'
import { decodeTaskModule, encodeTaskModule, type TaskModuleId } from '@/lib/tasks/modules'

interface DefaultTaskTemplate {
    title: string
    description: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    daysBeforeEvent: number
    paymentStatus?: 'unpaid' | 'partial' | 'paid'
    module: TaskModuleId
}

const DEFAULT_TASKS: DefaultTaskTemplate[] = [
    {
        title: 'Confirm event fit and target audience',
        description: 'Review audience profile, sponsor value, and whether the event aligns with current campaign priorities.',
        priority: 'high',
        daysBeforeEvent: 90,
        module: 'strategy',
    },
    {
        title: 'Define event goals, KPI targets, and success metrics',
        description: 'Set measurable registration, meeting, lead, pipeline, revenue, and ROI targets before execution begins.',
        priority: 'high',
        daysBeforeEvent: 100,
        module: 'strategy',
    },
    {
        title: 'Define ICP, buyer personas, and strategic accounts',
        description: 'Document the priority industries, company profiles, buying roles, and strategic customers the event should reach.',
        priority: 'high',
        daysBeforeEvent: 95,
        module: 'strategy',
    },
    {
        title: 'Review and sign event or sponsorship contract',
        description: 'Confirm deliverables, cancellation terms, payment schedule, approval owner, and invoice contact before signing the participation or sponsorship agreement.',
        priority: 'high',
        daysBeforeEvent: 85,
        module: 'budget_planning',
    },
    {
        title: 'Build sponsor or attendance ROI plan',
        description: 'Estimate cost, lead target, meeting goals, and success metrics before committing resources.',
        priority: 'medium',
        daysBeforeEvent: 75,
        module: 'budget_planning',
    },
    {
        title: 'Obtain and verify the event invoice',
        description: 'Request the invoice, confirm the legal entity, amount, tax details, payment instructions, purchase order requirements, and due date.',
        priority: 'urgent',
        daysBeforeEvent: 70,
        paymentStatus: 'unpaid',
        module: 'budget_planning',
    },
    {
        title: 'Build event budget and obtain internal approvals',
        description: 'Estimate sponsorship, travel, booth, shipping, content, and vendor costs and secure the required budget approvals.',
        priority: 'high',
        daysBeforeEvent: 90,
        module: 'budget_planning',
    },
    {
        title: 'Create target lead and account list',
        description: 'Identify priority companies, speakers, sponsors, and attendees to research before the event.',
        priority: 'high',
        daysBeforeEvent: 60,
        module: 'sales',
    },
    {
        title: 'Complete event payment and record confirmation',
        description: 'Submit payment approval before the invoice deadline, complete the payment, update its status, and retain the transaction confirmation.',
        priority: 'urgent',
        daysBeforeEvent: 55,
        paymentStatus: 'unpaid',
        module: 'budget_planning',
    },
    {
        title: 'Prepare outreach and campaign assets',
        description: 'Draft email copy, social posts, landing page notes, and talking points for event outreach.',
        priority: 'medium',
        daysBeforeEvent: 45,
        module: 'marketing',
    },
    {
        title: 'Confirm receipt and outstanding event balance',
        description: 'Obtain the official receipt or final invoice, verify that the payment was applied correctly, and resolve any remaining balance.',
        priority: 'high',
        daysBeforeEvent: 40,
        paymentStatus: 'unpaid',
        module: 'budget_planning',
    },
    {
        title: 'Schedule meetings and follow-up workflow',
        description: 'Book high-priority meetings and define the post-event follow-up sequence.',
        priority: 'high',
        daysBeforeEvent: 30,
        module: 'sales',
    },
    {
        title: 'Create event landing and registration pages',
        description: 'Publish clear event messaging, registration details, conversion tracking, and campaign attribution.',
        priority: 'high',
        daysBeforeEvent: 60,
        module: 'marketing',
    },
    {
        title: 'Launch invitation, reminder, and last-chance emails',
        description: 'Build the segmented email sequence, approvals, send schedule, and registration conversion tracking.',
        priority: 'high',
        daysBeforeEvent: 45,
        module: 'marketing',
    },
    {
        title: 'Launch LinkedIn, social, and paid media campaigns',
        description: 'Schedule organic posts and launch targeted LinkedIn, search, and retargeting campaigns where appropriate.',
        priority: 'medium',
        daysBeforeEvent: 40,
        module: 'marketing',
    },
    {
        title: 'Identify attendees and prioritize top prospects',
        description: 'Research the attendee and sponsor lists, score account fit, and identify the highest-value people to meet.',
        priority: 'urgent',
        daysBeforeEvent: 35,
        module: 'sales',
    },
    {
        title: 'Assign account owners and brief the sales team',
        description: 'Assign priority accounts, share attendee intelligence, align talking points, and define follow-up expectations.',
        priority: 'high',
        daysBeforeEvent: 21,
        module: 'sales',
    },
    {
        title: 'Book travel, hotel, and local transportation',
        description: 'Confirm attendee travel plans, accommodation, ground transportation, and contingency details.',
        priority: 'medium',
        daysBeforeEvent: 45,
        module: 'logistics_operations',
    },
    {
        title: 'Finalize booth layout, utilities, and vendors',
        description: 'Approve graphics, furniture, internet, power, photography, video, swag, and vendor delivery schedules.',
        priority: 'high',
        daysBeforeEvent: 35,
        module: 'logistics_operations',
    },
    {
        title: 'Prepare, ship, and track event materials',
        description: 'Inventory booth and campaign assets, ship them with buffer time, and verify delivery and return logistics.',
        priority: 'high',
        daysBeforeEvent: 14,
        module: 'logistics_operations',
    },
    {
        title: 'Conduct team briefing and assign event coverage',
        description: 'Review goals, booth schedule, meetings, talking points, escalation paths, and individual responsibilities.',
        priority: 'high',
        daysBeforeEvent: 5,
        module: 'execution',
    },
    {
        title: 'Run lead capture and customer engagement plan',
        description: 'Assign lead capture ownership, host demos, attend priority sessions, and record useful conversation context.',
        priority: 'urgent',
        daysBeforeEvent: 1,
        module: 'execution',
    },
    {
        title: 'Capture event content and customer interviews',
        description: 'Capture approved photos, videos, customer interviews, product demonstrations, and reusable social content.',
        priority: 'medium',
        daysBeforeEvent: 1,
        module: 'execution',
    },
    {
        title: 'Import, clean, and assign event leads in CRM',
        description: 'Deduplicate captured leads, enrich account data, record conversation notes, and assign accountable owners.',
        priority: 'urgent',
        daysBeforeEvent: -1,
        module: 'follow_up',
    },
    {
        title: 'Launch sales follow-up, discovery calls, and demos',
        description: 'Send contextual follow-up, schedule next steps, and move qualified conversations into active opportunities.',
        priority: 'urgent',
        daysBeforeEvent: -3,
        module: 'follow_up',
    },
    {
        title: 'Publish event recap and campaign highlights',
        description: 'Publish the recap, event insights, approved photos, customer highlights, and supporting social content.',
        priority: 'medium',
        daysBeforeEvent: -7,
        module: 'follow_up',
    },
    {
        title: 'Report event meetings, leads, pipeline, and revenue',
        description: 'Compare registrations, attendance, meetings, qualified leads, opportunities, pipeline, and influenced revenue against targets.',
        priority: 'high',
        daysBeforeEvent: -14,
        module: 'analytics_roi',
    },
    {
        title: 'Run retrospective and update the event playbook',
        description: 'Review ROI, execution gaps, sales feedback, lessons learned, and reusable recommendations for future events.',
        priority: 'medium',
        daysBeforeEvent: -21,
        module: 'analytics_roi',
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
        description: encodeTaskModule(task.description, task.module),
        priority: task.priority,
        due_date: dueDateBeforeEvent(startDate, task.daysBeforeEvent),
        status: 'pending',
        payment_status: task.paymentStatus ?? null,
    }))
}

export async function seedDefaultEventTasks(
    supabase: SupabaseClient,
    eventId: string,
    startDate?: string | null
) {
    const tasks = buildDefaultEventTasks(eventId, startDate)
    const { data: existing, error: existingError } = await supabase
        .from('tasks')
        .select('id, title, description')
        .eq('event_id', eventId)

    if (existingError) throw existingError

    const existingTitles = new Set((existing ?? []).map(task => String(task.title).trim().toLowerCase()))
    const missingTasks = tasks.filter(task => !existingTitles.has(task.title.trim().toLowerCase()))

    const templatesByTitle = new Map(DEFAULT_TASKS.map(task => [task.title.trim().toLowerCase(), task]))
    const metadataUpdates = (existing ?? []).filter(task => {
        const template = templatesByTitle.get(String(task.title).trim().toLowerCase())
        return template && !decodeTaskModule(task.description).module
    })

    const metadataResults = await Promise.all(metadataUpdates.map(task => {
        const template = templatesByTitle.get(String(task.title).trim().toLowerCase())!
        return supabase
            .from('tasks')
            .update({ description: encodeTaskModule(task.description, template.module) })
            .eq('id', task.id)
    }))

    const metadataError = metadataResults.find(result => result.error)?.error
    if (metadataError) throw metadataError

    if (missingTasks.length === 0) return 0

    const { error } = await supabase.from('tasks').insert(missingTasks)
    if (error) throw error
    return missingTasks.length
}
