// API Route: AI Task Dependency Analysis
// POST /api/ai/analyze-dependencies

import { NextRequest, NextResponse } from 'next/server'
import { analyzeTaskDependencies } from '@/lib/ai/ai-task-service'

export async function POST(request: NextRequest) {
    try {
        const { eventId, taskIds, userId } = await request.json()

        if (!eventId) {
            return NextResponse.json(
                { error: 'Event ID is required' },
                { status: 400 }
            )
        }

        // Analyze task dependencies
        const result = await analyzeTaskDependencies({
            eventId,
            taskIds,
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
            dependencies: result.dependencies,
            count: result.dependencies.length,
        })
    } catch (error: any) {
        console.error('Error in dependency analysis:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
