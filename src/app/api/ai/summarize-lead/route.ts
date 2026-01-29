// API Route: AI Lead Summary
// POST /api/ai/summarize-lead

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

        // Fetch lead data
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

        // Prepare comprehensive prompt
        const prompt = `Analyze this lead and provide a concise executive summary:

Lead Information:
- Name: ${lead.name || 'Unknown'}
- Company: ${lead.company || 'Unknown'}
- Email: ${lead.email || 'Not provided'}
- Phone: ${lead.phone || 'Not provided'}
- Status: ${lead.status || 'Unknown'}
- Source: ${lead.source || 'Unknown'}
- Budget: ${lead.budget || 'Not specified'}
- Created: ${lead.created_at || 'Unknown'}
- Last Updated: ${lead.updated_at || 'Unknown'}
- Notes: ${lead.notes || 'No notes available'}

Provide a JSON response with:
{
  "summary": "<2-3 sentence executive summary>",
  "keyInsights": ["<insight 1>", "<insight 2>", "<insight 3>"],
  "nextSteps": ["<recommended action 1>", "<recommended action 2>"],
  "sentiment": "<positive|neutral|negative>",
  "urgency": "<high|medium|low>"
}`

        // Generate summary
        const { content, usage, error } = await generateChatCompletion({
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert sales analyst. Provide insights in valid JSON format only.',
                },
                { role: 'user', content: prompt },
            ],
            model: 'gpt-4o-mini',
            maxTokens: 600,
            temperature: 0.4,
            userId,
            feature: 'lead_summary',
            requestData: { leadId },
        })

        if (error || !content) {
            return NextResponse.json(
                { error: error || 'Failed to generate summary' },
                { status: 500 }
            )
        }

        // Parse response
        let summary
        try {
            summary = JSON.parse(content)
        } catch (parseError) {
            console.error('Failed to parse AI summary:', content)
            return NextResponse.json(
                { error: 'Invalid AI response format' },
                { status: 500 }
            )
        }

        // Store summary (expires in 7 days)
        await storeAIInsight({
            entityType: 'lead',
            entityId: leadId,
            insightType: 'summary',
            content: summary,
            metadata: {
                model: 'gpt-4o-mini',
                tokens_used: usage?.total_tokens || 0,
            },
            expiresInHours: 24 * 7, // 7 days
        })

        return NextResponse.json({
            success: true,
            ...summary,
            usage: {
                tokens: usage?.total_tokens || 0,
                promptTokens: usage?.prompt_tokens || 0,
                completionTokens: usage?.completion_tokens || 0,
            },
        })
    } catch (error: any) {
        console.error('Error in AI lead summary:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
