'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'

export default function NewTaskPage() {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [events, setEvents] = useState<any[]>([])
    const [selectedEventId, setSelectedEventId] = useState<string>('')
    const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
    const [status, setStatus] = useState<'draft' | 'pending' | 'in_progress'>('pending')

    // Fetch events for dropdown
    useEffect(() => {
        async function fetchEvents() {
            const { data } = await supabase
                .from('events')
                .select('id, name')
                .order('start_date', { ascending: false })

            if (data) {
                setEvents(data)
                if (data.length > 0) {
                    setSelectedEventId(data[0].id)
                }
            }
        }
        fetchEvents()
    }, [supabase])

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        if (!selectedEventId) {
            setError('Please select an event.')
            return
        }

        setLoading(true)
        setError('')

        const formData = new FormData(e.currentTarget)

        try {
            const { data, error: insertError } = await supabase
                .from('tasks')
                .insert([
                    {
                        event_id: selectedEventId,
                        title: formData.get('title') as string,
                        description: formData.get('description') as string || null,
                        status: status,
                        priority: priority,
                        due_date: formData.get('due_date') as string || null,
                        estimated_cost: parseFloat(formData.get('estimated_cost') as string) || null,
                        vendor_company: formData.get('vendor_company') as string || null,
                        contact_person: formData.get('contact_person') as string || null,
                    }
                ])
                .select()
                .single()

            if (insertError) throw insertError

            router.push(`/tasks/${data.id}`)
        } catch (err: any) {
            setError(err.message || 'Failed to create task')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
            <Link href="/tasks" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white text-sm mb-4 inline-block">
                ← Back to Tasks
            </Link>

            <h1 className="text-5xl font-medium text-zinc-900 dark:text-white mb-8">Create New Task</h1>

            <Card className="p-8 border border-zinc-200 dark:bg-slate-900 dark:border-white/10">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Event Selection */}
                    <div>
                        <Label htmlFor="event_id">Event *</Label>
                        <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select an event" />
                            </SelectTrigger>
                            <SelectContent>
                                {events.map((event) => (
                                    <SelectItem key={event.id} value={event.id}>
                                        {event.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Task Title */}
                    <div>
                        <Label htmlFor="title">Task Title *</Label>
                        <Input
                            id="title"
                            name="title"
                            type="text"
                            required
                            placeholder="Book venue"
                            className="mt-1"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            name="description"
                            placeholder="Task details and requirements..."
                            className="mt-1"
                            rows={4}
                        />
                    </div>

                    {/* Priority and Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="priority">Priority *</Label>
                            <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="status">Status *</Label>
                            <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Due Date and Estimated Cost */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="due_date">Due Date</Label>
                            <Input
                                id="due_date"
                                name="due_date"
                                type="date"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="estimated_cost">Estimated Cost ($)</Label>
                            <Input
                                id="estimated_cost"
                                name="estimated_cost"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="5000"
                                className="mt-1"
                            />
                        </div>
                    </div>

                    {/* Vendor Details */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="vendor_company">Vendor Company</Label>
                            <Input
                                id="vendor_company"
                                name="vendor_company"
                                type="text"
                                placeholder="Acme Venues Inc."
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="contact_person">Contact Person</Label>
                            <Input
                                id="contact_person"
                                name="contact_person"
                                type="text"
                                placeholder="John Doe"
                                className="mt-1"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-4">
                        <Button type="submit" disabled={loading || !selectedEventId} className="flex-1">
                            {loading ? 'Creating...' : 'Create Task'}
                        </Button>
                        <Link href="/tasks" className="flex-1">
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
