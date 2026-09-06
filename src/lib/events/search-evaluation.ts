import {
    SEARCH_FIELDS,
    SOURCE_PRIORITY,
    type SearchCandidate,
    type SearchCriteria,
    type SearchField,
    type SearchResult,
    type SearchSource,
    type FieldEvidence,
    type ResolvedField,
    type CriterionResult,
} from './search-contract'

export function normalized(value: string) {
    return value
        .normalize('NFKC')
        .toLocaleLowerCase('en')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim()
        .replace(/\s+/g, ' ')
}
function countryName(value: string) {
    const text = normalized(value)
    const aliases: Record<string, string> = {
        us: 'united states',
        usa: 'united states',
        'united states of america': 'united states',
        美国: 'united states',
        uk: 'united kingdom',
        英国: 'united kingdom',
        加拿大: 'canada',
        中国: 'china',
    }
    return aliases[text] ?? text
}
export function hasPhrase(text: string, phrase: string) {
    const a = normalized(text),
        b = normalized(phrase)
    if (!b) return false
    return /[\u3400-\u9fff]/u.test(b)
        ? a.includes(b)
        : ` ${a} `.includes(` ${b} `)
}
export function isDate(value: string | null): value is string {
    return (
        !!value &&
        /^\d{4}-\d{2}-\d{2}$/.test(value) &&
        !Number.isNaN(Date.parse(value)) &&
        new Date(value).toISOString().slice(0, 10) === value
    )
}
/** A quote must be checked against retrieved text before it can become evidence. HTTP success is insufficient. */
export function validateEvidence(
    evidence: FieldEvidence,
    source: SearchSource,
    pageText: string,
): FieldEvidence {
    const quote = normalized(evidence.quote)
    const grounded = quote.length >= 8 && normalized(pageText).includes(quote)
    return {
        ...evidence,
        sourceUrl: source.url,
        checkedAt: source.checkedAt,
        status:
            grounded &&
            source.accessible &&
            source.identityVerified &&
            SOURCE_PRIORITY[source.kind] <= 2 &&
            evidence.status === 'verified'
                ? 'verified'
                : evidence.status === 'inferred' && grounded
                  ? 'inferred'
                  : 'unverified',
    }
}
export function resolveField(
    evidence: FieldEvidence[],
    sources: SearchSource[],
): ResolvedField {
    const eligible = evidence
        .filter((e) => e.value.trim())
        .map((e) => {
            const source = sources.find((s) => s.url === e.sourceUrl)
            return {
                ...e,
                status:
                    e.status === 'verified' &&
                    (!source?.accessible ||
                        !source.identityVerified ||
                        SOURCE_PRIORITY[source.kind] > 2)
                        ? ('unverified' as const)
                        : e.status,
            }
        })
    const verified = eligible.filter((e) => e.status === 'verified')
    // Retain contradictory official claims instead of silently selecting the model's preferred value.
    if (new Set(verified.map((e) => normalized(e.value))).size > 1)
        return { value: null, status: 'conflict', evidence: eligible }
    const ranked = [...eligible].sort(
        (a, b) =>
            Number(b.status === 'verified') - Number(a.status === 'verified') ||
            SOURCE_PRIORITY[
                sources.find((s) => s.url === a.sourceUrl)?.kind ?? 'discovery'
            ] -
                SOURCE_PRIORITY[
                    sources.find((s) => s.url === b.sourceUrl)?.kind ??
                        'discovery'
                ],
    )
    const best = ranked[0]
    return {
        value: best?.value ?? null,
        status: best?.status ?? 'unknown',
        evidence: eligible,
    }
}
export function evaluateCandidate(
    candidate: SearchCandidate,
    criteria: SearchCriteria,
    today = new Date().toISOString().slice(0, 10),
): SearchResult {
    const resolved = Object.fromEntries(
        SEARCH_FIELDS.map((field) => [
            field,
            resolveField(candidate.fields[field] ?? [], candidate.sources),
        ]),
    ) as Record<SearchField, ResolvedField>
    const checks: CriterionResult[] = []
    const add = (
        key: string,
        label: string,
        status: CriterionResult['status'],
    ) => checks.push({ key, label, status })
    const compare = (
        field: SearchField,
        desired: string,
        label: string,
        transform = normalized,
    ) => {
        if (!desired) return
        const actual = resolved[field]
        add(
            field,
            label,
            actual.status !== 'verified'
                ? 'unknown'
                : transform(actual.value ?? '') === transform(desired)
                  ? 'matched'
                  : 'failed',
        )
    }
    for (const field of [
        'name',
        'start_date',
        'end_date',
        'attendance',
    ] as const)
        add(
            `evidence:${field}`,
            `Confirmed ${field.replaceAll('_', ' ')}`,
            resolved[field].status === 'verified' ? 'matched' : 'unknown',
        )
    if (
        resolved.attendance.value !== 'online' ||
        resolved.attendance.status !== 'verified'
    ) {
        for (const field of ['country', 'city'] as const)
            add(
                `evidence:${field}`,
                `Confirmed ${field}`,
                resolved[field].status === 'verified' ? 'matched' : 'unknown',
            )
    }
    const start = resolved.start_date,
        end = resolved.end_date
    const validDates =
        isDate(start.value) && isDate(end.value) && start.value <= end.value
    const confirmedDates =
        validDates && start.status === 'verified' && end.status === 'verified'
    if (!validDates) add('dates', 'Valid edition dates', 'unknown')
    if (!criteria.includePast)
        add(
            'upcoming',
            'Event has not ended',
            isDate(end.value) && end.value < today
                ? 'failed'
                : confirmedDates
                  ? 'matched'
                  : 'unknown',
        )
    if (criteria.startDate || criteria.endDate)
        add(
            'dateRange',
            'Event overlaps requested dates',
            confirmedDates
                ? (!criteria.startDate || end.value! >= criteria.startDate) &&
                  (!criteria.endDate || start.value! <= criteria.endDate)
                    ? 'matched'
                    : 'failed'
                : 'unknown',
        )
    compare(
        'country',
        criteria.country,
        `Country: ${criteria.country}`,
        countryName,
    )
    compare('state', criteria.state, `State / province: ${criteria.state}`)
    compare('city', criteria.city, `City: ${criteria.city}`)
    if (criteria.attendance !== 'any')
        compare(
            'attendance',
            criteria.attendance,
            `Attendance: ${criteria.attendance}`,
        )
    compare('organizer', criteria.organizer, `Organizer: ${criteria.organizer}`)
    if (criteria.eventTypes.length)
        add(
            'eventTypes',
            'Selected event type',
            resolved.event_type.status !== 'verified'
                ? 'unknown'
                : criteria.eventTypes.some(
                        (t) =>
                            normalized(t) ===
                            normalized(resolved.event_type.value!),
                    )
                  ? 'matched'
                  : 'failed',
        )
    const searchable = ['name', 'description', 'organizer'] as const
    const text = searchable.map((f) => resolved[f].value ?? '').join(' ')
    const verifiedText = searchable
        .filter((f) => resolved[f].status === 'verified')
        .map((f) => resolved[f].value ?? '')
        .join(' ')
    const fullTextVerified = searchable.every(
        (f) => resolved[f].status === 'verified',
    )
    const terms = (key: string, values: string[], all: boolean) => {
        if (!values.length) return
        const fn = (haystack: string) =>
            all
                ? values.every((v) => hasPhrase(haystack, v))
                : values.some((v) => hasPhrase(haystack, v))
        add(
            key,
            `${key}: ${values.join(all ? ' AND ' : ' OR ')}`,
            fn(verifiedText)
                ? 'matched'
                : fullTextVerified && !fn(text)
                  ? 'failed'
                  : 'unknown',
        )
    }
    terms('includeAny', criteria.includeAny, false)
    terms('includeAll', criteria.includeAll, true)
    terms(
        'topics',
        [...criteria.industries, ...criteria.technologies],
        criteria.topicOperator === 'AND',
    )
    if (criteria.exclude.length)
        add(
            'exclude',
            `Exclude: ${criteria.exclude.join(', ')}`,
            criteria.exclude.some((v) => hasPhrase(text, v))
                ? 'failed'
                : fullTextVerified
                  ? 'matched'
                  : 'unknown',
        )
    if (criteria.mode === 'specific' && criteria.query) {
        const year = criteria.query.match(/\b20\d{2}\b/)?.[0]
        const name = criteria.query.replace(/\b20\d{2}\b/g, '').trim()
        if (name) terms('specific', [name], true)
        if (year)
            add(
                'editionYear',
                `Edition year: ${year}`,
                !confirmedDates
                    ? 'unknown'
                    : start.value!.slice(0, 4) <= year &&
                        end.value!.slice(0, 4) >= year
                      ? 'matched'
                      : 'failed',
            )
    }
    if (criteria.audience)
        add(
            'audience',
            `Audience: ${criteria.audience}`,
            resolved.audience.status !== 'verified'
                ? 'unknown'
                : hasPhrase(resolved.audience.value!, criteria.audience)
                  ? 'matched'
                  : 'failed',
        )
    const conflicts = SEARCH_FIELDS.filter(
        (f) => resolved[f].status === 'conflict',
    ).map((f) => `Conflicting ${f.replaceAll('_', ' ')}`)
    const reasons = [
        ...checks
            .filter((c) => c.status !== 'matched')
            .map(
                (c) =>
                    `${c.status === 'failed' ? 'Excluded' : 'Needs verification'}: ${c.label}`,
            ),
        ...conflicts,
        ...candidate.warnings,
    ]
    const category = checks.some((c) => c.status === 'failed')
        ? 'excluded'
        : checks.some((c) => c.status === 'unknown') ||
            conflicts.length ||
            candidate.warnings.length
          ? 'verification'
          : 'strict'
    const official = candidate.sources.find(
        (s) =>
            s.accessible && s.identityVerified && SOURCE_PRIORITY[s.kind] <= 2,
    )
    const series =
        resolved.series.status === 'verified'
            ? resolved.series.value
            : resolved.name.status === 'verified'
              ? resolved.name.value?.replace(/\b20\d{2}\b/g, '').trim()
              : null
    const organizer =
        resolved.organizer.status === 'verified'
            ? resolved.organizer.value
            : null
    const seriesKey =
        series && organizer && official
            ? `${normalized(series)}|${normalized(organizer)}|${new URL(official.url).hostname.replace(/^www\./, '')}`
            : null
    const editionKey =
        seriesKey && confirmedDates
            ? `${seriesKey}|${start.value}|${end.value}`
            : null
    return {
        ...candidate,
        resolved,
        category,
        reasons,
        criteria: checks,
        seriesKey,
        editionKey,
        evidenceStatus:
            SEARCH_FIELDS.every((field) => resolved[field].status === 'verified')
                ? 'Verified'
                : SEARCH_FIELDS.some((f) => resolved[f].status === 'verified')
                  ? 'Partial'
                  : 'Unverified',
        unknownCount: SEARCH_FIELDS.filter(
            (f) => resolved[f].status !== 'verified',
        ).length,
    }
}
export function deduplicateResults(results: SearchResult[]) {
    const seen = new Map<string, string>()
    return results.map((result) => {
        if (!result.editionKey) return result
        const duplicateOf = seen.get(result.editionKey)
        if (duplicateOf)
            return {
                ...result,
                category: 'excluded' as const,
                duplicateOf,
                reasons: [
                    ...result.reasons,
                    'Duplicate of the same event edition',
                ],
            }
        seen.set(result.editionKey, result.id)
        return result
    })
}
