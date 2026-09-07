'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { UserSelect } from '@/components/users/user-select'
import { EVENT_PRIORITIES } from '@/lib/events/priority'
import { ENGAGEMENT_TYPES, EVENT_TYPES } from '@/lib/events/taxonomy'
import { buildDefaultEventTasks, seedDefaultEventTasks } from '@/lib/events/default-tasks'
import { toast } from 'sonner'

export default function NewEventPage() {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [ownerId, setOwnerId] = useState<string | null>(null)
    const [createTasks, setCreateTasks] = useState(false)
    const taskCount = buildDefaultEventTasks('preview').length

    // Get a real user ID from the database on mount
    useEffect(() => {
        async function getDefaultUser() {
            const { data } = await supabase
                .from('users')
                .select('id')
                .limit(1)
                .single()

            if (data) {
                setOwnerId(data.id)
            }
        }
        getDefaultUser()
    }, [supabase])

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        if (!ownerId) {
            setError('Unable to determine owner. Please try again.')
            return
        }

        setLoading(true)
        setError('')

        const formData = new FormData(e.currentTarget)

        try {
            const { data, error: insertError } = await supabase
                .from('events')
                .insert([
                    {
                        name: formData.get('name') as string,
                        event_type: formData.get('event_type') as string,
                        discovery_priority: formData.get('discovery_priority') as string,
                        engagement_type: formData.get('engagement_type') as string,
                        start_date: formData.get('start_date') as string,
                        end_date: formData.get('end_date') as string,
                        location: formData.get('location') as string,
                        total_budget: parseFloat(formData.get('total_budget') as string) || 0,
                        target_leads: parseInt(formData.get('target_leads') as string) || 0,
                        url: formData.get('url') as string,
                        owner_id: ownerId,
                        source: 'manual',
                    }
                ])
                .select()
                .single()

            if (insertError) throw insertError

            if (createTasks) {
                try {
                    await seedDefaultEventTasks(supabase, data.id, data.start_date)
                } catch {
                    toast.error('Event created, but starter tasks could not be created. Open the event to review its tasks.')
                }
            }

            router.push(`/events/${data.id}`)
        } catch (err: any) {
            setError(err.message || 'Failed to create event')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6">
            <Link href="/events" className="text-zinc-600 hover:text-zinc-900 dark:text-white/60 dark:hover:text-[#cbfb45] text-sm mb-4 inline-block">
                ← Back to Events
            </Link>

            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-8">Create New Event</h1>

            <Card className="p-8 border border-zinc-200 dark:bg-slate-900 dark:border-white/10">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <Label htmlFor="name">Event Name *</Label>
                        <Input
                            id="name"
                            name="name"
                            type="text"
                            required
                            placeholder="SaaS Summit 2026"
                            className="mt-1"
                        />
                    </div>

                    <div>
                        <Label htmlFor="event_type">Event Type *</Label>
                        <select
                            id="event_type"
                            name="event_type"
                            required
                            defaultValue="Conference"
                            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            {EVENT_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="discovery_priority">Priority</Label>
                            <select
                                id="discovery_priority"
                                name="discovery_priority"
                                defaultValue="Medium"
                                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                {EVENT_PRIORITIES.map(priority => (
                                    <option key={priority} value={priority}>{priority}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="engagement_type">Engagement Type</Label>
                            <select
                                id="engagement_type"
                                name="engagement_type"
                                defaultValue="Attend"
                                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                {ENGAGEMENT_TYPES.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="start_date">Start Date *</Label>
                            <Input
                                id="start_date"
                                name="start_date"
                                type="date"
                                required
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="end_date">End Date *</Label>
                            <Input
                                id="end_date"
                                name="end_date"
                                type="date"
                                required
                                className="mt-1"
                            />
                        </div>
                    </div>



                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="location">Location *</Label>
                            <Input
                                id="location"
                                name="location"
                                type="text"
                                required
                                placeholder="San Francisco, CA"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="url">Event URL</Label>
                            <Input
                                id="url"
                                name="url"
                                type="url"
                                placeholder="https://..."
                                className="mt-1"
                            />
                        </div>
                    </div>

                    <div>
                        <Label>Owner *</Label>
                        <div className="mt-1">
                            <UserSelect
                                value={ownerId || ''}
                                onValueChange={setOwnerId}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="total_budget">Budget ($) *</Label>
                            <Input
                                id="total_budget"
                                name="total_budget"
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                placeholder="50000"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="target_leads">Target Leads *</Label>
                            <Input
                                id="target_leads"
                                name="target_leads"
                                type="number"
                                required
                                min="0"
                                placeholder="100"
                                className="mt-1"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    <section className="rounded-xl border border-border bg-muted p-4">
                        <label className="flex cursor-pointer items-start gap-3 text-sm font-medium">
                            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-lime-600" checked={createTasks} onChange={e => setCreateTasks(e.target.checked)} />
                            <span>Create {taskCount} starter tasks<span className="mt-1 block text-xs font-normal text-muted-foreground">Tasks will be scheduled from the event date. Leave unchecked to create only the event.</span></span>
                        </label>
                    </section>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Button type="submit" disabled={loading || !ownerId} className="flex-1">
                            {loading ? 'Creating...' : createTasks ? `Create event & ${taskCount} tasks` : 'Create event without tasks'}
                        </Button>
                        <Link href="/events" className="flex-1">
                            <Button type="button" variant="outline" className="w-full">
                                Cancel
                            </Button>
                        </Link>
                    </div>
                </form>
            </Card>
        </div >
    )
}
