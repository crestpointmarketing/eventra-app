import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { detectBottlenecks } from '@/lib/ai/task-prediction-service'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Optional: Verify authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            console.warn('Progress insights API called without authentication')
        }

        const { searchParams } = new URL(request.url)
        const eventId = searchParams.get('eventId')

        if (!eventId) {
            return NextResponse.json(
                { error: 'Event ID is required' },
                { status: 400 }
            )
        }

        // Fetch event details
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('start_date, name')
            .eq('id', eventId)
            .single()

        if (eventError || !event) {
            return NextResponse.json(
                { error: 'Event not found' },
                { status: 404 }
            )
        }

        // Fetch all tasks for this event
        const { data: tasks, error: tasksError } = await supabase
            .from('tasks')
            .select('*')
            .eq('event_id', eventId)

        if (tasksError) {
            return NextResponse.json(
                { error: 'Failed to fetch tasks' },
                { status: 500 }
            )
        }

        if (!tasks || tasks.length === 0) {
            return NextResponse.json({
                completionRate: 0,
                onTrackTasks: 0,
                atRiskTasks: 0,
                bottlenecks: [],
                predictions: null,
                totalTasks: 0
            })
        }

        // Calculate completion metrics
        const completedTasks = tasks.filter(t => t.status === 'completed').length
        const completionRate = Math.round((completedTasks / tasks.length) * 100)

        // Detect bottlenecks
        const bottlenecks = await detectBottlenecks(tasks)

        // Calculate progress metrics
        const now = new Date()
        const eventDate = new Date(event.start_date)
        const daysUntilEvent = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        // Simple risk calculation: tasks with due dates within 7 days or overdue
        const atRiskTasks = tasks.filter((t: any) => {
            if (t.status === 'completed') return false
            if (!t.due_date) return false

            const dueDate = new Date(t.due_date)
            const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

            return daysUntilDue <= 7
        }).length

        const onTrackTasks = tasks.length - completedTasks - atRiskTasks

        // Predict event completion
        const remainingTasks = tasks.length - completedTasks
        const averageDaysPerTask = 7 // Simple estimate
        const predictedDaysToComplete = remainingTasks * averageDaysPerTask
        const predictedCompletion = new Date(now.getTime() + predictedDaysToComplete * 24 * 60 * 60 * 1000)

        return NextResponse.json({
            completionRate,
            onTrackTasks,
            atRiskTasks,
            completedTasks,
            totalTasks: tasks.length,
            bottlenecks,
            predictions: {
                eventCompletion: predictedCompletion.toISOString(),
                daysUntilEvent,
                confidence: Math.max(30, 100 - (atRiskTasks / tasks.length * 100))
            },
            analyzedAt: new Date().toISOString()
        })

    } catch (error) {
        console.error('Error in progress-insights API:', error)
        return NextResponse.json(
            { error: 'Failed to generate insights' },
            { status: 500 }
        )
    }
}
