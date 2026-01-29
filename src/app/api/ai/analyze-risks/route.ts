import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeTaskRisks } from '@/lib/ai/task-prediction-service'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Optional: Verify authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            console.warn('Risk analysis API called without authentication')
        }

        const { eventId } = await request.json()

        if (!eventId) {
            return NextResponse.json(
                { error: 'Event ID is required' },
                { status: 400 }
            )
        }

        // Fetch event details
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('start_date')
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
            .order('due_date', { ascending: true })

        if (tasksError) {
            return NextResponse.json(
                { error: 'Failed to fetch tasks' },
                { status: 500 }
            )
        }

        // Analyze risks
        const analysis = await analyzeTaskRisks(tasks || [], event.start_date)

        return NextResponse.json({
            ...analysis,
            eventId,
            totalTasks: tasks?.length || 0,
            analyzedAt: new Date().toISOString()
        })

    } catch (error) {
        console.error('Error in analyze-risks API:', error)
        return NextResponse.json(
            { error: 'Failed to analyze risks' },
            { status: 500 }
        )
    }
}
