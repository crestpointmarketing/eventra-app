// AI Task Automation Service
// Provides intelligent task generation, dependency analysis, and priority scoring

import { generateChatCompletion } from './openai-service'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// ============================================
// Types
// ============================================

export interface SuggestedTask {
    title: string
    description: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    estimated_days_before_event: number // e.g., -30 means 30 days before event
    category?: string
    estimated_cost?: number
}

export interface TaskDependency {
    taskId: string
    dependsOn: string[]
    reasoning: string
}

export interface PriorityScore {
    score: number // 0-100
    priority: 'low' | 'medium' | 'high' | 'urgent'
    reasoning: string
    factors: {
        timelineCriticality: number
        budgetImpact: number
        dependencyWeight: number
    }
}

// ============================================
// Event Type Task Templates
// ============================================

const EVENT_TYPE_CONTEXTS = {
    conference: {
        description: 'Large professional conference with keynotes, breakout sessions, and networking',
        typical_tasks: [
            'Venue booking and contract negotiation',
            'Speaker recruitment and coordination',
            'Registration system setup',
            'Marketing campaign launch',
            'Sponsor outreach and packages',
            'Audio/visual equipment rental',
            'Catering and menu planning',
            'Signage and branding materials',
        ],
    },
    tradeshow: {
        description: 'Exhibition with vendor booths, product demonstrations, and industry networking',
        typical_tasks: [
            'Booth space reservation and layout design',
            'Exhibitor recruitment and sales',
            'Floor plan and logistics coordination',
            'Lead capture system setup',
            'Promotional materials production',
            'Shipping and logistics coordination',
            'On-site staff scheduling',
            'Post-event lead follow-up system',
        ],
    },
    webinar: {
        description: 'Online virtual event with presentations and Q&A',
        typical_tasks: [
            'Platform selection and setup',
            'Registration landing page creation',
            'Presenter briefing and tech rehearsal',
            'Email marketing campaign',
            'Slide deck preparation and review',
            'Recording and editing setup',
            'Post-event survey distribution',
            'Recording distribution and follow-up',
        ],
    },
    workshop: {
        description: 'Hands-on training session with interactive activities',
        typical_tasks: [
            'Curriculum and materials development',
            'Venue setup with tables and equipment',
            'Materials printing and distribution',
            'Instructor coordination',
            'Registration and attendee management',
            'Hands-on activity preparation',
            'Feedback collection system',
            'Certificate of completion design',
        ],
    },
    networking: {
        description: 'Social event focused on relationship building and connections',
        typical_tasks: [
            'Venue selection with appropriate atmosphere',
            'Food and beverage planning',
            'Icebreaker activities planning',
            'Name badge and check-in system',
            'Music and entertainment booking',
            'Photo booth or activities setup',
            'Follow-up connection facilitation',
            'Post-event photo sharing',
        ],
    },
    gala: {
        description: 'Formal evening event with dinner, entertainment, and fundraising',
        typical_tasks: [
            'Luxury venue selection and booking',
            'Entertainment and performers booking',
            'Formal invitation design and distribution',
            'Gourmet catering and bar service',
            'Auction or fundraising component setup',
            'Decor and ambiance planning',
            'VIP guest coordination',
            'Photography and videography',
        ],
    },
    product_launch: {
        description: 'Event to unveil and promote a new product or service',
        typical_tasks: [
            'Product demo preparation and rehearsal',
            'Media and influencer outreach',
            'Press release and PR materials',
            'Launch venue and staging setup',
            'Product samples and promotional items',
            'Social media campaign coordination',
            'Live stream and recording setup',
            'Post-launch analytics tracking',
        ],
    },
    seminar: {
        description: 'Educational session with expert presentations and discussions',
        typical_tasks: [
            'Expert speaker recruitment',
            'Educational content development',
            'Venue with appropriate seating',
            'Registration and confirmation system',
            'Handout materials preparation',
            'Q&A session planning',
            'Certificate of attendance design',
            'Follow-up resources distribution',
        ],
    },
    fundraiser: {
        description: 'Charitable event to raise funds for a cause or organization',
        typical_tasks: [
            'Fundraising goal and strategy planning',
            'Donor outreach and invitation',
            'Silent auction or raffle organization',
            'Payment and donation processing setup',
            'Sponsorship package creation',
            'Volunteer recruitment and training',
            'Impact presentation preparation',
            'Thank-you communication plan',
        ],
    },
    retreat: {
        description: 'Multi-day off-site event for team building or strategic planning',
        typical_tasks: [
            'Retreat location and accommodation booking',
            'Agenda and activity planning',
            'Team-building exercises preparation',
            'Transportation and logistics coordination',
            'Meal planning for multiple days',
            'Breakout session facilitation setup',
            'Materials and supplies procurement',
            'Post-retreat survey and follow-up',
        ],
    },
}

