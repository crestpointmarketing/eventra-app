import test from 'node:test'
import assert from 'node:assert/strict'
import {
    searchCriteriaSchema,
    type SearchCandidate,
    type FieldEvidence,
} from '../src/lib/events/search-contract'
import {
    evaluateCandidate,
    deduplicateResults,
    validateEvidence,
    resolveField,
    hasPhrase,
} from '../src/lib/events/search-evaluation'

const now = '2026-09-06T12:00:00Z'
const url = 'https://example.test/2026'
function candidate(values: Record<string, string> = {}): SearchCandidate {
    const fields = {
        name: 'Health AI Congress',
        start_date: '2026-12-30',
        end_date: '2027-01-02',
        country: 'Canada',
        city: 'Toronto',
        attendance: 'in_person',
        event_type: 'Conference',
        organizer: 'Health Society',
        description: 'Healthcare and artificial intelligence for hospitals.',
        series: 'Health AI Congress',
        ...values,
    }
    return {
        id: crypto.randomUUID(),
        name: fields.name,
        website_url: url,
        sources: [
            {
                url,
                kind: 'official_edition',
                accessible: true,
                identityVerified: true,
                identityReason: 'Official edition and organizer relationship',
                checkedAt: now,
            },
        ],
        warnings: [],
        fields: Object.fromEntries(
            Object.entries(fields).map(([key, value]) => [
                key,
                [
                    {
                        value,
                        quote: value,
                        sourceUrl: url,
                        checkedAt: now,
                        status: 'verified',
                    },
                ],
            ]),
        ),
    }
}
const criteria = (overrides = {}) =>
    searchCriteriaSchema.parse({ mode: 'discover', ...overrides })
