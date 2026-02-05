'use client'

import { use, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useEvent } from '@/hooks/useEvent'
import { useUpdateEvent, UpdateEventInput } from '@/hooks/useUpdateEvent'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ArrowLeft, ChevronDown, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { UserSelect } from '@/components/users/user-select'

const EVENT_TYPES = [
    'conference',
    'seminar',
    'workshop',
    'networking_event',
    'product_launch',
    'trade_show',
    'webinar',
    'vip_dinner',
    'fundraiser',
    'other'
]

const EVENT_STATUSES = [
    { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-700' },
    { value: 'planned', label: 'Planned', color: 'bg-blue-100 text-blue-700' },
    { value: 'live', label: 'Live', color: 'bg-green-100 text-green-700' },
    { value: 'completed', label: 'Completed', color: 'bg-purple-100 text-purple-700' },
    { value: 'canceled', label: 'Canceled', color: 'bg-red-100 text-red-700' },
]

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const { data: event, isLoading } = useEvent(id)
    const updateEvent = useUpdateEvent()

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors, isDirty, isSubmitting },
        reset
    } = useForm<UpdateEventInput>()

    // Load event data into form
    useEffect(() => {
        if (event) {
            reset({
                name: event.name || '',
                event_type: event.event_type || '',
                status: event.status || 'draft',
                start_date: event.start_date || '',
                end_date: event.end_date || '',
                location: event.location || '',
                venue: event.venue || '',
                url: event.url || '',
                description: event.description || '',
                total_budget: event.total_budget || 0,
                target_leads: event.target_leads || 0,
                target_revenue: event.target_revenue || 0,
                actual_leads: event.actual_leads || 0,
                actual_revenue: event.actual_revenue || 0,
                industry: event.industry || '',
                goal_statement: event.goal_statement || '',
                target_audience: event.target_audience || '',
                core_message: event.core_message || '',
                primary_offering: event.primary_offering || '',
                key_cta: event.key_cta || '',
                owner_id: event.owner_id || event.owner?.id || '',
            })
        }
    }, [event, reset])

    // Warn before leaving with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault()
                e.returnValue = ''
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [isDirty])

    const onSubmit = async (data: UpdateEventInput) => {
        try {
            await updateEvent.mutateAsync({ id, data })
            reset(data) // Reset form with new values to clear dirty state
            router.push(`/events/${id}`)
        } catch (error) {
            // Error handled by mutation
        }
    }

    const handleCancel = () => {
        if (isDirty) {
            if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
                router.push(`/events/${id}`)
            }
        } else {
            router.push(`/events/${id}`)
        }
    }

    const selectedStatus = watch('status')
    const canEditActuals = selectedStatus === 'completed' || selectedStatus === 'live'

    if (isLoading) {
        return (
            <div className="container mx-auto p-6">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 w-64 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                    <div className="h-96 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                </div>
            </div>
        )
    }

    if (!event) {
        return (
            <div className="container mx-auto p-6">
                <Card className="p-12 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Event not found</h3>
                    <Link href="/events">
                        <Button>Back to Events</Button>
                    </Link>
                </Card>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-6 max-w-5xl">
            {/* Header */}
            <div className="mb-8">
                <Link
                    href={`/events/${id}`}
                    className="inline-flex items-center text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white mb-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Event
                </Link>
                <div className="flex items-center justify-between">
                    <h1 className="text-5xl font-medium text-zinc-900 dark:text-white">Edit Event</h1>
                    {isDirty && (
                        <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            Unsaved changes
                        </div>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* Section A: Basic Information */}
                <Card className="p-8">
                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-6">
                        Basic Information
                    </h2>
                    <div className="space-y-6">
                        {/* Event Name */}
                        <div>
                            <Label htmlFor="name" className="required">Event Name</Label>
                            <Input
                                id="name"
                                {...register('name', { required: 'Event name is required' })}
                                className="mt-2"
                            />
                            {errors.name && (
                                <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                            )}
                        </div>

                        {/* Event Type */}
                        <div>
                            <Label htmlFor="event_type" className="required">Event Type</Label>
                            <Select
                                value={watch('event_type')}
                                onValueChange={(value) => setValue('event_type', value, { shouldDirty: true })}
                            >
                                <SelectTrigger className="mt-2">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {EVENT_TYPES.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {type.replace(/_/g, ' ').toUpperCase()}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Owner Select */}
                        <div>
                            <Label htmlFor="owner">Owner</Label>
                            <div className="mt-2">
                                <UserSelect
                                    value={watch('owner_id')}
                                    onValueChange={(value) => setValue('owner_id', value, { shouldDirty: true })}
                                />
                            </div>
                        </div>

                        {/* Status */}
                        <div>
                            <Label htmlFor="status">Status</Label>
                            <Select
                                value={watch('status')}
                                onValueChange={(value) => setValue('status', value, { shouldDirty: true })}
                            >
                                <SelectTrigger className="mt-2">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {EVENT_STATUSES.map((status) => (
                                        <SelectItem key={status.value} value={status.value}>
                                            <div className="flex items-center gap-2">
                                                <div className={`px-2 py-0.5 rounded-full text-xs ${status.color}`}>
                                                    {status.label}
                                                </div>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="start_date" className="required">Start Date</Label>
                                <Input
                                    id="start_date"
                                    type="date"
                                    {...register('start_date', { required: 'Start date is required' })}
                                    className="mt-2"
                                />
                                {errors.start_date && (
                                    <p className="text-sm text-red-600 mt-1">{errors.start_date.message}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="end_date" className="required">End Date</Label>
                                <Input
                                    id="end_date"
                                    type="date"
                                    {...register('end_date', {
                                        required: 'End date is required',
                                        validate: (value) => {
                                            const start = watch('start_date')
                                            if (start && value && value < start) {
                                                return 'End date must not be before start date'
                                            }
                                            return true
                                        }
                                    })}
                                    className="mt-2"
                                />
                                {errors.end_date && (
                                    <p className="text-sm text-red-600 mt-1">{errors.end_date.message}</p>
                                )}
                            </div>
                        </div>

                        {/* Location & Venue */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="location" className="required">Location</Label>
                                <Input
                                    id="location"
                                    {...register('location', { required: 'Location is required' })}
                                    placeholder="e.g., New York, NY"
                                    className="mt-2"
                                />
                                {errors.location && (
                                    <p className="text-sm text-red-600 mt-1">{errors.location.message}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="venue">Venue</Label>
                                <Input
                                    id="venue"
                                    {...register('venue')}
                                    placeholder="e.g., Hilton Midtown"
                                    className="mt-2"
                                />
                            </div>
                        </div>

                        {/* Event URL */}
                        <div>
                            <Label htmlFor="url">Event URL</Label>
                            <Input
                                id="url"
                                type="url"
                                {...register('url')}
                                placeholder="https://..."
                                className="mt-2"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                {...register('description')}
                                rows={4}
                                placeholder="Brief description of the event..."
                                className="mt-2"
                            />
                        </div>
                    </div>
                </Card>

                {/* Section B: Goals & KPIs */}
                <Card className="p-8">
                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-6">
                        Goals & KPIs
                    </h2>
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="total_budget" className="required">Total Budget ($)</Label>
                                <Input
                                    id="total_budget"
                                    type="number"
                                    step="0.01"
                                    {...register('total_budget', {
                                        required: 'Budget is required',
                                        valueAsNumber: true
                                    })}
                                    className="mt-2"
                                />
                                {errors.total_budget && (
                                    <p className="text-sm text-red-600 mt-1">{errors.total_budget.message}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="target_leads" className="required">Target Leads</Label>
                                <Input
                                    id="target_leads"
                                    type="number"
                                    {...register('target_leads', {
                                        required: 'Target leads is required',
                                        valueAsNumber: true
                                    })}
                                    className="mt-2"
                                />
                                {errors.target_leads && (
                                    <p className="text-sm text-red-600 mt-1">{errors.target_leads.message}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="target_revenue">Target Revenue ($)</Label>
                            <Input
                                id="target_revenue"
                                type="number"
                                step="0.01"
                                {...register('target_revenue', { valueAsNumber: true })}
                                className="mt-2"
                            />
                        </div>

                        {/* Actual metrics (conditional) */}
                        {canEditActuals && (
                            <>
                                <div className="border-t pt-6">
                                    <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4">
                                        Actual Results
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="actual_leads">Actual Leads</Label>
                                            <Input
                                                id="actual_leads"
                                                type="number"
                                                {...register('actual_leads', { valueAsNumber: true })}
                                                className="mt-2"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="actual_revenue">Actual Revenue ($)</Label>
                                            <Input
                                                id="actual_revenue"
                                                type="number"
                                                step="0.01"
                                                {...register('actual_revenue', { valueAsNumber: true })}
                                                className="mt-2"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </Card>

                {/* Section C: Marketing Brief (Collapsible) */}
                <Collapsible>
                    <Card className="p-8">
                        <CollapsibleTrigger className="w-full flex items-center justify-between group">
                            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                                Marketing Brief
                            </h2>
                            <ChevronDown className="w-5 h-5 transition-transform group-data-[state=open]:rotate-180" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-6">
                            <div className="space-y-6">
                                <div>
                                    <Label htmlFor="industry">Industry</Label>
                                    <Input
                                        id="industry"
                                        {...register('industry')}
                                        placeholder="e.g., Technology, Finance"
                                        className="mt-2"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="goal_statement">Goal Statement</Label>
                                    <Textarea
                                        id="goal_statement"
                                        {...register('goal_statement')}
                                        rows={3}
                                        placeholder="What is the primary goal of this event?"
                                        className="mt-2"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="target_audience">Target Audience</Label>
                                    <Textarea
                                        id="target_audience"
                                        {...register('target_audience')}
                                        rows={3}
                                        placeholder="Describe the ideal attendee..."
                                        className="mt-2"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="core_message">Core Message</Label>
                                    <Textarea
                                        id="core_message"
                                        {...register('core_message')}
                                        rows={3}
                                        placeholder="What's the main message or value proposition?"
                                        className="mt-2"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="primary_offering">Primary Offering</Label>
                                    <Textarea
                                        id="primary_offering"
                                        {...register('primary_offering')}
                                        rows={2}
                                        placeholder="What's being offered or showcased?"
                                        className="mt-2"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="key_cta">Key Call-to-Action</Label>
                                    <Input
                                        id="key_cta"
                                        {...register('key_cta')}
                                        placeholder="e.g., Register Now, Learn More"
                                        className="mt-2"
                                    />
                                </div>
                            </div>
                        </CollapsibleContent>
                    </Card>
                </Collapsible>

                {/* Action Buttons */}
                <div className="flex items-center gap-4">
                    <Button
                        type="submit"
                        size="lg"
                        disabled={isSubmitting || !isDirty}
                        className="flex-1 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900"
                    >
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                        type="button"
                        size="lg"
                        variant="outline"
                        onClick={handleCancel}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                </div>
            </form>
        </div>
    )
}