// ============================================
// Task Generation
// ============================================

/**
 * Generate intelligent task suggestions for an event
 */
export async function generateTaskSuggestions(params: {
    eventId: string
    eventType?: string
    eventDate?: string
    eventName?: string
    targetLeads?: number
    budget?: number
    userId?: string
}): Promise<{ tasks: SuggestedTask[]; confidence: number; error?: string }> {
    try {
        // Fetch event details if not provided
        let eventData = params
        if (!params.eventType || !params.eventDate) {
            const { data: event, error } = await supabase
                .from('events')
                .select('*')
                .eq('id', params.eventId)
                .single()

            if (error || !event) {
                return {
                    tasks: [],
                    confidence: 0,
                    error: 'Event not found or missing required data',
                }
            }

            eventData = {
                ...params,
                eventType: event.event_type || 'conference',
                eventDate: event.start_date,
                eventName: event.name,
                targetLeads: event.target_leads,
                budget: event.total_budget,
            }
        }

        // ===== NEW: Fetch existing tasks to avoid duplicates =====
        const { data: existingTasks, error: tasksError } = await supabase
            .from('tasks')
            .select('title, description')
            .eq('event_id', params.eventId)

        const existingTaskTitles = existingTasks?.map(t => t.title.toLowerCase()) || []

        const existingTasksContext = existingTasks && existingTasks.length > 0
            ? `\n\nIMPORTANT: The following tasks already exist for this event. DO NOT generate tasks with similar titles or duplicate functionality:\n${existingTasks.map((t, i) => `${i + 1}. ${t.title}`).join('\n')}\n\nGenerate ONLY NEW tasks that are not covered by the existing ones above.`
            : ''

        const eventType = eventData.eventType?.toLowerCase() || 'conference'
        const context = EVENT_TYPE_CONTEXTS[eventType as keyof typeof EVENT_TYPE_CONTEXTS] || EVENT_TYPE_CONTEXTS.conference

        // Build AI prompt
        const systemMessage = `You are an expert event planning assistant specializing in creating comprehensive task checklists for events. 
You understand event management best practices, timelines, and dependencies.`

        const userPrompt = `Generate a comprehensive task checklist for the following event:

Event Name: ${eventData.eventName || 'Upcoming Event'}
Event Type: ${eventType}
Event Date: ${eventData.eventDate || 'TBD'}
Target Attendees/Leads: ${eventData.targetLeads || 'Not specified'}
Budget: ${eventData.budget ? `$${eventData.budget}` : 'Not specified'}

Context: ${context.description}
Typical tasks for this event type: ${context.typical_tasks.join(', ')}${existingTasksContext}

Please generate 10-15 specific, actionable tasks needed to successfully execute this event. For each task, provide:
1. A clear, specific title (max 60 characters)
2. A detailed description of what needs to be done (2-3 sentences)
3. Priority level (urgent, high, medium, or low)
4. Number of days before the event it should be completed (e.g., -30 for 30 days before)
5. Optional: estimated cost if applicable

Format your response as a JSON array with this structure:
[
  {
    "title": "Task title",
    "description": "Detailed description",
    "priority": "high",
    "estimated_days_before_event": -30,
    "category": "Venue" or "Marketing" or "Logistics" etc,
    "estimated_cost": 1000 (optional)
  }
]

Focus on creating a realistic, actionable timeline. Ensure tasks are in logical order based on dependencies.`

        // Generate tasks using OpenAI
        const { content, usage, error } = await generateChatCompletion({
            messages: [
                { role: 'system', content: systemMessage },
                { role: 'user', content: userPrompt },
            ],
            model: 'gpt-4o-mini',
            maxTokens: 1500,
            temperature: 0.7,
            userId: params.userId,
            feature: 'task_suggestions',
            requestData: { eventId: params.eventId, eventType },
        })

        if (error || !content) {
            return {
                tasks: [],
                confidence: 0,
                error: error || 'Failed to generate tasks',
            }
        }

        // Parse JSON response
        try {
            // Extract JSON from potential markdown code blocks
            let jsonContent = content.trim()
            if (jsonContent.startsWith('```')) {
                jsonContent = jsonContent.replace(/```json?\n?/g, '').replace(/```\n?$/g, '')
            }

            const tasks: SuggestedTask[] = JSON.parse(jsonContent)

            // Validate and normalize tasks
            const validatedTasks = tasks.map((task) => ({
                title: task.title.slice(0, 100), // Ensure reasonable length
                description: task.description || 'No description provided',
                priority: ['urgent', 'high', 'medium', 'low'].includes(task.priority)
                    ? task.priority
                    : 'medium',
                estimated_days_before_event: task.estimated_days_before_event || -7,
                category: task.category,
                estimated_cost: task.estimated_cost,
            })) as SuggestedTask[]

            // ===== NEW: Filter out duplicates as a safety measure =====
            const uniqueTasks = validatedTasks.filter(task => {
                const titleLower = task.title.toLowerCase()
                // Check for exact or very similar matches (>70% similarity)
                return !existingTaskTitles.some(existingTitle => {
                    if (titleLower === existingTitle) return true
                    // Simple similarity check: check if one contains most words of the other
                    const taskWords = titleLower.split(/\s+/).filter((w: string) => w.length > 3)
                    const existingWords = existingTitle.split(/\s+/).filter((w: string) => w.length > 3)
                    if (taskWords.length === 0 || existingWords.length === 0) return false

                    const matchingWords = taskWords.filter((w: string) => existingWords.includes(w)).length
                    const similarity = matchingWords / Math.min(taskWords.length, existingWords.length)
                    return similarity > 0.7 // 70% word overlap = duplicate
                })
            })

            return {
                tasks: uniqueTasks,
                confidence: 0.85, // High confidence for structured output
            }
        } catch (parseError) {
            console.error('Failed to parse AI task response:', parseError)
            return {
                tasks: [],
                confidence: 0,
                error: 'Failed to parse AI response',
            }
        }
    } catch (error: any) {
        console.error('Error in generateTaskSuggestions:', error)
        return {
            tasks: [],
            confidence: 0,
            error: error.message || 'Unknown error',
        }
    }
}


