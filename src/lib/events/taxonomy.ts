export const EVENT_TYPES = [
    'Conference',
    'Trade Show',
    'Summit',
    'Expo',
    'Workshop',
    'Webinar',
    'Hackathon',
    'Networking',
    'Roadshow',
    'Training',
] as const

export type EventType = (typeof EVENT_TYPES)[number]

export const ENGAGEMENT_TYPES = [
    'Sponsor',
    'Exhibit',
    'Attend',
    'Speaking',
    'Follow',
] as const

export type EngagementType = (typeof ENGAGEMENT_TYPES)[number]

export function normalizeEventType(value?: string | null): EventType {
    const normalized = (value ?? '').trim().toLowerCase()
    switch (normalized) {
        case 'trade show':
        case 'tradeshow':
            return 'Trade Show'
        case 'summit':
            return 'Summit'
        case 'expo':
            return 'Expo'
        case 'workshop':
            return 'Workshop'
        case 'webinar':
            return 'Webinar'
        case 'hackathon':
            return 'Hackathon'
        case 'networking':
            return 'Networking'
        case 'roadshow':
            return 'Roadshow'
        case 'training':
            return 'Training'
        case 'conference':
        default:
            return 'Conference'
    }
}

export function normalizeEngagementType(value?: string | null): EngagementType {
    const normalized = (value ?? '').trim().toLowerCase()
    switch (normalized) {
        case 'sponsor':
            return 'Sponsor'
        case 'exhibit':
        case 'exhibitor':
            return 'Exhibit'
        case 'attend':
            return 'Attend'
        case 'speaking':
        case 'speaker':
            return 'Speaking'
        case 'follow':
        default:
            return 'Follow'
    }
}
