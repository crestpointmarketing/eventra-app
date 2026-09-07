'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SettingsShell } from '@/components/settings/settings-shell'
import { Button } from '@/components/ui/button'

export default function SecurityPage() {
    const router = useRouter()
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState('')
    return <SettingsShell title="Security & access" description="Manage your password and the session on this device.">
        <section className="space-y-3 rounded-xl border border-border bg-card p-5 sm:p-6"><h2 className="font-semibold">Password</h2><p className="text-muted-foreground">Use the secure password form to choose a new password for your account.</p><Button asChild><Link href="/reset-password">Change password</Link></Button></section>
        <section className="space-y-3 rounded-xl border border-border bg-card p-5 sm:p-6"><h2 className="font-semibold">Team access</h2><p className="text-muted-foreground">Workspace data is shared with authorized team members. Contact your workspace owner to request membership or a change to your access.</p><Button variant="outline" asChild><Link href="/help#team-access">Read about team access</Link></Button></section>
        <section className="space-y-3 rounded-xl border border-border bg-card p-5 sm:p-6"><h2 className="font-semibold">Current session</h2><p className="text-muted-foreground">Sign out of Eventra on this device. Your saved workspace data will remain available when you sign in again.</p><Button variant="outline" disabled={busy} onClick={async () => {
            setBusy(true); setMessage('')
            try { const { error } = await createClient().auth.signOut({ scope: 'local' }); if (error) throw error; router.replace('/login'); router.refresh() }
            catch { setBusy(false); setMessage('Could not sign out. Please try again.') }
        }}>{busy ? 'Signing out…' : 'Sign out of this device'}</Button><p role="alert" className="text-sm text-red-600">{message}</p></section>
    </SettingsShell>
}
