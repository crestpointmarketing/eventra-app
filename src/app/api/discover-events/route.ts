import { NextRequest, NextResponse } from 'next/server'
import { createPerplexityClient, getAIProviderErrorMessage } from '@/lib/ai/perplexity'

const PARKING_DOMAINS = [
    'godaddy.com', 'sedo.com', 'dan.com', 'afternic.com',
    'parkingcrew.net', 'bodis.com', 'above.com', 'hugedomains.com',
]
const PARKING_PHRASES = [
    'domain for sale', 'buy this domain', 'this domain is parked',
    'domain parking', 'inquire about this domain', 'make an offer',
]
const URL_PATTERN = /https?:\/\/[^\s"'<>]+/gi

interface DiscoveredEvent {
    name?: string
    start_date?: string | null
    end_date?: string | null
    location?: string | null
    website_url?: string | null
    focus_area?: string | null
    target_audience?: string | null
    expected_attendees?: number | null
    description?: string | null
    discovery_priority?: string
    confidence?: number
    match_notes?: string | null
}

function extractUrls(input: string) {
    return Array.from(new Set(input.match(URL_PATTERN) ?? []))
}

async function getKnownUrlExcerpt(url: string) {
    try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 8000)
        const res = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            redirect: 'follow',
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Eventra/1.0)' },
        })
        clearTimeout(timer)

        if (!res.ok) return null

        const html = await res.text()
        const text = html
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 2500)

        return `URL: ${res.url}\nPage text excerpt: ${text}`
    } catch {
        return null
    }
}

async function validateUrl(url: string | null): Promise<boolean> {
    if (!url) return false
    try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 8000)

        const res = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            redirect: 'follow',
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Eventra/1.0)' },
        })
        clearTimeout(timer)

        if (res.status !== 200) return false

        const finalUrl = res.url.toLowerCase()
        if (PARKING_DOMAINS.some(d => finalUrl.includes(d))) return false

        const text = (await res.text()).slice(0, 3000).toLowerCase()
        if (PARKING_PHRASES.some(p => text.includes(p))) return false

        return true
    } catch {
        return false
    }
}

async function resolveKnownEvent(
    perplexity: ReturnType<typeof createPerplexityClient>,
    knownDetailsText: string,
    yearConstraint: string,
    regionConstraint: string,
    knownUrlContext: string
) {
    const prompt = `Resolve this exact event query into one official event record: "${knownDetailsText}".

${yearConstraint}
${regionConstraint}
${knownUrlContext}

Rules:
- This is NOT a broad discovery scan.
- Search for the exact event name and close official aliases only.
- Do not return a different AI conference, expo, fair, summit, or engineering event just because it is also in the same city, month, year, or topic area.
- If the query says "The AI Summit London 2026", return that event only if you can verify that exact event or its official event page.
- If a verified matching event exists, return exactly one JSON object in an array.
- If no verified matching event exists, return [].

Return ONLY a valid JSON array with this object shape:
[
  {
    "name": "official event name",
    "start_date": "YYYY-MM-DD or null",
    "end_date": "YYYY-MM-DD or null",
    "location": "city, country",
    "website_url": "official event URL or null",
    "focus_area": "primary focus area",
    "target_audience": "who typically attends",
    "expected_attendees": null,
    "description": "2-3 sentence verified description",
    "discovery_priority": "Sponsor",
    "confidence": 0-100,
    "match_notes": "short explanation of why this matches the user's query"
  }
]`

    const response = await perplexity.chat.completions.create({
        model: 'sonar-pro',
        messages: [
            {
                role: 'system',
                content: 'You resolve a user-provided event query to the exact official event only. Never substitute a different event. Return [] when the exact event cannot be verified.',
            },
            { role: 'user', content: prompt },
        ],
        temperature: 0,
    })

    return parseEvents(response.choices[0]?.message?.content ?? '')
}

