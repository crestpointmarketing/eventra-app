// API Route: AI Task Generation
// POST /api/ai/generate-tasks

import { NextRequest, NextResponse } from 'next/server'
import { generateTaskSuggestions } from '@/lib/ai/ai-task-service'

export async function POST(request: NextRequest) {
    try {
        const { eventId, userId } = await request.json()

        if (!eventId) {
            return NextResponse.json(
                { error: 'Event ID is required' },
                { status: 400 }
            )
        }

        // Generate task suggestions
        const result = await generateTaskSuggestions({
            eventId,
            userId,
        })

        if (result.error) {
            return NextResponse.json(
                { error: result.error },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            tasks: result.tasks,
            confidence: result.confidence,
            count: result.tasks.length,
        })
    } catch (error: any) {
        console.error('Error in AI task generation:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