test('date intervals include cross-year events, reject ended editions and impossible dates', () => {
    assert.equal(
        evaluateCandidate(
            candidate(),
            criteria({ startDate: '2027-01-01', endDate: '2027-02-01' }),
            '2026-09-06',
        ).category,
        'strict',
    )
    assert.equal(
        evaluateCandidate(
            candidate({ end_date: '2026-01-02', start_date: '2025-12-30' }),
            criteria(),
            '2026-09-06',
        ).category,
        'excluded',
    )
    assert.equal(
        evaluateCandidate(
            candidate({ start_date: '2026-02-30' }),
            criteria(),
            '2026-09-06',
        ).category,
        'verification',
    )
    assert.equal(
        searchCriteriaSchema.safeParse({
            mode: 'discover',
            startDate: '2026-02-30',
        }).success,
        false,
    )
})
test('server hard filters enforce location, attendance and keyword scope without partial token matches', () => {
    for (const condition of [
        { country: 'US' },
        { city: 'London' },
        { attendance: 'online' },
        { exclude: ['hospitals'] },
        { includeAll: ['robotics'] },
    ]) {
        assert.equal(
            evaluateCandidate(candidate(), criteria(condition), '2026-09-06')
                .category,
            'excluded',
        )
    }
    assert.equal(
        evaluateCandidate(
            candidate(),
            criteria({ country: '加拿大', includeAll: ['healthcare'] }),
            '2026-09-06',
        ).category,
        'strict',
    )
    assert.equal(hasPhrase('chair of oncology', 'AI'), false)
    assert.equal(hasPhrase('医疗人工智能大会', '人工智能'), true)
})
test('HTTP 200 and an unrelated or invented quote cannot create verified evidence', () => {
    const source = candidate().sources[0]
    const evidence: FieldEvidence = {
        value: 'Toronto',
        quote: 'Toronto, Canada',
        status: 'verified',
        sourceUrl: url,
        checkedAt: now,
    }
    assert.equal(
        validateEvidence(evidence, source, 'A parking page').status,
        'unverified',
    )
    assert.equal(
        validateEvidence(
            evidence,
            { ...source, identityVerified: false },
            'Toronto, Canada',
        ).status,
        'unverified',
    )
    assert.equal(
        validateEvidence(
            evidence,
            { ...source, accessible: false },
            'Toronto, Canada',
        ).status,
        'unverified',
    )
    assert.equal(
        validateEvidence(
            evidence,
            { ...source, kind: 'third_party' },
            'Toronto, Canada',
        ).status,
        'unverified',
    )
})
test('conflicts preserve both official values, third-party cannot override official fields', () => {
    const base = candidate()
    const evidence = base.fields.city![0]
    const third = {
        ...base.sources[0],
        url: 'https://third.test/event',
        kind: 'third_party' as const,
    }
    assert.equal(
        resolveField(
            [evidence, { ...evidence, value: 'Paris', sourceUrl: third.url }],
            [...base.sources, third],
        ).value,
        'Toronto',
    )
    const conflict = resolveField(
        [evidence, { ...evidence, value: 'Paris' }],
        base.sources,
    )
    assert.equal(conflict.status, 'conflict')
    assert.equal(conflict.value, null)
    assert.equal(conflict.evidence.length, 2)
    base.fields.city!.push({ ...evidence, value: 'Paris' })
    assert.equal(
        evaluateCandidate(base, criteria(), '2026-09-06').category,
        'verification',
    )
})
test('duplicate detection preserves different editions and different organizers', () => {
    const candidates = [
        candidate(),
        candidate(),
        candidate({ start_date: '2027-12-30', end_date: '2028-01-02' }),
        candidate({ organizer: 'Other Society' }),
    ]
    assert.deepEqual(
        deduplicateResults(
            candidates.map((c) =>
                evaluateCandidate(c, criteria(), '2026-09-06'),
            ),
        ).map((r) => r.category),
        ['strict', 'excluded', 'strict', 'strict'],
    )
})
test('unknown required fields and inferred audience are never strict', () => {
    const c = candidate()
    delete c.fields.city
    assert.equal(
        evaluateCandidate(c, criteria(), '2026-09-06').category,
        'verification',
    )
    c.fields.audience = [
        {
            value: 'Hospital CIOs',
            quote: 'Hospital CIOs',
            sourceUrl: url,
            checkedAt: now,
            status: 'inferred',
        },
    ]
    assert.equal(
        evaluateCandidate(
            c,
            criteria({ audience: 'Hospital CIOs' }),
            '2026-09-06',
        ).category,
        'verification',
    )
})

test('specific name plus edition year is evaluated independently of title word order', () => {
    const c = candidate({
        name: 'HIMSS Global Health Conference',
        organizer: 'HIMSS',
        start_date: '2027-04-05',
        end_date: '2027-04-08',
    })
    assert.equal(
        evaluateCandidate(
            c,
            criteria({ mode: 'specific', query: 'HIMSS 2027' }),
            '2026-09-06',
        ).category,
        'strict',
    )
    assert.equal(
        evaluateCandidate(
            c,
            criteria({ mode: 'specific', query: 'HIMSS 2026' }),
            '2026-09-06',
        ).category,
        'excluded',
    )
})

