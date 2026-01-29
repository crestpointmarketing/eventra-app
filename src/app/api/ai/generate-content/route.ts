// API Route: AI Content Generation
// POST /api/ai/generate-content

import { NextRequest, NextResponse } from 'next/server'
import { generateChatCompletion } from '@/lib/ai/openai-service'

export async function POST(request: NextRequest) {
    try {
        const { type, context, userId } = await request.json()

        if (!type) {
            return NextResponse.json(
                { error: 'Content type is required' },
                { status: 400 }
            )
        }

        let prompt = ''
        let systemMessage = ''

        switch (type) {
            case 'email_followup':
                systemMessage = 'You are an expert sales copywriter specializing in professional follow-up emails.'
                prompt = `Write a professional follow-up email for a lead with the following details:

Lead Name: ${context.leadName || 'Prospect'}
Company: ${context.company || 'their company'}
Last Interaction: ${context.lastInteraction || 'initial contact'}
Context: ${context.notes || 'No additional context'}

The email should be:
- Professional yet warm
- Concise (3-4 short paragraphs)
- Include a clear call-to-action
- Personalized based on the context provided

Format: Plain text email (no HTML)`
                break

            case 'event_description':
                systemMessage = 'You are an expert event marketing copywriter.'
                prompt = `Create a compelling event description based on:

Event Name: ${context.eventName || 'Upcoming Event'}
Event Type: ${context.eventType || 'Business Event'}
Target Audience: ${context.targetAudience || 'Professionals'}
Key Points: ${context.keyPoints || 'Not specified'}
Tone: ${context.tone || 'Professional and engaging'}

The description should be:
- Engaging and exciting
- 2-3 paragraphs
- Highlight key benefits or takeaways
- Include a call-to-register or attend

Format: Plain text description`
                break

            case 'event_invitation':
                systemMessage = 'You are an expert email marketer specializing in event invitations.'
                prompt = `Write an engaging email invitation for an event:

Event Name: ${context.eventName || 'Upcoming Event'}
Date: ${context.eventDate || 'TBD'}
Location: ${context.location || 'TBD'}
Description: ${context.description || 'An exciting event'}
Target Audience: ${context.targetAudience || 'Our community'}

The invitation should be:
- Exciting and persuasive
- Include WHO, WHAT, WHEN, WHERE
- Strong call-to-action to register/RSVP
- Professional yet friendly tone

Format: Plain text email`
                break

            case 'task_description':
                systemMessage = 'You are an experienced project manager specializing in clear task documentation.'
                prompt = `Create a clear task description for:

Task Title: ${context.taskTitle || 'Task'}
Context: ${context.context || 'General task'}
Expected Outcome: ${context.outcome || 'Not specified'}

The description should:
- Be clear and actionable
- Include specific steps if applicable
- Mention expected deliverables
- Be concise (1-2 paragraphs)

Format: Plain text description`
                break

            default:
                return NextResponse.json(
                    { error: 'Invalid content type' },
                    { status: 400 }
                )
        }

        // Generate content using OpenAI
        const { content, usage, error } = await generateChatCompletion({
            messages: [
                { role: 'system', content: systemMessage },
                { role: 'user', content: prompt },
            ],
            model: 'gpt-4o-mini',
            maxTokens: 800,
            temperature: 0.7,
            userId,
            feature: 'content_generation',
            requestData: { type, context },
        })

        if (error || !content) {
            return NextResponse.json(
                { error: error || 'Failed to generate content' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            content: content.trim(),
            type,
            usage: {
                tokens: usage?.total_tokens || 0,
                promptTokens: usage?.prompt_tokens || 0,
                completionTokens: usage?.completion_tokens || 0,
            },
        })
    } catch (error: any) {
        console.error('Error in AI content generation:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
