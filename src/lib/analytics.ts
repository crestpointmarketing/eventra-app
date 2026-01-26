// Analytics utility functions

export interface AnalyticsData {
    totalEvents: number
    totalLeads: number
    avgLeadsPerEvent: number
    hotLeads: number
    conversionRate: number
}

export interface EventTypeDistribution {
    [key: string]: number
}

export interface PriorityDistribution {
    hot: number
    warm: number
    cold: number
}

export interface TopEvent {
    id: string
    name: string
    location: string
    leads: number
    budget: number
}

// Calculate basic analytics
export function calculateBasicAnalytics(events: any[], leads: any[]): AnalyticsData {
    const totalEvents = events?.length || 0
    const totalLeads = leads?.length || 0
    const avgLeadsPerEvent = totalEvents > 0 ? Math.round(totalLeads / totalEvents) : 0
    const hotLeads = leads?.filter((lead: any) => lead.lead_score >= 80).length || 0

    // Conversion rate: % of leads that are "hot"
    const conversionRate = totalLeads > 0 ? Math.round((hotLeads / totalLeads) * 100) : 0

    return {
        totalEvents,
        totalLeads,
        avgLeadsPerEvent,
        hotLeads,
        conversionRate
    }
}

// Analyze events by type
export function analyzeEventsByType(events: any[]): EventTypeDistribution {
    if (!events) return {}

    return events.reduce((acc, event) => {
        const type = event.event_type || 'unknown'
        acc[type] = (acc[type] || 0) + 1
        return acc
    }, {} as EventTypeDistribution)
}

// Analyze leads by priority
export function analyzeLeadsByPriority(leads: any[]): PriorityDistribution {
    if (!leads) return { hot: 0, warm: 0, cold: 0 }

    return leads.reduce((acc, lead) => {
        if (lead.lead_score >= 80) acc.hot++
        else if (lead.lead_score >= 50) acc.warm++
        else acc.cold++
        return acc
    }, { hot: 0, warm: 0, cold: 0 })
}

// Get top events by leads
export function getTopEventsByLeads(events: any[], limit: number = 5): TopEvent[] {
    if (!events) return []

    return events
        .filter(event => event.actual_leads > 0)
        .sort((a, b) => (b.actual_leads || 0) - (a.actual_leads || 0))
        .slice(0, limit)
        .map(event => ({
            id: event.id,
            name: event.name,
            location: event.location || 'N/A',
            leads: event.actual_leads || 0,
            budget: event.total_budget || 0
        }))
}

// Get top events by budget
export function getTopEventsByBudget(events: any[], limit: number = 5): TopEvent[] {
    if (!events) return []

    return events
        .filter(event => event.total_budget > 0)
        .sort((a, b) => (b.total_budget || 0) - (a.total_budget || 0))
        .slice(0, limit)
        .map(event => ({
            id: event.id,
            name: event.name,
            location: event.location || 'N/A',
            leads: event.actual_leads || 0,
            budget: event.total_budget || 0
        }))
}
