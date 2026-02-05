import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai } from '@/lib/ai/openai-service'

export async function POST(request: NextRequest) {
    console.log('[generate-draft] API route called')
    try {
        console.log('[generate-draft] Parsing request body...')
        const { leadId, templateId, tone, language, personalizationPoints } = await request.json()
        console.log('[generate-draft] Parameters:', { leadId, templateId, tone, language })

        if (!leadId || !templateId) {
            console.warn('[generate-draft] Missing required parameters')
            return NextResponse.json(
                { error: 'Lead ID and Template ID are required' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        // 1. Fetch lead data
        console.log('[generate-draft] Fetching lead data...')
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single()

        if (leadError || !lead) {
            console.error('[generate-draft] Lead not found:', leadError)
            return NextResponse.json(
                { error: 'Lead not found' },
                { status: 404 }
            )
        }

        // 2. Fetch event context (if available)
        const { data: event } = await supabase
            .from('events')
            .select('*')
            .eq('id', lead.event_id)
            .single()

        // 3. Fetch template with all components
        console.log('[generate-draft] Fetching template...')
        const { data: template, error: templateError } = await supabase
            .from('email_templates')
            .select(`
                *,
                subjects:email_template_subjects(*),
                blocks:email_template_blocks(*),
                ctas:email_template_ctas(*)
            `)
            .eq('id', templateId)
            .single()

        if (templateError || !template) {
            console.error('[generate-draft] Template not found:', templateError)
            return NextResponse.json(
                { error: 'Template not found' },
                { status: 404 }
            )
        }

        console.log('[generate-draft] Template loaded:', {
            name: template.name,
            blocksCount: template.blocks?.length || 0,
            subjectsCount: template.subjects?.length || 0,
            ctasCount: template.ctas?.length || 0
        })

        // 4. Extract variables from template
        const extractVariables = (text: string): string[] => {
            const regex = /\{\{([^}]+)\}\}/g
            const matches = []
            let match
            while ((match = regex.exec(text)) !== null) {
                matches.push(match[1].trim())
            }
            return [...new Set(matches)]
        }

        const allVariables = new Set<string>()
        template.blocks?.forEach((block: any) => {
            extractVariables(block.content).forEach(v => allVariables.add(v))
        })
        template.subjects?.forEach((subject: any) => {
            extractVariables(subject.text).forEach(v => allVariables.add(v))
        })

        console.log('[generate-draft] Variables found:', Array.from(allVariables))

        // 5. Build AI prompt for email generation
        const prompt = `You are an expert sales email writer. Generate a personalized email for this lead.

Lead Information:
- Name: ${lead.first_name || ''} ${lead.last_name || ''}
- Company: ${lead.company || 'Unknown'}
- Title: ${lead.title || 'Unknown'}
- Email: ${lead.email || ''}
- Status: ${lead.status || 'new'}
- Lead Score: ${lead.lead_score || 0}/100
- Event: ${event?.name || 'No event'}
- Notes: ${lead.notes || 'None'}

Template Information:
- Name: ${template.name}
- Goal: ${template.goal}
- Tone: ${tone || template.tone || 'professional'}
- Language: ${language || 'English'}

Email Structure:
${template.blocks?.map((block: any, idx: number) => `
Block ${idx + 1} (${block.type}):
${block.content}
`).join('\n')}

${template.ctas && template.ctas.length > 0 ? `
Call-to-Action Options:
${template.ctas.map((cta: any) => `- ${cta.text} (${cta.url || 'no URL'})`).join('\n')}
` : ''}

Variables to Fill:
${Array.from(allVariables).map(v => `- {{${v}}}: [Fill with appropriate value from lead data]`).join('\n')}

${personalizationPoints && personalizationPoints.length > 0 ? `
Personalization Points (incorporate these):
${personalizationPoints.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n')}
` : ''}

Instructions:
1. Generate a compelling subject line (choose from template subjects or create a new one)
2. Fill all variables with appropriate values from the lead data
3. Personalize the content based on lead information
4. Maintain the ${tone || template.tone} tone
5. Keep the email concise and action-oriented
6. Include a clear call-to-action
7. IMPORTANT: Use consistent paragraph spacing - separate ALL paragraphs with exactly TWO newlines (\\n\\n)
8. Format the email body as follows:
   - Greeting (e.g., "Hi {{first_name}},")
   - [blank line]
   - Opening paragraph
   - [blank line]
   - Main content paragraph(s)
   - [blank line]
   - Closing/CTA
   - [blank line]
   - Sign-off (e.g., "Best,\\nYour Name")

Output ONLY valid JSON (no markdown, no code blocks):
{
  "subject": "email subject line",
  "body": "complete email body with all variables filled and consistent \\n\\n spacing between paragraphs",
  "variables": {
    "variable_name": "filled_value"
  },
  "selectedCta": "CTA text if applicable"
}`

        // 6. Call OpenAI
        console.log('[generate-draft] Calling OpenAI...')
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert sales email writer. Always respond with valid JSON only, no markdown formatting.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.8, // Higher temperature for more creative content
            max_tokens: 1500,
            response_format: { type: 'json_object' }
        })

        const aiResponse = completion.choices[0]?.message?.content
        if (!aiResponse) {
            throw new Error('No response from AI')
        }

        const draft = JSON.parse(aiResponse)
        console.log('[generate-draft] Draft generated:', {
            subjectLength: draft.subject?.length,
            bodyLength: draft.body?.length,
            variablesCount: Object.keys(draft.variables || {}).length
        })

        // 7. Log activity
        console.log('[generate-draft] Logging activity...')
        await supabase.from('lead_activities').insert({
            lead_id: leadId,
            activity_type: 'email_drafted',
            activity_data: {
                template_id: templateId,
                template_name: template.name,
                tone: tone || template.tone,
                language: language || 'English',
                tokens_used: completion.usage?.total_tokens || 0,
                subject_length: draft.subject?.length || 0,
                body_length: draft.body?.length || 0,
            }
        })

        // 8. Return the generated draft
        return NextResponse.json({
            subject: draft.subject,
            body: draft.body,
            variables: draft.variables || {},
            selectedCta: draft.selectedCta,
            metadata: {
                templateName: template.name,
                templateGoal: template.goal,
                tone: tone || template.tone,
                language: language || 'English',
                leadName: `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
                leadCompany: lead.company,
                tokensUsed: completion.usage?.total_tokens || 0
            }
        })

    } catch (error) {
        console.error('Error generating email draft:', error)
        return NextResponse.json(
            { error: 'Failed to generate email draft', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}
