import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai } from '@/lib/ai/openai-service'

export async function POST(request: NextRequest) {
    try {
        const { leadId, templateId, emailBody, tone, count = 3 } = await request.json()

        if (!leadId || !templateId) {
            return NextResponse.json(
                { error: 'Missing required fields: leadId and templateId' },
                { status: 400 }
            )
        }

        // 1. Initialize Supabase client
        const supabase = await createClient()

        // 2. Fetch lead data
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

        // 3. Fetch template data
        const { data: template, error: templateError } = await supabase
            .from('email_templates')
            .select('*')
            .eq('id', templateId)
            .single()

        if (templateError || !template) {
            return NextResponse.json(
                { error: 'Template not found' },
                { status: 404 }
            )
        }

        // 4. Build AI prompt for subject line generation
        const prompt = `You are an expert email copywriter. Generate ${count} compelling email subject lines.

Context:
- Lead: ${lead.first_name} ${lead.last_name} from ${lead.company}
- Lead Title: ${lead.job_title || 'Unknown'}
- Template: ${template.name}
- Template Goal: ${template.goal}
- Tone: ${tone || template.tone}
${emailBody ? `- Email Body Preview: ${emailBody.substring(0, 200)}...` : ''}

Requirements:
1. Generate ${count} different subject line options
2. Each should be 30-60 characters (optimal for email clients)
3. Vary the approach:
   - Option 1: Direct and action-oriented
   - Option 2: Question-based or curiosity-driven
   - Option 3: Value-focused or benefit-driven
   ${count > 3 ? '- Option 4: Personalized or relationship-focused' : ''}
   ${count > 4 ? '- Option 5: Urgency or time-sensitive' : ''}
4. Match the specified tone: ${tone || template.tone}
5. Make them specific to the lead and context
6. Avoid spam trigger words (FREE, URGENT, ACT NOW, etc.)

Output ONLY valid JSON (no markdown, no code blocks):
{
  "subjectLines": [
    {
      "text": "subject line text",
      "tone": "professional|casual|friendly",
      "length": 45,
      "approach": "action-oriented|question|value|personalized|urgency"
    }
  ]
}`

        // 5. Call OpenAI
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert email copywriter specializing in compelling subject lines. Always respond with valid JSON only.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.8, // Higher temperature for more creative variety
            response_format: { type: 'json_object' }
        })

        const aiResponse = completion.choices[0]?.message?.content
        if (!aiResponse) {
            throw new Error('No response from AI')
        }

        const result = JSON.parse(aiResponse)

        // 6. Return subject lines
        return NextResponse.json({
            subjectLines: result.subjectLines || [],
            metadata: {
                tokensUsed: completion.usage?.total_tokens || 0,
                leadName: `${lead.first_name} ${lead.last_name}`,
                templateName: template.name
            }
        })

    } catch (error: any) {
        console.error('Error generating subject lines:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to generate subject lines' },
            { status: 500 }
        )
    }
}
