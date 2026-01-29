// API Route: AI Lead Scoring
// POST /api/ai/score-lead

import { NextRequest, NextResponse } from 'next/server'
import { generateChatCompletion, storeAIInsight } from '@/lib/ai/openai-service'
import { createClient } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
    try {
        const { leadId, userId } = await request.json()

        if (!leadId) {
            return NextResponse.json(
                { error: 'Lead ID is required' },
                { status: 400 }
            )
        }

        // Fetch lead data from database
        const supabase = createClient()
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single()

        if (leadError || !lead) {
            return NextResponse.json(
                { error: 'Lead not found' },
                { status: 404 }
            )
        }

        // Prepare prompt for AI scoring
        const prompt = `You are an expert sales analyst. Analyze the following lead data and provide a conversion likelihood score from 0-100 and a detailed explanation.

Lead Data:
- Name: ${lead.name || 'Unknown'}
- Company: ${lead.company || 'Unknown'}
- Email: ${lead.email || 'Not provided'}
- Status: ${lead.status || 'Unknown'}
- Source: ${lead.source || 'Unknown'}
- Created: ${lead.created_at || 'Unknown'}
- Notes: ${lead.notes || 'No notes'}

Provide your response in the following JSON format:
{
  "score": <number 0-100>,
  "confidence": <number 0-1>,
  "reasoning": "<brief explanation>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": [" <weakness 1>", "<weakness 2>"],
  "recommendations": ["<recommendation 1>", "<recommendation 2>"]
}`

        // Call OpenAI for lead scoring
        const { content, usage, error } = await generateChatCompletion({
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert sales analyst specializing in lead qualification and conversion prediction. Always respond with valid JSON.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            model: 'gpt-4o-mini',
            maxTokens: 1000,
            temperature: 0.3, // Lower temperature for more consistent scoring
            userId,
            feature: 'lead_scoring',
            requestData: { leadId },
        })

        if (error || !content) {
            return NextResponse.json(
                { error: error || 'Failed to generate lead score' },
                { status: 500 }
            )
        }

        // Parse AI response
        let aiResponse
        try {
            aiResponse = JSON.parse(content)
        } catch (parseError) {
            console.error('Failed to parse AI response:', content)
            return NextResponse.json(
                { error: 'Invalid AI response format' },
                { status: 500 }
            )
        }

        // Store insight in database (expires in 24 hours)
        await storeAIInsight({
            entityType: 'lead',
            entityId: leadId,
            insightType: 'score',
            content: aiResponse,
            confidence: aiResponse.confidence,
            metadata: {
                model: 'gpt-4o-mini',
                tokens_used: usage?.total_tokens || 0,
            },
            expiresInHours: 24,
        })

        return NextResponse.json({
            success: true,
            score: aiResponse.score,
            confidence: aiResponse.confidence,
            reasoning: aiResponse.reasoning,
            strengths: aiResponse.strengths,
            weaknesses: aiResponse.weaknesses,
            recommendations: aiResponse.recommendations,
            usage: {
                tokens: usage?.total_tokens || 0,
                promptTokens: usage?.prompt_tokens || 0,
                completionTokens: usage?.completion_tokens || 0,
            },
        })
    } catch (error: any) {
        console.error('Error in AI lead scoring:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}

// GET: Retrieve cached lead score
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const leadId = searchParams.get('leadId')

        if (!leadId) {
            return NextResponse.json(
                { error: 'Lead ID is required' },
                { status: 400 }
            )
        }

        const supabase = createClient()
        const { data, error } = await supabase
            .from('ai_insights')
            .select('*')
            .eq('entity_type', 'lead')
            .eq('entity_id', leadId)
            .eq('insight_type', 'score')
            .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (error && error.code !== 'PGRST116') {
            return NextResponse.json(
                { error: 'Failed to retrieve lead score' },
                { status: 500 }
            )
        }

        if (!data) {
            return NextResponse.json(
                { cached: false, message: 'No cached score found' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            cached: true,
            score: data.content.score,
            confidence: data.content.confidence || data.confidence,
            reasoning: data.content.reasoning,
            strengths: data.content.strengths,
            weaknesses: data.content.weaknesses,
            recommendations: data.content.recommendations,
            createdAt: data.created_at,
            expiresAt: data.expires_at,
        })
    } catch (error: any) {
        console.error('Error retrieving cached lead score:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
