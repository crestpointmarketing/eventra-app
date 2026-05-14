import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai } from '@/lib/ai/openai-service'

export async function POST(request: NextRequest) {
    try {
        const { leadId } = await request.json()

        if (!leadId) {
            return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 })
        }

        const supabase = await createClient()

        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single()

        if (leadError || !lead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
        }

        const { data: event } = await supabase
            .from('events')
            .select('*')
            .eq('id', lead.event_id)
            .single()

        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const { data: recentActivities } = await supabase
            .from('lead_activities')
            .select('*')
            .eq('lead_id', leadId)
            .in('activity_type', ['email_sent', 'email_copied', 'call_made', 'meeting_held'])
            .gte('created_at', sevenDaysAgo.toISOString())

        const contactFrequency = recentActivities?.length || 0

        const lastContactedAt = lead.last_contacted_at ? new Date(lead.last_contacted_at) : null
        const daysSinceLastContact = lastContactedAt
            ? Math.floor((Date.now() - lastContactedAt.getTime()) / (1000 * 60 * 60 * 24))
            : 999

        const eventDate = event?.event_date ? new Date(event.event_date) : null
        const daysSinceEvent = eventDate
            ? Math.floor((Date.now() - eventDate.getTime()) / (1000 * 60 * 60 * 24))
            : 999

        const { data: templates, error: templatesError } = await supabase
            .from('email_templates')
            .select('id, name, goal, tone')
            .order('name')

        if (templatesError) {
            return NextResponse.json(
                { error: 'Failed to fetch templates', details: templatesError.message },
                { status: 500 }
            )
        }

        if (!templates || templates.length === 0) {
            return NextResponse.json(
                { error: 'No email templates found. Please create at least one template first.' },
                { status: 404 }
            )
        }

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
    }
  ],
  "primaryRecommendation": "uuid of top template",
  "riskFlags": ["optional warning if any"]
}`

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert sales advisor. Always respond with valid JSON only, no markdown formatting.'
                },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            response_format: { type: 'json_object' }
        })

        const aiResponse = completion.choices[0]?.message?.content
        if (!aiResponse) throw new Error('No response from AI')

        const recommendation = JSON.parse(aiResponse)

        let recommendedTemplates = recommendation.recommendedTemplates || []
        let primaryTemplateId = recommendation.primaryRecommendation || recommendation.recommendedTemplateId

        // Support legacy single-template format from older AI responses
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

        recommendedTemplates = recommendedTemplates
            .map((rec: any) => {
                const template = templates.find(t => t.id === rec.templateId)
                return template ? {
                    ...rec,
                    templateName: template.name,
                    goal: template.goal,
                    tone: template.tone
                } : null
            })
            .filter(Boolean)
            .slice(0, 3)

        if (recommendedTemplates.length === 0 && templates.length > 0) {
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

        return NextResponse.json({
            shouldSend: recommendation.shouldSend,
            recommendedTemplateId: primaryTemplateId,
            recommendedTemplateName: recommendedTemplates[0]?.templateName || 'Unknown Template',
            reasons: recommendedTemplates[0]?.reasons || [],
            recommendedTemplates,
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
