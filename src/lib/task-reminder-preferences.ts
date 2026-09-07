export const REMINDER_PREFERENCE_KEY = 'eventra-task-reminders-enabled'
export const REMINDER_PREFERENCE_EVENT = 'eventra-reminder-preference-changed'

export function remindersEnabled() {
    try { return localStorage.getItem(REMINDER_PREFERENCE_KEY) !== 'false' } catch { return true }
}

export function saveReminderPreference(enabled: boolean) {
    localStorage.setItem(REMINDER_PREFERENCE_KEY, String(enabled))
    window.dispatchEvent(new Event(REMINDER_PREFERENCE_EVENT))
}