test('advanced ranges validate and old criteria get conservative defaults', () => {
    assert.equal(criteria().advanced.budgetRule, 'prefer')
    assert.equal(criteria().advanced.organizerRule, 'require')
    for (const advanced of [
        { attendeeMin: 20, attendeeMax: 10 },
        { ticketMin: 20, ticketMax: 10 },
        { sponsorshipMin: 20, sponsorshipMax: 10 },
        { attendeeMin: 1.5 },
        { ticketMin: -1 },
        { currency: 'FAKE' },
        { deadlineAfter: '2026-02-30', deadlineTypes: ['cfp'] },
        { deadlineAfter: '2026-12-01' },
    ])
        assert.equal(
            searchCriteriaSchema.safeParse({ mode: 'discover', advanced })
                .success,
            false,
        )
})
test('budget requirements distinguish verified, missing, different currency and out-of-range prices', () => {
    const required = criteria({
        advanced: {
            budgetRule: 'require',
            ticketMin: 0,
            ticketMax: 500,
            currency: 'USD',
        },
    })
    assert.equal(
        evaluateCandidate(
            candidate({ ticket_price: '500', ticket_currency: 'USD' }),
            required,
        ).category,
        'strict',
    )
    assert.equal(
        evaluateCandidate(
            candidate({ ticket_price: '0', ticket_currency: 'USD' }),
            required,
        ).category,
        'strict',
    )
    assert.equal(
        evaluateCandidate(
            candidate({ ticket_price: '501', ticket_currency: 'USD' }),
            required,
        ).category,
        'excluded',
    )
    assert.equal(
        evaluateCandidate(
            candidate({ ticket_price: '400', ticket_currency: 'CAD' }),
            required,
        ).category,
        'verification',
    )
    assert.equal(
        evaluateCandidate(candidate(), required).category,
        'verification',
    )
    const preferred = criteria({ advanced: { ticketMax: 500 } })
    assert.equal(evaluateCandidate(candidate(), preferred).category, 'strict')
    assert.equal(
        evaluateCandidate(
            candidate({ ticket_price: '501', ticket_currency: 'USD' }),
            preferred,
        ).category,
        'strict',
    )
})
test('size, language and sponsorship retain independent evidence and inclusive bounds', () => {
    const required = criteria({
        advanced: {
            sizeRule: 'require',
            attendeeMin: 100,
            attendeeMax: 1000,
            language: 'English',
            budgetRule: 'require',
            sponsorshipMax: 10000,
        },
    })
    const good = candidate({
        attendee_count: '100',
        language: 'English, French',
        sponsorship_price: '10000',
        sponsorship_currency: 'USD',
    })
    assert.equal(evaluateCandidate(good, required).category, 'strict')
    assert.equal(
        evaluateCandidate(candidate({ attendee_count: '99' }), required)
            .category,
        'excluded',
    )
    assert.equal(
        evaluateCandidate(
            candidate({ attendee_count: '100.5' }),
            required,
        ).criteria.find((c) => c.key === 'attendee_count')?.status,
        'unknown',
    )
})
test('deadline types are independent and never inferred from event dates', () => {
    const required = criteria({
        advanced: {
            deadlineTypes: ['speaker', 'exhibitor'],
            deadlineAfter: '2026-10-01',
            deadlineRule: 'require',
        },
    })
    assert.equal(
        evaluateCandidate(
            candidate({
                speaker_deadline: '2026-10-01',
                exhibitor_deadline: '2026-10-02',
            }),
            required,
        ).category,
        'strict',
    )
    assert.equal(
        evaluateCandidate(
            candidate({
                speaker_deadline: '2026-09-30',
                exhibitor_deadline: '2026-10-02',
            }),
            required,
        ).category,
        'excluded',
    )
    assert.equal(
        evaluateCandidate(candidate({ cfp_deadline: '2026-10-02' }), required)
            .category,
        'verification',
    )
    const defaultToday = criteria({
        advanced: { deadlineTypes: ['registration'], deadlineRule: 'require' },
    })
    assert.equal(
        evaluateCandidate(
            candidate({ registration_deadline: '2026-09-05' }),
            defaultToday,
            '2026-09-06',
        ).category,
        'excluded',
    )
    assert.equal(
        evaluateCandidate(
            candidate(),
            criteria({ advanced: { deadlineTypes: ['cfp'] } }),
        ).category,
        'strict',
    )
})
test('organizer and audience preferences cannot exclude an otherwise matching edition', () => {
    assert.equal(
        evaluateCandidate(
            candidate(),
            criteria({
                organizer: 'Different organizer',
                advanced: { organizerRule: 'prefer' },
            }),
        ).category,
        'strict',
    )
    assert.equal(
        evaluateCandidate(
            candidate(),
            criteria({ organizer: 'Different organizer' }),
        ).category,
        'excluded',
    )
    const inferred = candidate({ audience: 'Hospital CIOs' })
    inferred.fields.audience![0].status = 'inferred'
    const preference = evaluateCandidate(
        inferred,
        criteria({
            audience: 'Hospital CIOs',
            advanced: {
                audienceRule: 'prefer',
                officiallyStatedAudience: false,
            },
        }),
    )
    assert.equal(
        preference.criteria.find((c) => c.key === 'audience')?.status,
        'matched',
    )
    assert.notEqual(preference.evidenceStatus, 'Verified')
    assert.equal(
        evaluateCandidate(inferred, criteria({ audience: 'Hospital CIOs' }))
            .category,
        'verification',
    )
})
test('preferences rank by supported matches without inventing availability', async () => {
    const { compareSearchPreferences } =
        await import('../src/lib/events/search-advanced')
    const prefs = criteria({
        advanced: { objectives: ['sponsor'], ticketMax: 500 },
    })
    const unknown = evaluateCandidate(candidate(), prefs)
    const supported = evaluateCandidate(
        candidate({
            participation_options: 'sponsor',
            ticket_price: '100',
            ticket_currency: 'USD',
        }),
        prefs,
    )
    assert.equal(unknown.category, 'strict')
    assert.ok(compareSearchPreferences(supported, unknown) < 0)
    assert.ok(
        supported.criteria
            .find((c) => c.key === 'objective:sponsor')
            ?.label.includes('availability not inferred'),
    )
})
test('advanced field extraction requires typed context and explicit evidence', async () => {
    const { valueSupported } = await import('../src/lib/events/search-research')
    assert.equal(valueSupported('ticket_price', '100', '100 attendees'), false)
    assert.equal(
        valueSupported('attendee_count', '1000', '1,000 attendees'),
        true,
    )
    assert.equal(
        valueSupported(
            'speaker_deadline',
            '2026-10-01',
            'Conference starts October 1, 2026',
        ),
        false,
    )
    assert.equal(
        valueSupported(
            'speaker_deadline',
            '2026-10-01',
            'Speaker submission deadline October 1, 2026',
        ),
        true,
    )
    assert.equal(valueSupported('ticket_currency', 'USD', '$100 ticket'), false)
    assert.equal(
        valueSupported(
            'participation_options',
            'sponsor',
            'Sponsorship packages',
        ),
        true,
    )
})

