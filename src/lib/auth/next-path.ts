/**
 * Where to send a user after signing in. Only same-site absolute paths are
 * accepted, so a crafted ?next= can never redirect to another origin.
 */
export function safeNextPath(value: string | null | undefined, fallback = '/dashboard') {
    if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback
    // Avoid looping back into the auth pages themselves.
    if (/^\/(login|auth\/)/.test(value)) return fallback
    return value
}
