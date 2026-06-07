'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Trash2 } from 'lucide-react'
import { useEventComments, useAddComment, useDeleteComment, useCurrentUserEmail } from '@/hooks/useEventComments'
import { Skeleton } from '@/components/ui/skeleton'

function formatRelativeTime(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function avatarInitials(email: string) {
    const name = email.split('@')[0]
    const parts = name.split(/[._-]/)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
}

function avatarColor(email: string) {
    const colors = [
        'bg-violet-500', 'bg-blue-500', 'bg-emerald-500',
        'bg-rose-500', 'bg-amber-500', 'bg-cyan-500',
    ]
    let hash = 0
    for (const ch of email) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff
    return colors[Math.abs(hash) % colors.length]
}

export function EventComments({ eventId }: { eventId: string }) {
    const { data: comments, isLoading } = useEventComments(eventId)
    const { data: currentEmail } = useCurrentUserEmail()
    const { mutate: addComment, isPending: adding } = useAddComment(eventId)
    const { mutate: deleteComment } = useDeleteComment(eventId)

    const [text, setText] = useState('')
    const bottomRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [comments?.length])

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const trimmed = text.trim()
        if (!trimmed) return
        addComment(trimmed, { onSuccess: () => setText('') })
    }

    return (
        <div className="flex flex-col h-full">
            {/* Comment list */}
            <div className="flex-1 space-y-4 overflow-y-auto max-h-72 pr-1">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex gap-3">
                            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                            <div className="flex-1 space-y-1">
                                <Skeleton className="h-3 w-24" />
                                <Skeleton className="h-4 w-full" />
                            </div>
                        </div>
                    ))
                ) : comments && comments.length > 0 ? (
                    comments.map((c) => (
                        <div key={c.id} className="flex gap-3 group">
                            <div className={`h-8 w-8 rounded-full ${avatarColor(c.author_email)} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                                {avatarInitials(c.author_email)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                        {c.author_email.split('@')[0]}
                                    </span>
                                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                                        {formatRelativeTime(c.created_at)}
                                    </span>
                                    {currentEmail === c.author_email && (
                                        <button
                                            onClick={() => deleteComment(c.id)}
                                            className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-red-500"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                                <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed break-words">
                                    {c.body}
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-4">
                        No comments yet
                    </p>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-[minmax(0,1fr)_2.75rem] gap-3 items-end">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSubmit(e as any)
                        }
                    }}
                    placeholder="Add a comment... (Enter to send)"
                    rows={2}
                    className="min-w-0 w-full resize-none rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#CBFB45]/50"
                />
                <button
                    type="submit"
                    disabled={adding || !text.trim()}
                    className="h-11 w-11 flex items-center justify-center rounded-md bg-[#CBFB45] hover:bg-[#b8e33d] disabled:opacity-40 transition-colors"
                    aria-label="Send comment"
                >
                    <Send className="h-4 w-4 text-zinc-900" />
                </button>
            </form>
        </div>
    )
}
