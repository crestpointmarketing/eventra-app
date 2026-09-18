'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function LeadNotes({ leadId }: { leadId: string }) {
    const [note, setNote] = useState('')
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState('')
    const cache = useQueryClient()
    const activity = useQuery({ queryKey: ['lead-activities', leadId], queryFn: async () => {
        const { data, error } = await createClient().from('lead_activities').select('id,activity_type,activity_data,created_at').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(100)
        if (error) throw error
        return data
    } })
    return <section className="space-y-4 min-w-0">
        <h2 className="font-semibold">Notes & activity</h2>
        <form className="space-y-3" onSubmit={async e => {
            e.preventDefault(); if (!note.trim() || busy) return
            setBusy(true); setMessage('')
            try {
                const db = createClient()
                const { data: { user }, error: authError } = await db.auth.getUser()
                if (authError || !user) throw new Error('Please sign in again')
                const { error } = await db.from('lead_activities').insert({ lead_id: leadId, activity_type: 'note_added', activity_data: { note: note.trim() }, created_by: user.id }).select('id').single()
                if (error) throw error
                setNote(''); setMessage('Note saved.')
                await cache.invalidateQueries({ queryKey: ['lead-activities', leadId] })
            } catch { setMessage('Could not save your note. Your text has been kept; please retry.') }
            finally { setBusy(false) }
        }}>
            <Textarea aria-label="Lead note" placeholder="Add a note…" value={note} onChange={e => setNote(e.target.value)} maxLength={5000} disabled={busy} />
            <Button type="submit" disabled={busy || !note.trim()}>{busy ? 'Saving…' : 'Save Note'}</Button>
            <p role="status" className="text-sm text-muted-foreground">{message}</p>
        </form>
        {activity.isPending ? <p>Loading activity…</p> : activity.isError ? <div role="alert">Could not load activity. <Button variant="outline" onClick={() => activity.refetch()}>Retry</Button></div> : !activity.data?.length ? <p className="text-sm text-muted-foreground">No recorded activity yet.</p> : <ol className="space-y-3">{activity.data.map(item => <li key={item.id} className="rounded-lg border border-border p-3 break-words">
            <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>{item.activity_type.replaceAll('_', ' ')}</span><time>{new Date(item.created_at).toLocaleString()}</time></div>
            {typeof item.activity_data?.note === 'string' && <p className="mt-2 whitespace-pre-wrap text-sm">{item.activity_data.note}</p>}
        </li>)}</ol>}
    </section>
}
