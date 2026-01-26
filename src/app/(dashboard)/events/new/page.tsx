'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export default function NewEventPage() {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [ownerId, setOwnerId] = useState<string | null>(null)

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
                        start_date: formData.get('start_date') as string,
                        end_date: formData.get('end_date') as string,
                        location: formData.get('location') as string,
                        total_budget: parseFloat(formData.get('total_budget') as string) || 0,
                        target_leads: parseInt(formData.get('target_leads') as string) || 0,
                        owner_id: ownerId,
                    }
                ])
                .select()
                .single()

            if (insertError) throw insertError

            router.push(`/events/${data.id}`)
        } catch (err: any) {
            setError(err.message || 'Failed to create event')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
            <Link href="/events" className="text-zinc-600 hover:text-zinc-900 text-sm mb-4 inline-block">
                ← Back to Events
            </Link>

            <h1 className="text-5xl font-medium text-zinc-900 mb-8">Create New Event</h1>

            <Card className="p-8 border border-zinc-200">
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
                        <Input
                            id="event_type"
                            name="event_type"
                            type="text"
                            required
                            placeholder="conference"
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

                    <div className="flex gap-4">
                        <Button type="submit" disabled={loading || !ownerId} className="flex-1">
                            {loading ? 'Creating...' : 'Create Event'}
                        </Button>
                        <Link href="/events" className="flex-1">
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
