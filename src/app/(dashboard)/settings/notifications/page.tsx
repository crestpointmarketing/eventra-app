'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SettingsShell } from '@/components/settings/settings-shell'
import { Button } from '@/components/ui/button'
import { remindersEnabled, saveReminderPreference } from '@/lib/task-reminder-preferences'

export default function NotificationsPage() {
    const [enabled, setEnabled] = useState(true)
    const [ready, setReady] = useState(false)
    const [message, setMessage] = useState('')
    useEffect(() => { setEnabled(remindersEnabled()); setReady(true) }, [])
    return <SettingsShell title="Notifications" description="Choose whether Eventra displays task reminders in this browser.">
        <form className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6" onSubmit={e => {
            e.preventDefault()
            try { saveReminderPreference(enabled); setMessage('Notification preference saved for this browser.') }
            catch { setMessage('Your browser could not save this preference. Allow site storage and try again.') }
        }}>
            <h2 className="font-semibold">In-app task reminders</h2>
            <label className="flex items-start gap-3"><input className="mt-1 h-4 w-4 accent-lime-600" type="checkbox" checked={enabled} disabled={!ready} onChange={e => setEnabled(e.target.checked)} /><span>Show task reminders<span className="mt-1 block text-sm text-muted-foreground">Reminders appear when their scheduled time arrives while Eventra is open. Completed and archived tasks are excluded.</span></span></label>
            <p className="text-sm text-muted-foreground">This setting applies to this browser, including other accounts using it. It does not change task reminder dates. Email and push delivery are not currently available.</p>
            <p role="status" className="text-sm text-muted-foreground">{message}</p>
            <div className="flex flex-wrap gap-2"><Button type="submit" disabled={!ready}>Save preference</Button><Button variant="outline" asChild><Link href="/tasks">Manage task reminders</Link></Button></div>
        </form>
    </SettingsShell>
}
