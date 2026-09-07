'use client'
import { useRouter } from 'next/navigation'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { useTasks } from '@/hooks/useTasks'
import { remindersEnabled, REMINDER_PREFERENCE_EVENT } from '@/lib/task-reminder-preferences'

const STORAGE_KEY = 'eventra-shown-task-reminders'

export function TaskReminderNotifier() {
    const router = useRouter()
    const { data: tasks } = useTasks()

    useEffect(() => {
        if (!tasks?.length) return

        const checkReminders = () => {
            if (!remindersEnabled()) return
            let previous: string[] = []
            try {
                const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
                if (Array.isArray(stored)) previous = stored.filter((value): value is string => typeof value === 'string')
            } catch { /* A blocked or stale browser cache must not crash the workspace. */ }
            const shown = new Set<string>(previous)

            tasks.forEach(task => {
                if (!task.reminder_at || task.status === 'done' || task.status === 'archived') return

                const reminderTime = new Date(task.reminder_at).getTime()
                const reminderKey = `${task.id}:${task.reminder_at}`
                if (!Number.isFinite(reminderTime) || reminderTime > Date.now() || shown.has(reminderKey)) return

                toast.warning(`Task reminder: ${task.title}`, {
                    description: task.events?.name || 'Event task requires attention',
                    duration: 10000,
                    action: {
                        label: 'Open',
                        onClick: () => { router.push(`/tasks/${task.id}`) },
                    },
                })
                shown.add(reminderKey)
            })

            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(shown).slice(-200))) } catch { /* Storage can be disabled by the browser. */ }
        }

        checkReminders()
        const interval = window.setInterval(checkReminders, 30_000)
        window.addEventListener(REMINDER_PREFERENCE_EVENT, checkReminders)
        return () => { window.clearInterval(interval); window.removeEventListener(REMINDER_PREFERENCE_EVENT, checkReminders) }
    }, [tasks, router])

    return null
}