/**
 * Analyze dependencies between tasks
 */
export async function analyzeTaskDependencies(params: {
    eventId: string
    taskIds?: string[]
    userId?: string
}): Promise<{ dependencies: TaskDependency[]; error?: string }> {
    try {
        // Fetch tasks for the event
        let query = supabase
            .from('tasks')
            .select('id, title, description, due_date, priority, status')
            .eq('event_id', params.eventId)

        if (params.taskIds && params.taskIds.length > 0) {
            query = query.in('id', params.taskIds)
        }

        const { data: tasks, error } = await query

        if (error || !tasks || tasks.length === 0) {
            return { dependencies: [], error: 'No tasks found' }
        }

        // Build AI prompt
        const systemMessage = `You are an expert project manager specializing in task dependency analysis.
You identify prerequisite relationships between tasks and suggest optimal execution order.`

        const taskList = tasks
            .map((task, idx) => `${idx + 1}. [${task.id}] ${task.title}: ${task.description || 'No description'}`)
            .join('\n')

        const userPrompt = `Analyze the following tasks and identify dependencies (which tasks must be completed before others can start):

${taskList}

For each task that has dependencies, specify which other tasks must be completed first and explain why.

Format your response as a JSON array:
[
  {
    "taskId": "task-uuid-here",
    "dependsOn": ["prerequisite-task-uuid-1", "prerequisite-task-uuid-2"],
    "reasoning": "Brief explanation of why this dependency exists"
  }
]

Only include tasks that have actual dependencies. If a task has no prerequisites, don't include it in the response.`

        const { content, error: aiError } = await generateChatCompletion({
            messages: [
                { role: 'system', content: systemMessage },
                { role: 'user', content: userPrompt },
            ],
            model: 'gpt-4o-mini',
            maxTokens: 1000,
            temperature: 0.5,
            userId: params.userId,
            feature: 'task_suggestions',
            requestData: { eventId: params.eventId },
        })

        if (aiError || !content) {
            return { dependencies: [], error: aiError || 'Failed to analyze dependencies' }
        }

        // Parse response
        try {
            let jsonContent = content.trim()
            if (jsonContent.startsWith('```')) {
                jsonContent = jsonContent.replace(/```json?\n?/g, '').replace(/```\n?$/g, '')
            }

            const dependencies: TaskDependency[] = JSON.parse(jsonContent)
            return { dependencies }
        } catch (parseError) {
            console.error('Failed to parse dependency analysis:', parseError)
            return { dependencies: [], error: 'Failed to parse AI response' }
        }
    } catch (error: any) {
        console.error('Error in analyzeTaskDependencies:', error)
        return { dependencies: [], error: error.message || 'Unknown error' }
    }
}

