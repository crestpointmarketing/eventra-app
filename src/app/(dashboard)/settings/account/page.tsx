'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { SettingsShell } from '@/components/settings/settings-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function AccountPage() {
    const db = useMemo(() => createClient(), [])
    const { theme, setTheme } = useTheme()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [ready, setReady] = useState(false)
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState('')
    const [failed, setFailed] = useState(false)
    useEffect(() => {
        db.auth.getUser().then(({ data, error }) => {
            if (error || !data.user) { setFailed(true); setMessage('Could not load your account. Refresh to retry.'); return }
            setName(data.user.user_metadata?.full_name || '')
            setEmail(data.user.email || '')
            setReady(true)
        }).catch(() => { setFailed(true); setMessage('Could not load your account. Refresh to retry.') })
    }, [db])
    async function save(e: React.FormEvent) {
        e.preventDefault(); setBusy(true); setMessage(''); setFailed(false)
        try {
            const { error } = await db.auth.updateUser({ data: { full_name: name.trim() } })
            if (error) throw error
            setMessage('Profile saved.')
        } catch { setFailed(true); setMessage('Your profile could not be saved. Please try again.') }
        finally { setBusy(false) }
    }
    return <SettingsShell title="Account settings" description="Manage your profile and the appearance of this workspace.">
        <form onSubmit={save} className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
            <h2 className="font-semibold">Your profile</h2>
            <div className="space-y-2"><Label htmlFor="full-name">Display name</Label><Input id="full-name" autoComplete="name" maxLength={100} value={name} onChange={e => setName(e.target.value)} disabled={!ready || busy} /></div>
            <div className="space-y-2"><Label htmlFor="account-email">Email address</Label><Input id="account-email" value={email} readOnly /><p className="text-sm text-muted-foreground">Your sign-in email is shown here for reference.</p></div>
            <p role={failed ? 'alert' : 'status'} className={failed ? 'text-sm text-red-600' : 'text-sm text-muted-foreground'}>{message || (!ready ? 'Loading account…' : '')}</p>
            <Button disabled={!ready || busy} type="submit">{busy ? 'Saving…' : 'Save profile'}</Button>
        </form>
        <section className="space-y-3 rounded-xl border border-border bg-card p-5 sm:p-6"><h2 className="font-semibold">Appearance</h2><p className="text-sm text-muted-foreground">Applies immediately on this browser.</p><Label htmlFor="appearance">Color theme</Label><select id="appearance" className="h-10 w-full rounded-lg border border-input bg-card px-3" value={ready ? theme || 'system' : 'system'} onChange={e => setTheme(e.target.value)} disabled={!ready}><option value="system">Use device setting</option><option value="light">Light</option><option value="dark">Dark</option></select></section>
    </SettingsShell>
}
