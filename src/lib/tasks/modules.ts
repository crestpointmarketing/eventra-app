export const TASK_MODULES = [
    { id: 'strategy', label: 'Event Strategy', shortLabel: 'Strategy', roiWeight: 10 },
    { id: 'budget_planning', label: 'Budget & Planning', shortLabel: 'Budget', roiWeight: null },
    { id: 'marketing', label: 'Marketing Campaigns', shortLabel: 'Marketing', roiWeight: 25 },
    { id: 'sales', label: 'Sales Enablement', shortLabel: 'Sales', roiWeight: 25 },
    { id: 'logistics_operations', label: 'Logistics & Operations', shortLabel: 'Operations', roiWeight: 15 },
    { id: 'execution', label: 'Event Execution', shortLabel: 'Execution', roiWeight: 10 },
    { id: 'follow_up', label: 'Post Event Follow-up', shortLabel: 'Follow-up', roiWeight: 10 },
    { id: 'analytics_roi', label: 'Analytics & ROI', shortLabel: 'Analytics', roiWeight: 5 },
] as const

export type TaskModuleId = (typeof TASK_MODULES)[number]['id']

const MODULE_MARKER = /<!--\s*eventra:module=([a-z_]+)\s*-->/i
const REMINDER_MARKER = /<!--\s*eventra:reminder=([^>]+)\s*-->/i
const MODULE_IDS = new Set<string>(TASK_MODULES.map(module => module.id))

export function getTaskModule(id: TaskModuleId) {
    return TASK_MODULES.find(module => module.id === id)!
}

export function normalizeTaskModule(value: string | null | undefined): TaskModuleId {
    const normalized = (value ?? '').toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, '')
    const aliases: Record<string, TaskModuleId> = {
        strategy: 'strategy',
        event_strategy: 'strategy',
        budget: 'budget_planning',
        budget_planning: 'budget_planning',
        planning: 'budget_planning',
        marketing: 'marketing',
        marketing_campaigns: 'marketing',
        sales: 'sales',
        sales_enablement: 'sales',
        operations: 'logistics_operations',
        logistics: 'logistics_operations',
        logistics_operations: 'logistics_operations',
        execution: 'execution',
        event_execution: 'execution',
        follow_up: 'follow_up',
        post_event_follow_up: 'follow_up',
        analytics: 'analytics_roi',
        analytics_roi: 'analytics_roi',
        reporting: 'analytics_roi',
    }
    return aliases[normalized] ?? 'strategy'
}

export function encodeTaskModule(description: string | null | undefined, taskModule: TaskModuleId) {
    const cleanDescription = (description ?? '').replace(MODULE_MARKER, '').trim()
    return `<!-- eventra:module=${taskModule} -->${cleanDescription ? `\n${cleanDescription}` : ''}`
}

export function decodeTaskModule(description: string | null | undefined) {
    const value = description ?? ''
    const match = value.match(MODULE_MARKER)
    const candidate = match?.[1]
    const taskModule = candidate && MODULE_IDS.has(candidate) ? candidate as TaskModuleId : undefined

    return {
        module: taskModule,
        description: value.replace(MODULE_MARKER, '').trim() || null,
    }
}

export function encodeTaskReminder(description: string | null | undefined, reminderAt: string | null) {
    const cleanDescription = (description ?? '').replace(REMINDER_MARKER, '').trim()
    if (!reminderAt) return cleanDescription || null
    return `<!-- eventra:reminder=${reminderAt} -->${cleanDescription ? `\n${cleanDescription}` : ''}`
}

export function decodeTaskReminder(description: string | null | undefined) {
    const value = description ?? ''
    const match = value.match(REMINDER_MARKER)
    return {
        reminderAt: match?.[1]?.trim() || null,
        description: value.replace(REMINDER_MARKER, '').trim() || null,
    }
}

export function inferTaskModule(title: string, description?: string | null): TaskModuleId {
    const text = `${title} ${description ?? ''}`.toLowerCase()

    if (/roi|pipeline|revenue|kpi|metric|retrospective|lessons learned|report|analytics/.test(text)) return 'analytics_roi'
    if (/follow.?up|crm|discovery call|schedule demo|recap|event highlights/.test(text)) return 'follow_up'
    if (/target account|prospect|sales team|account owner|customer meeting|executive meeting|attendee list|talking points/.test(text)) return 'sales'
    if (/landing page|registration page|email|social|linkedin|google ads|retarget|press release|blog|campaign/.test(text)) return 'marketing'
    if (/flight|hotel|transport|booth|shipping|shipment|furniture|internet|power|vendor/.test(text)) return 'logistics_operations'
    if (/briefing|booth schedule|lead capture|capture photo|capture video|interview|networking session|business card/.test(text)) return 'execution'
    if (/budget|cost|approval|contract|invoice|payment|receipt|balance|sponsor/.test(text)) return 'budget_planning'
    return 'strategy'
}
