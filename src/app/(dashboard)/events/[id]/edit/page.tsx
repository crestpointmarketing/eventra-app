'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useEvent } from '@/hooks/useEvent'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const queryClient = useQueryClient()
    const supabase = createClient()
    const { data: event, isLoading } = useEvent(id)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const formData = new FormData(e.currentTarget)

        try {
            const { error: updateError } = await supabase
                .from('events')
                .update({
                    name: formData.get('name') as string,
                    event_type: formData.get('event_type') as string,
                    start_date: formData.get('start_date') as string,
                    end_date: formData.get('end_date') as string,
                    location: formData.get('location') as string,
                    total_budget: parseFloat(formData.get('total_budget') as string) || 0,
                    target_leads: parseInt(formData.get('target_leads') as string) || 0,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id)

            if (updateError) throw updateError

            // Invalidate caches to refresh data
            await queryClient.invalidateQueries({ queryKey: ['event', id] })
            await queryClient.invalidateQueries({ queryKey: ['events'] })

            router.push(`/events/${id}`)
        } catch (err: any) {
            setError(err.message || 'Failed to update event')
        } finally {
            setLoading(false)
        }
    }

    if (isLoading) {
        return (
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
                <p className="text-zinc-600">Loading event...</p>
            </div>
        )
    }

    if (!event) {
        return (
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
                <p className="text-red-500">Event not found</p>
                <Link href="/events">
                    <Button className="mt-4">Back to Events</Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
            <Link href={`/events/${id}`} className="text-zinc-600 hover:text-zinc-900 text-sm mb-4 inline-block">
                ← Back to Event
            </Link>

            <h1 className="text-5xl font-medium text-zinc-900 mb-8">Edit Event</h1>

            <Card className="p-8 border border-zinc-200">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <Label htmlFor="name">Event Name *</Label>
                        <Input
                            id="name"
                            name="name"
                            type="text"
                            required
                            defaultValue={event.name}
                            className="mt-1"
                        />
                    </div>

                    <div>
                        <Label htmlFor="event_type">Event Type *</Label>
                        <Input
                            id="event_type"
                            name="event_type"
                            type="text"
                            required
                            defaultValue={event.event_type || ''}
                            className="mt-1"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="start_date">Start Date *</Label>
                            <Input
                                id="start_date"
                                name="start_date"
                                type="date"
                                required
                                defaultValue={event.start_date || ''}
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
                                defaultValue={event.end_date || ''}
                                className="mt-1"
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="location">Location *</Label>
                        <Input
                            id="location"
                            name="location"
                            type="text"
                            required
                            defaultValue={event.location || ''}
                            className="mt-1"
                        />
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
                                defaultValue={event.total_budget || 0}
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
                                defaultValue={event.target_leads || 0}
                                className="mt-1"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-4">
                        <Button type="submit" disabled={loading} className="flex-1">
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Link href={`/events/${id}`} className="flex-1">
                            <Button type="button" variant="outline" className="w-full">
                                Cancel
                            </Button>
                        </Link>
                    </div>
                </form>
            </Card>
        </div>
    )
}
