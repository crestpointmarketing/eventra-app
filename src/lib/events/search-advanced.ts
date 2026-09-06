import {
    advancedSearchSchema,
    type SearchCriteria,
    type SearchField,
    type ResolvedField,
    type CriterionResult,
} from './search-contract'

export function advancedChecks(
    criteria: SearchCriteria,
    fields: Record<SearchField, ResolvedField>,
    today: string,
): CriterionResult[] {
    const a = criteria.advanced ?? advancedSearchSchema.parse({})
    const checks: CriterionResult[] = []
    const add = (
        key: string,
        label: string,
        status: CriterionResult['status'],
        rule: 'prefer' | 'require',
    ) => checks.push({ key, label, status, required: rule === 'require' })
    const range = (
        key: SearchField,
        label: string,
        min: number | null,
        max: number | null,
        rule: 'prefer' | 'require',
        currencyField?: SearchField,
    ) => {
        if (min === null && max === null) return
        const field = fields[key]
        const raw = field.value ?? ''
        const number = /^\d+(?:\.\d+)?$/.test(raw) ? Number(raw) : NaN
        const currency = currencyField ? fields[currencyField] : null
        const known =
            field.status === 'verified' &&
            Number.isFinite(number) &&
            (key !== 'attendee_count' || Number.isInteger(number)) &&
            (!currency ||
                (currency.status === 'verified' &&
                    field.evidence.some(
                        (price) =>
                            price.status === 'verified' &&
                            currency.evidence.some(
                                (unit) =>
                                    unit.status === 'verified' &&
                                    unit.sourceUrl === price.sourceUrl,
                            ),
                    )))
        const matchingCurrency = !currency || currency.value === a.currency
        // No implicit FX conversion. Different currencies are unresolved, not failed budgets.
        add(
            key,
            `${label}: ${min ?? 'Any'}–${max ?? 'Any'}${currencyField ? ' ' + a.currency : ''}`,
            !known || !matchingCurrency
                ? 'unknown'
                : (min === null || number >= min) &&
                    (max === null || number <= max)
                  ? 'matched'
                  : 'failed',
            rule,
        )
    }
    range(
        'attendee_count',
        'Published attendee count',
        a.attendeeMin,
        a.attendeeMax,
        a.sizeRule,
    )
    range(
        'ticket_price',
        'Published standard ticket price',
        a.ticketMin,
        a.ticketMax,
        a.budgetRule,
        'ticket_currency',
    )
    range(
        'sponsorship_price',
        'Published starting sponsorship price',
        a.sponsorshipMin,
        a.sponsorshipMax,
        a.budgetRule,
        'sponsorship_currency',
    )
    if (a.language) {
        const field = fields.language
        const normalize = (s: string) =>
            s.normalize('NFKC').trim().toLowerCase()
        add(
            'language',
            `Language: ${a.language}`,
            field.status !== 'verified'
                ? 'unknown'
                : field.value
                        ?.split(/[,;|]/)
                        .some((v) => normalize(v) === normalize(a.language))
                  ? 'matched'
                  : 'failed',
            a.sizeRule,
        )
    }
    for (const type of a.deadlineTypes) {
        const field = fields[`${type}_deadline` as SearchField]
        const value = field.value
        const valid =
            !!value &&
            /^\d{4}-\d{2}-\d{2}$/.test(value) &&
            !Number.isNaN(Date.parse(value)) &&
            new Date(value).toISOString().slice(0, 10) === value
        add(
            `${type}_deadline`,
            `${type.toUpperCase()} deadline on/after ${a.deadlineAfter || today}`,
            field.status !== 'verified' || !valid
                ? 'unknown'
                : value! >= (a.deadlineAfter || today)
                  ? 'matched'
                  : 'failed',
            a.deadlineRule,
        )
    }
    for (const goal of a.objectives) {
        const field = fields.participation_options
        add(
            `objective:${goal}`,
            `Participation preference: ${goal} (availability not inferred)`,
            field.status === 'verified' &&
                field.value
                    ?.split(/[,;|]/)
                    .map((v) => v.trim().toLowerCase())
                    .includes(goal)
                ? 'matched'
                : 'unknown',
            'prefer',
        )
    }
    return checks
}

export function compareSearchPreferences(
    a: { criteria: CriterionResult[] },
    b: { criteria: CriterionResult[] },
) {
    const preferred = (item: { criteria: CriterionResult[] }) =>
        item.criteria.filter(
            (c) => c.required === false && c.status === 'matched',
        ).length
    const required = (item: { criteria: CriterionResult[] }) =>
        item.criteria.filter(
            (c) => c.required !== false && c.status === 'matched',
        ).length
    return preferred(b) - preferred(a) || required(b) - required(a)
}
