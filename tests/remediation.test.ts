import { test } from 'node:test'
import assert from 'node:assert/strict'
import { eventraDatabaseUrl } from '../src/lib/supabase/project'
import { escapePreviewText, safePreviewUrl } from '../src/lib/safe-preview'

test('database isolation rejects Pomelo, legacy projects and crafted URLs', () => {
    assert.equal(eventraDatabaseUrl('https://tbicyyhprqbhimhrihgn.supabase.co'), 'https://tbicyyhprqbhimhrihgn.supabase.co')
    for (const url of ['https://hlkrfpadbtdhmdfqnljg.supabase.co', 'https://lmcabtwbtoacylajrpno.supabase.co', 'https://tbicyyhprqbhimhrihgn.supabase.co.evil.test', 'http://tbicyyhprqbhimhrihgn.supabase.co', 'https://user@tbicyyhprqbhimhrihgn.supabase.co']) assert.throws(() => eventraDatabaseUrl(url), /mismatch/)
})
test('template preview renders hostile markup as text and rejects executable links', () => {
    assert.equal(escapePreviewText('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;')
    assert.equal(escapePreviewText('{{lead.first_name}} & team'), '{{lead.first_name}} &amp; team')
    assert.equal(safePreviewUrl('javascript:alert(1)'), undefined)
    assert.equal(safePreviewUrl('https://example.com'), 'https://example.com/')
})