test('legacy history recomputes evidence summaries when new fields are unknown', async () => {
    const { hydrateSearchJob, SEARCH_FIELDS, ADVANCED_SEARCH_FIELDS } =
        await import('../src/lib/events/search-contract')
    const result = evaluateCandidate(candidate(), criteria())
    const resolved = Object.fromEntries(
        SEARCH_FIELDS.filter(
            (field) =>
                !(ADVANCED_SEARCH_FIELDS as readonly string[]).includes(field),
        ).map((field) => [
            field,
            { value: 'legacy', status: 'verified', evidence: [] },
        ]),
    )
    const legacy = {
        criteria: { mode: 'discover' },
        results: [
            {
                ...result,
                resolved,
                evidenceStatus: 'Verified',
                unknownCount: 0,
            },
        ],
    } as unknown as import('../src/lib/events/search-contract').SearchJob
    const hydrated = hydrateSearchJob(legacy)
    assert.equal(hydrated.results[0].evidenceStatus, 'Partial')
    assert.equal(
        hydrated.results[0].unknownCount,
        ADVANCED_SEARCH_FIELDS.length,
    )
    assert.equal(hydrated.results[0].resolved.ticket_price.status, 'unknown')
    assert.equal(hydrated.criteria.advanced.ticketMax, null)
    assert.equal(legacy.results[0].evidenceStatus, 'Verified')
})