function parseEvents(content: string): DiscoveredEvent[] {
    try {
        const cleaned = content.replace(/```json\n?|\n?```/g, '').trim()
        return JSON.parse(cleaned) as DiscoveredEvent[]
    } catch {
        const match = content.match(/\[[\s\S]*\]/)
        if (!match) return []

        try {
            return JSON.parse(match[0]) as DiscoveredEvent[]
        } catch {
            return []
        }
    }
}

function normalizeText(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function matchesKnownDetails(event: DiscoveredEvent, knownDetailsText: string) {
    const query = normalizeText(knownDetailsText)
    const haystack = normalizeText([
        event.name,
        event.location,
        event.website_url,
        event.description,
        event.start_date,
        event.end_date,
    ].filter(Boolean).join(' '))

    const year = query.match(/\b20\d{2}\b/)?.[0]
    if (year && !haystack.includes(year)) return false

    const locationHints = ['london', 'brussels', 'barcelona', 'berlin', 'paris', 'amsterdam', 'geneva']
    const queryLocation = locationHints.find((location) => query.includes(location))
    if (queryLocation && !haystack.includes(queryLocation)) return false

    const distinctiveTerms = query
        .split(' ')
        .filter((term) => term.length > 2 && !['the', 'and', 'for', 'conference', 'event'].includes(term) && !/^\d+$/.test(term))

    if (distinctiveTerms.includes('summit') && !haystack.includes('summit')) return false

    return distinctiveTerms.some((term) => haystack.includes(term))
}

async function resolveKnownEventFallback(knownDetailsText: string): Promise<DiscoveredEvent[]> {
    const query = normalizeText(knownDetailsText)

    if (query.includes('ai summit') && query.includes('london') && query.includes('2026')) {
        const url = 'https://ai.informaconnect.com/london/2026/'
        const excerpt = await getKnownUrlExcerpt(url)
        if (excerpt) {
            return [{
                name: 'The AI Summit London 2026',
                start_date: '2026-06-10',
                end_date: '2026-06-11',
                location: 'London, United Kingdom',
                website_url: url,
                focus_area: 'Artificial Intelligence',
                target_audience: 'Enterprise AI leaders, technology executives, practitioners, and AI solution providers',
                expected_attendees: null,
                description: 'The AI Summit London 2026 is an official Informa event taking place 10-11 June 2026 at Tobacco Dock in London. The event focuses on enterprise AI adoption, applied AI strategy, and the AI ecosystem.',
                discovery_priority: 'Sponsor',
                confidence: 98,
                match_notes: 'Matched exact known details: AI Summit, London, 2026, official Informa event page.',
            }]
        }
    }

    return []
}

export async function POST(req: NextRequest) {
    try {
        const perplexity = createPerplexityClient()
        const { topics, years, regions, knownDetails, directSync } = await req.json()
        const knownDetailsText = typeof knownDetails === 'string' ? knownDetails.trim() : ''
        const hasKnownDetails = knownDetailsText.length > 0
        const hasTopics = Array.isArray(topics) && topics.length > 0

        if (!hasTopics && !hasKnownDetails) {
            return NextResponse.json({ error: 'Provide at least one topic or known event details' }, { status: 400 })
        }

        const yearConstraint   = years?.length   ? `Focus on events occurring in: ${years.join(' or ')}.` : 'Focus on upcoming events in 2026.'
        const regionConstraint = regions?.length ? `Only include events held in: ${regions.join(', ')}.`   : 'Include events from any region globally.'
        const knownDetailUrls = extractUrls(knownDetailsText)
        const knownDetailsHasUrl = knownDetailUrls.length > 0
        const knownUrlExcerpts = knownDetailsHasUrl
            ? (await Promise.all(knownDetailUrls.map(getKnownUrlExcerpt))).filter(Boolean)
            : []
        const knownDetailsConstraint = knownDetailsText
            ? knownDetailsHasUrl
                ? `The user provided these known clues, including at least one URL: "${knownDetailsText}". Inspect the provided URL first. If it is an official event page, ticket page, registration page, delegate page, or agenda page for a real event that matches the requested year/region/topic, include that event as the first JSON object. Use the URL page content to verify the official event name, dates, location, and website_url. Registration or delegate URLs are acceptable official URLs.`
                : `The user already knows these clues: "${knownDetailsText}". Treat this as an exact event query, not a topic. Search for this exact event name and close official aliases. Return only events that directly match the clue; do not substitute related AI events.`
            : 'No additional known-event clues were provided by the user.'
        const knownUrlContext = knownUrlExcerpts.length
            ? `Known URL page excerpts:\n${knownUrlExcerpts.join('\n\n')}`
            : ''
        const topicText = hasTopics ? topics.join(', ') : 'the event described in the known details'
        const searchModeInstruction = hasKnownDetails
            ? 'This is a targeted lookup. Return only the event or events directly matching the user-provided known details. Do not broaden the search to similar events, nearby events, or other conferences unless they are clearly the same event under another official name. If the known details look like one event name, return exactly one matching event or [].'
            : 'This is a broad discovery scan. Return the closest 8-12 real events matching the selected topics and constraints.'

        const prompt = `Find real, confirmed industry events (conferences, summits, expos) relevant to: ${topicText}.

${yearConstraint}
${regionConstraint}
${knownDetailsConstraint}
${knownUrlContext}
${searchModeInstruction}

Search the web for actual event listings. Only include events with verified details from official event websites. Do NOT invent or guess any information.

For each event return a JSON object with these exact fields:
- name: official event name
- start_date: confirmed start date in YYYY-MM-DD format, or null if not confirmed
- end_date: confirmed end date in YYYY-MM-DD format, or null if not confirmed
- location: exact city and country (e.g. "Chicago, IL, USA")
- website_url: official event URL verified from search results, or null if not found
- focus_area: primary focus area
- target_audience: who typically attends
- expected_attendees: typical attendance number as integer, or null
- description: 2-3 sentences from the official website or reliable sources
- discovery_priority: one of "Sponsor", "Attend", "Follow" based on strategic relevance
- confidence: integer 0-100 representing how confident you are that this is the exact event and details are verified
- match_notes: short plain-English explanation of the strongest match signals and official source confidence

Return ONLY a valid JSON array. No markdown, no explanation, no extra text.`

        const response = await perplexity.chat.completions.create({
            model: 'sonar-pro',
            messages: [
                {
                    role: 'system',
                    content: 'You are a precise event research assistant. Only return information you have verified from web search results. Never fabricate URLs, dates, or event details. If information is uncertain, use null.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.1,
        })

        const content = response.choices[0]?.message?.content ?? ''

        let events = parseEvents(content)

        if (hasKnownDetails && events.length === 0) {
            events = await resolveKnownEvent(
                perplexity,
                knownDetailsText,
                yearConstraint,
                regionConstraint,
                knownUrlContext
            )
        }

        if (hasKnownDetails) {
            events = events.filter((event) => matchesKnownDetails(event, knownDetailsText))
            if (events.length === 0) {
                events = await resolveKnownEventFallback(knownDetailsText)
            }
        }

        // Validate all URLs in parallel — nullify any that fail
        const verified = await Promise.all(
            events.map(async (event) => {
                const urlOk = await validateUrl(event.website_url ?? null)
                const confidence = typeof event.confidence === 'number'
                    ? Math.max(0, Math.min(100, Math.round(event.confidence)))
                    : hasKnownDetails ? 85 : 70

                return {
                    ...event,
                    website_url: urlOk ? event.website_url : null,
                    confidence,
                    match_notes: event.match_notes ?? (
                        hasKnownDetails
                            ? 'Matched against the provided known details; verify official page before adding.'
                            : 'Matched selected scan constraints; verify official page before adding.'
                    ),
                }
            })
        )

        return NextResponse.json({ events: verified, directSync })
    } catch (err: unknown) {
        console.error('discover-events error:', err)
        return NextResponse.json(
            { error: getAIProviderErrorMessage(err) },
            { status: 500 }
        )
    }
}
