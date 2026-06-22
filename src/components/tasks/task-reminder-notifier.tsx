'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { useTasks } from '@/hooks/useTasks'

const STORAGE_KEY = 'eventra-shown-task-reminders'

export function TaskReminderNotifier() {
    const { data: tasks } = useTasks()

    useEffect(() => {
        if (!tasks?.length) return

        const checkReminders = () => {
            const shown = new Set<string>(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'))

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
                        onClick: () => { window.location.href = `/tasks/${task.id}` },
                    },
                })
                shown.add(reminderKey)
            })

            localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(shown).slice(-200)))
        }

        checkReminders()
        const interval = window.setInterval(checkReminders, 30_000)
        return () => window.clearInterval(interval)
    }, [tasks])

    return null
}
