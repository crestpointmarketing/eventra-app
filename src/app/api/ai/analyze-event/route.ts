import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeEventProfile } from '@/lib/ai/event-intelligence-service'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Optional: Verify authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            console.warn('Event analysis API called without authentication')
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
            .select('*')
            .eq('id', eventId)
            .single()

        if (eventError || !event) {
            return NextResponse.json(
                { error: 'Event not found' },
                { status: 404 }
            )
        }

        // Analyze event
        const profile = await analyzeEventProfile(event)

        return NextResponse.json({
            profile,
            eventId,
            eventName: event.name,
            analyzedAt: new Date().toISOString()
        })

    } catch (error) {
        console.error('Error in analyze-event API:', error)
        return NextResponse.json(
            { error: 'Failed to analyze event' },
            { status: 500 }
        )
    }
}
