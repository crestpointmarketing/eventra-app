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
