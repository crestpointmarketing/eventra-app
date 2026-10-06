import test from 'node:test'
import assert from 'node:assert/strict'
import { buildIcs } from '../src/lib/events/ics'

const now = new Date('2026-10-05T12:00:00Z')

test('ics exports all-day events with exclusive end and escaped text', () => {
    const ics = buildIcs([{
        id: 'e1', name: 'AI Summit; Boston, MA', start_date: '2026-12-30', end_date: '2026-12-31',
        location: 'Boston, MA', event_type: 'Summit',
    }], { origin: 'https://app.test', now })
    assert.match(ics, /^BEGIN:VCALENDAR\r\n/)
    assert.match(ics, /DTSTART;VALUE=DATE:20261230\r\n/)
    assert.match(ics, /DTEND;VALUE=DATE:20270101\r\n/)
    assert.match(ics, /SUMMARY:AI Summit\\; Boston\\, MA\r\n/)
    assert.match(ics, /DTSTAMP:20261005T120000Z\r\n/)
    assert.match(ics, /URL:https:\/\/app.test\/events\/e1\r\n/)
    assert.ok(ics.endsWith('END:VCALENDAR\r\n'))
})

test('ics skips undated events and treats missing or invalid end as single day', () => {
    const ics = buildIcs([
        { id: 'a', name: 'No date', start_date: null },
        { id: 'b', name: 'One day', start_date: '2026-02-28', end_date: null },
        { id: 'c', name: 'Backwards', start_date: '2026-03-05', end_date: '2026-03-01' },
    ], { now })
    assert.equal(ics.match(/BEGIN:VEVENT/g)?.length, 2)
    assert.match(ics, /UID:b@eventra\r\nDTSTAMP:\S+\r\nDTSTART;VALUE=DATE:20260228\r\nDTEND;VALUE=DATE:20260301/)
    assert.match(ics, /DTSTART;VALUE=DATE:20260305\r\nDTEND;VALUE=DATE:20260306/)
})

test('ics folds long lines at 75 octets', () => {
    const ics = buildIcs([{ id: 'x', name: '活动'.repeat(60), start_date: '2026-01-01' }], { now })
    for (const line of ics.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, line)
    assert.ok(ics.includes('\r\n '))
})
