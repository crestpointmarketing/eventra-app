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

        // Prepare comprehensive prompt for full Lead Intelligence
        const prompt = `Analyze this lead and provide a comprehensive sales intelligence report.
Lead Information:
- Name: ${lead.name || 'Unknown'}
- Company: ${lead.company || 'Unknown'}
- Title: ${lead.job_title || 'Unknown'}
- Email: ${lead.email || 'Not provided'}
- Status: ${lead.status || 'Unknown'}
- Source: ${lead.source || 'Unknown'}
- Notes: ${lead.notes || 'No notes available'}

Provide a JSON response with this EXACT structure:
{
  "summary": "<2-3 sentence executive summary for a sales rep>",
  "key_talking_points": ["<bullet point 1>", "<bullet point 2>", "<bullet point 3>"],
  "key_signals": ["<signal 1 e.g. Rapid Growth>", "<signal 2 e.g. Technical Hiring>"],
  "product_fit": {
    "overallScore": <0-100>,
    "breakdown": [
      { 
        "product": "<Product A>", 
        "fit": "<High/Medium/Low>", 
        "score": <0-100>, 
        "reason": "<Specific reason for this fit level>",
        "signals": ["<Signal 1>", "<Signal 2>"]
      }
    ],
    "risks": ["<risk 1>", "<risk 2>"]
  },
  "recommendations": [
    {
      "id": "rec_1",
      "action": "<Short Action Title>",
      "reasoning": "<Why this action is recommended>",
      "impact": "<High/Medium/Low>",
      "timeframe": "<Immediate/This Week/Next Month>"
    }
  ]
}`

        // Generate summary
        const { content, usage, error } = await generateChatCompletion({
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert sales analyst. Provide deep insights in valid JSON format only.',
                },
                { role: 'user', content: prompt },
            ],
            model: 'gpt-4o-mini', // or gpt-4o if available for better reasoning
            maxTokens: 1500,
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
        let intelligence
        try {
            // Robust Parsing: Find the first '{' and the last '}'
            const start = content.indexOf('{');
            const end = content.lastIndexOf('}');

            if (start !== -1 && end !== -1) {
                const jsonStr = content.substring(start, end + 1);
                intelligence = JSON.parse(jsonStr);
            } else {
                throw new Error('No JSON object found in response');
            }
        } catch (parseError) {
            console.error('Failed to parse AI summary. Raw Content:', content)
            return NextResponse.json(
                { error: 'Invalid AI response format', details: content.substring(0, 100) + '...' },
                { status: 500 }
            )
        }

        // 1. Store insight in history (expires in 7 days)
        await storeAIInsight({
            entityType: 'lead',
            entityId: leadId,
            insightType: 'summary',
            content: intelligence,
            metadata: {
                model: 'gpt-4o-mini',
                tokens_used: usage?.total_tokens || 0,
            },
            expiresInHours: 24 * 7,
        })

        // 2. Persist to Leads Metadata for UI consumption
        // Merge with existing metadata to preserve other fields
        const currentMetadata = lead.metadata || {}
        const updatedMetadata = {
            ...currentMetadata,
            ai_intelligence: intelligence,
            last_ai_update: new Date().toISOString()
        }

        const { error: updateError } = await supabase
            .from('leads')
            .update({ metadata: updatedMetadata })
            .eq('id', leadId)

        if (updateError) {
            console.error('Failed to persist intelligence to lead:', updateError)
            return NextResponse.json(
                { error: 'Failed to save intelligence to database. Please check permissions.' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            ...intelligence,
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
