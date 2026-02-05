import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai } from '@/lib/ai/openai-service'

export async function POST(request: NextRequest) {
    console.log('[recommend-email] API route called')
    try {
        console.log('[recommend-email] Parsing request body...')
        const { leadId } = await request.json()
        console.log('[recommend-email] Lead ID:', leadId)

        if (!leadId) {
            console.warn('[recommend-email] No lead ID provided')
            return NextResponse.json(
                { error: 'Lead ID is required' },
                { status: 400 }
            )
        }

        console.log('[recommend-email] Creating Supabase client...')
        const supabase = await createClient()
        console.log('[recommend-email] Supabase client created')

        // 1. Fetch lead data
        console.log('[recommend-email] Fetching lead data for ID:', leadId)
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single()

        console.log('[recommend-email] Lead query result:', { hasLead: !!lead, hasError: !!leadError })

        if (leadError || !lead) {
            console.error('[recommend-email] Lead not found:', leadError)
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

        // 3. Calculate contact frequency (last 7 days)
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const { data: recentActivities, error: activitiesError } = await supabase
            .from('lead_activities')
            .select('*')
            .eq('lead_id', leadId)
            .in('activity_type', ['email_sent', 'email_copied', 'call_made', 'meeting_held'])
            .gte('created_at', sevenDaysAgo.toISOString())

        const contactFrequency = recentActivities?.length || 0

        // 4. Calculate days since last contact
        const lastContactedAt = lead.last_contacted_at ? new Date(lead.last_contacted_at) : null
        const daysSinceLastContact = lastContactedAt
            ? Math.floor((Date.now() - lastContactedAt.getTime()) / (1000 * 60 * 60 * 24))
            : 999

        // 5. Calculate days since event
        const eventDate = event?.event_date ? new Date(event.event_date) : null
        const daysSinceEvent = eventDate
            ? Math.floor((Date.now() - eventDate.getTime()) / (1000 * 60 * 60 * 24))
            : 999

        // 6. Fetch all email templates
        console.log('[recommend-email] Fetching templates...')
        const { data: templates, error: templatesError } = await supabase
            .from('email_templates')
            .select('id, name, goal, tone')
            .order('name')

        console.log('[recommend-email] Templates query result:', {
            templatesCount: templates?.length,
            hasError: !!templatesError,
            errorMessage: templatesError?.message,
            errorDetails: templatesError
        })

        if (templatesError) {
            console.error('Error fetching templates:', templatesError)
            return NextResponse.json(
                { error: 'Failed to fetch templates', details: templatesError.message },
                { status: 500 }
            )
        }

        if (!templates || templates.length === 0) {
            console.warn('[recommend-email] No templates found in database')
            return NextResponse.json(
                { error: 'No email templates found. Please create at least one template first.' },
                { status: 404 }
            )
        }

        console.log('[recommend-email] Found templates:', templates.map(t => ({ id: t.id, name: t.name })))

        // 7. Build AI prompt
        const prompt = `You are an expert sales advisor. Analyze this lead and recommend whether to send an email.

Lead Context:
- Name: ${lead.first_name || ''} ${lead.last_name || ''}
- Company: ${lead.company || 'Unknown'}
- Title: ${lead.title || 'Unknown'}
- Status: ${lead.status || 'new'}
- Lead Score: ${lead.lead_score || 0}/100
- Last contacted: ${daysSinceLastContact === 999 ? 'Never' : `${daysSinceLastContact} days ago`}
- Event: ${event?.name || 'No event'} ${eventDate ? `(${daysSinceEvent} days ago)` : ''}
- Contact frequency: ${contactFrequency} contacts in last 7 days
- Notes: ${lead.notes || 'None'}

Available Templates:
${templates.map(t => `- ID: ${t.id}, Name: ${t.name}, Goal: ${t.goal}, Tone: ${t.tone}`).join('\n')}

Task:
1. Determine if we should send an email (yes/wait/no)
2. Recommend the TOP 3 most suitable templates from the list above
3. For each template, provide:
   - A score (0-100) based on how well it fits this lead
   - 2-3 specific reasons why this template is suitable
4. Rank templates by score (highest first)

Scoring Criteria:
- Lead engagement level (score, status, activity)
- Template goal alignment with lead stage
- Tone appropriateness for the relationship
- Timing considerations (last contact, event proximity)
- Contact frequency (avoid fatigue)

Constraints:
- Reasons must be specific and traceable to lead data
- Consider contact fatigue (>2 contacts in 7 days = risk)
- Consider timing (too soon after last contact = risk)
- Consider lead engagement (low score + no recent activity = wait)

Output ONLY valid JSON (no markdown, no code blocks):
{
  "shouldSend": "yes|wait|no",
  "recommendedTemplates": [
    {
      "templateId": "uuid from templates above",
      "templateName": "exact template name",
      "score": 95,
      "reasons": ["reason1", "reason2", "reason3"]
    },
    {
      "templateId": "uuid",
      "templateName": "name",
      "score": 85,
      "reasons": ["reason1", "reason2"]
    },
    {
      "templateId": "uuid",
      "templateName": "name",
      "score": 75,
      "reasons": ["reason1", "reason2"]
    }
  ],
  "primaryRecommendation": "uuid of top template",
  "riskFlags": ["optional warning if any"]
}`

        // 8. Call OpenAI
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert sales advisor. Always respond with valid JSON only, no markdown formatting.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            response_format: { type: 'json_object' }
        })

        const aiResponse = completion.choices[0]?.message?.content
        if (!aiResponse) {
            throw new Error('No response from AI')
        }

        const recommendation = JSON.parse(aiResponse)
        console.log('[recommend-email] AI recommendation:', recommendation)

        // 9. Process template recommendations
        // Support both old format (single template) and new format (multiple templates)
        let recommendedTemplates = recommendation.recommendedTemplates || []
        let primaryTemplateId = recommendation.primaryRecommendation || recommendation.recommendedTemplateId

        // If AI returned old format, convert to new format
        if (!recommendedTemplates.length && recommendation.recommendedTemplateId) {
            const template = templates.find(t => t.id === recommendation.recommendedTemplateId)
            if (template) {
                recommendedTemplates = [{
                    templateId: template.id,
                    templateName: template.name,
                    score: 90,
                    reasons: recommendation.reasons || []
                }]
                primaryTemplateId = template.id
            }
        }

        // Validate and enrich template recommendations
        recommendedTemplates = recommendedTemplates
            .map((rec: any) => {
                const template = templates.find(t => t.id === rec.templateId)
                return template ? {
                    ...rec,
                    templateName: template.name, // Ensure name is correct
                    goal: template.goal,
                    tone: template.tone
                } : null
            })
            .filter(Boolean)
            .slice(0, 3) // Ensure max 3 templates

        // If no valid templates, use fallback
        if (recommendedTemplates.length === 0 && templates.length > 0) {
            console.log('[recommend-email] No valid templates from AI, using fallback')
            const fallbackTemplate = templates[0]
            recommendedTemplates = [{
                templateId: fallbackTemplate.id,
                templateName: fallbackTemplate.name,
                score: 70,
                reasons: ['Default template selected'],
                goal: fallbackTemplate.goal,
                tone: fallbackTemplate.tone
            }]
            primaryTemplateId = fallbackTemplate.id
        }

        console.log('[recommend-email] Processed recommendations:', {
            count: recommendedTemplates.length,
            primary: primaryTemplateId,
            templates: recommendedTemplates.map((t: any) => ({ name: t.templateName, score: t.score }))
        })

        // 10. Log activity
        await supabase.from('lead_activities').insert({
            lead_id: leadId,
            activity_type: 'email_recommended',
            activity_data: {
                should_send: recommendation.shouldSend,
                recommended_template_id: primaryTemplateId,
                recommended_template_name: recommendedTemplates[0]?.templateName,
                recommended_templates: recommendedTemplates,
                reasons: recommendedTemplates[0]?.reasons || [],
                risk_flags: recommendation.riskFlags,
                lead_score: lead.lead_score,
                days_since_last_contact: daysSinceLastContact,
                days_since_event: daysSinceEvent,
                contact_frequency: contactFrequency
            }
        })
        console.log('[recommend-email] Skipping activity log (table may not exist)')

        // 11. Return recommendation
        return NextResponse.json({
            shouldSend: recommendation.shouldSend,
            // Backward compatibility: keep old fields
            recommendedTemplateId: primaryTemplateId,
            recommendedTemplateName: recommendedTemplates[0]?.templateName || 'Unknown Template',
            reasons: recommendedTemplates[0]?.reasons || [],
            // New fields: multiple template recommendations
            recommendedTemplates: recommendedTemplates,
            primaryRecommendation: primaryTemplateId,
            riskFlags: recommendation.riskFlags || [],
            metadata: {
                leadStatus: lead.status,
                leadScore: lead.lead_score,
                daysSinceLastContact,
                daysSinceEvent,
                contactFrequency
            }
        })

    } catch (error) {
        console.error('Error generating email recommendation:', error)
        return NextResponse.json(
            { error: 'Failed to generate recommendation', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}
