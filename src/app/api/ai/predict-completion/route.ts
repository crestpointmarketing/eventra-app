import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { predictTaskCompletion } from '@/lib/ai/task-prediction-service'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Optional: Verify authentication (log warning but don't block)
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            console.warn('Prediction API called without authentication')
        }

        const { taskId, eventId } = await request.json()

        if (!taskId) {
            return NextResponse.json(
                { error: 'Task ID is required' },
                { status: 400 }
            )
        }

        // Fetch task details
        const { data: task, error: taskError } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', taskId)
            .single()

        if (taskError || !task) {
            return NextResponse.json(
                { error: 'Task not found' },
                { status: 404 }
            )
        }

        // Fetch event details if eventId provided
        let eventType: string | undefined
        let eventDate: string | undefined

        if (eventId || task.event_id) {
            const { data: event } = await supabase
                .from('events')
                .select('event_type, start_date')
                .eq('id', eventId || task.event_id)
                .single()

            if (event) {
                eventType = event.event_type
                eventDate = event.start_date
            }
        }

        // Generate prediction
        const prediction = await predictTaskCompletion(task, eventType, eventDate)

        // Calculate historical average (if applicable)
        // This would query completed tasks with similar titles
        // For now, we'll skip this to keep it simple

        return NextResponse.json({
            prediction,
            task: {
                id: task.id,
                title: task.title,
                status: task.status
            }
        })

    } catch (error) {
        console.error('Error in predict-completion API:', error)
        return NextResponse.json(
            { error: 'Failed to generate prediction' },
            { status: 500 }
        )
    }
}