/**
 * Calculate AI-driven priority score for a task
 */
export async function scoreTaskPriority(params: {
    taskId: string
    eventContext?: {
        eventDate?: string
        budget?: number
        currentDate?: string
    }
    userId?: string
}): Promise<PriorityScore | null> {
    try {
        // Fetch task details
        const { data: task, error } = await supabase
            .from('tasks')
            .select('*, events(*)')
            .eq('id', params.taskId)
            .single()

        if (error || !task) {
            return null
        }

        const eventDate = params.eventContext?.eventDate || task.events?.start_date
        const currentDate = params.eventContext?.currentDate || new Date().toISOString()
        const daysUntilEvent = eventDate
            ? Math.ceil((new Date(eventDate).getTime() - new Date(currentDate).getTime()) / (1000 * 60 * 60 * 24))
            : null

        // Simple rule-based scoring for now (can be enhanced with AI later)
        let score = 50 // Base score

        // Time criticality
        if (task.due_date) {
            const daysUntilDue = Math.ceil(
                (new Date(task.due_date).getTime() - new Date(currentDate).getTime()) / (1000 * 60 * 60 * 24)
            )
            if (daysUntilDue < 0) score += 30 // Overdue
            else if (daysUntilDue <= 3) score += 25
            else if (daysUntilDue <= 7) score += 15
            else if (daysUntilDue <= 14) score += 5
        }

        // Budget impact
        if (task.estimated_cost && task.estimated_cost > 1000) {
            score += 10
        }

        // Current priority
        const priorityBonus = { urgent: 20, high: 10, medium: 0, low: -10 }
        score += priorityBonus[task.priority as keyof typeof priorityBonus] || 0

        // Normalize to 0-100
        score = Math.max(0, Math.min(100, score))

        // Determine priority level
        let priority: PriorityScore['priority']
        if (score >= 80) priority = 'urgent'
        else if (score >= 60) priority = 'high'
        else if (score >= 40) priority = 'medium'
        else priority = 'low'

        return {
            score,
            priority,
            reasoning: `Task scored ${score}/100 based on timeline, budget impact, and current priority`,
            factors: {
                timelineCriticality: daysUntilEvent ? 100 - Math.min(100, daysUntilEvent) : 50,
                budgetImpact: task.estimated_cost ? Math.min(100, (task.estimated_cost / 10000) * 100) : 0,
                dependencyWeight: 50, // Placeholder
            },
        }
    } catch (error) {
        console.error('Error in scoreTaskPriority:', error)
        return null
    }
}
