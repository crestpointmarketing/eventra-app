// AI Task Prediction Service
// Provides intelligent task completion prediction, risk analysis, and bottleneck detection

import OpenAI from 'openai'
import { getCompanyContext, createAISystemPrompt } from './company-context'

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
})

// ============================================================================
// Types
// ============================================================================

export interface CompletionPrediction {
    estimatedDays: number
    confidence: number // 0-100
    reasoning: string
    factors: {
        complexity: 'low' | 'medium' | 'high'
        dependencies: number
        urgency: 'low' | 'medium' | 'high'
    }
}

export interface TaskRisk {
    taskId: string
    taskTitle: string
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
    risks: RiskFactor[]
    recommendations: string[]
}

export interface RiskFactor {
    type: 'timeline' | 'dependency' | 'resource' | 'complexity'
    severity: number // 0-100
    description: string
}

export interface Bottleneck {
    type: 'time' | 'dependency' | 'resource'
    affectedTasks: string[]
    impact: 'low' | 'medium' | 'high'
    description: string
    suggestion: string
}

export interface Task {
    id: string
    title: string
    description?: string
    status: string
    priority: string
    due_date?: string
    created_at: string
    dependencies?: string[]
}

// ============================================================================
// Event Type Baselines (in days)
// ============================================================================

const EVENT_TYPE_BASELINES: Record<string, Record<string, number>> = {
    conference: {
        venue: 60,
        marketing: 45,
        logistics: 30,
        registration: 35,
        speakers: 50,
        default: 30
    },
    workshop: {
        venue: 30,
        materials: 20,
        marketing: 25,
        registration: 20,
        default: 20
    },
    webinar: {
        platform: 10,
        marketing: 15,
        content: 14,
        rehearsal: 7,
        default: 10
    },
    trade_show: {
        booth: 90,
        marketing: 60,
        logistics: 45,
        staffing: 30,
        default: 45
    },
    networking: {
        venue: 20,
        invitations: 15,
        catering: 10,
        default: 15
    },
    default: {
        default: 21 // 3 weeks default
    }
}

// ============================================================================
// Prediction Functions
// ============================================================================

/**
 * Predict task completion time using AI analysis
 */
export async function predictTaskCompletion(
    task: Task,
    eventType?: string,
    eventDate?: string
): Promise<CompletionPrediction> {
    try {
        // Calculate urgency based on due date
        const urgency = calculateUrgency(task.due_date, eventDate)

        // Get baseline estimate for this type of task
        const baseline = getBaselineEstimate(task.title, eventType)

        // Use AI to analyze task complexity
        const aiAnalysis = await analyzeTaskComplexity(task)

        // Combine AI analysis with baseline
        const estimatedDays = Math.round(
            (aiAnalysis.estimatedDays * 0.6) + (baseline * 0.4)
        )

        return {
            estimatedDays,
            confidence: aiAnalysis.confidence,
            reasoning: aiAnalysis.reasoning,
            factors: {
                complexity: aiAnalysis.complexity,
                dependencies: task.dependencies?.length || 0,
                urgency
            }
        }
    } catch (error) {
        console.error('Error predicting task completion:', error)

        // Fallback to baseline if AI fails
        const baseline = getBaselineEstimate(task.title, eventType)
        return {
            estimatedDays: baseline,
            confidence: 50,
            reasoning: 'Using baseline estimate due to analysis error',
            factors: {
                complexity: 'medium',
                dependencies: task.dependencies?.length || 0,
                urgency: calculateUrgency(task.due_date, eventDate)
            }
        }
    }
}

/**
 * Analyze task complexity using AI
 */
async function analyzeTaskComplexity(task: Task): Promise<{
    estimatedDays: number
    confidence: number
    reasoning: string
    complexity: 'low' | 'medium' | 'high'
}> {
    // Get company intelligence context
    const companyContext = await getCompanyContext()

    const prompt = `Analyze this event planning task and estimate completion time:

Task: ${task.title}
Description: ${task.description || 'No description'}
Priority: ${task.priority}

Provide:
1. Estimated days to complete (realistic for event planning)
2. Complexity level (low/medium/high)
3. Confidence in estimate (0-100)
4. Brief reasoning

Format as JSON:
{
  "estimatedDays": number,
  "complexity": "low" | "medium" | "high",
  "confidence": number,
  "reasoning": "brief explanation"
}`

    // Create system prompt with company context
    const systemPrompt = createAISystemPrompt(
        companyContext,
        'You are an expert event planner estimating task completion times based on company goals and resources. Be realistic and account for typical delays and dependencies. Consider the company\'s stage and market when estimating.'
    )

    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'system',
                content: systemPrompt
            },
            {
                role: 'user',
                content: prompt
            }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
    })

    const analysis = JSON.parse(response.choices[0].message.content || '{}')

    return {
        estimatedDays: analysis.estimatedDays || 7,
        complexity: analysis.complexity || 'medium',
        confidence: analysis.confidence || 60,
        reasoning: analysis.reasoning || 'AI analysis completed'
    }
}

/**
 * Analyze risks for all tasks in an event
 */
export async function analyzeTaskRisks(
    tasks: Task[],
    eventDate?: string
): Promise<{
    risks: TaskRisk[]
    overallRiskScore: number
    criticalCount: number
}> {
    const risks: TaskRisk[] = []
    let totalRisk = 0

    for (const task of tasks) {
        const taskRisks: RiskFactor[] = []

        // Check timeline risk
        if (task.due_date && eventDate) {
            const daysUntilDue = calculateDaysUntil(task.due_date)
            const daysUntilEvent = calculateDaysUntil(eventDate)

            if (daysUntilDue < 0) {
                taskRisks.push({
                    type: 'timeline',
                    severity: 90,
                    description: `Task is ${Math.abs(daysUntilDue)} days overdue`
                })
            } else if (daysUntilDue < 7 && task.status !== 'completed') {
                taskRisks.push({
                    type: 'timeline',
                    severity: 70,
                    description: `Due in ${daysUntilDue} days`
                })
            }

            // Check if task is too close to event date
            if (daysUntilEvent < 7 && task.status === 'pending') {
                taskRisks.push({
                    type: 'timeline',
                    severity: 80,
                    description: `Event is in ${daysUntilEvent} days, task not started`
                })
            }
        }

        // Check dependency risk
        if (task.dependencies && task.dependencies.length > 3) {
            taskRisks.push({
                type: 'dependency',
                severity: 60,
                description: `Has ${task.dependencies.length} dependencies - high coordination needed`
            })
        }

        // Check complexity risk (high priority + no progress)
        if (task.priority === 'urgent' && task.status === 'pending') {
            taskRisks.push({
                type: 'complexity',
                severity: 75,
                description: 'Urgent task not yet started'
            })
        }

        // Calculate risk level
        const maxSeverity = taskRisks.length > 0
            ? Math.max(...taskRisks.map(r => r.severity))
            : 0

        const riskLevel: TaskRisk['riskLevel'] =
            maxSeverity >= 80 ? 'critical' :
                maxSeverity >= 60 ? 'high' :
                    maxSeverity >= 40 ? 'medium' : 'low'

        if (taskRisks.length > 0) {
            risks.push({
                taskId: task.id,
                taskTitle: task.title,
                riskLevel,
                risks: taskRisks,
                recommendations: generateRecommendations(taskRisks, task)
            })

            totalRisk += maxSeverity
        }
    }

    const criticalCount = risks.filter(r => r.riskLevel === 'critical').length
    const overallRiskScore = tasks.length > 0
        ? Math.round(totalRisk / tasks.length)
        : 0

    return {
        risks,
        overallRiskScore,
        criticalCount
    }
}

/**
 * Detect bottlenecks in task timeline
 */
export async function detectBottlenecks(tasks: Task[]): Promise<Bottleneck[]> {
    const bottlenecks: Bottleneck[] = []

    // Find tasks with many dependencies (resource bottlenecks)
    const dependencyCounts = new Map<string, number>()
    tasks.forEach(task => {
        task.dependencies?.forEach(depId => {
            dependencyCounts.set(depId, (dependencyCounts.get(depId) || 0) + 1)
        })
    })

    dependencyCounts.forEach((count, taskId) => {
        if (count >= 3) {
            const task = tasks.find(t => t.id === taskId)
            const affectedTasks = tasks
                .filter(t => t.dependencies?.includes(taskId))
                .map(t => t.id)

            if (task && task.status !== 'completed') {
                bottlenecks.push({
                    type: 'dependency',
                    affectedTasks,
                    impact: count >= 5 ? 'high' : 'medium',
                    description: `"${task.title}" blocks ${count} other tasks`,
                    suggestion: `Prioritize completing "${task.title}" to unblock ${count} dependent tasks`
                })
            }
        }
    })

    // Find time bottlenecks (many tasks due on same date)
    const tasksByDate = new Map<string, Task[]>()
    tasks.forEach(task => {
        if (task.due_date) {
            const dateKey = task.due_date.split('T')[0]
            const existing = tasksByDate.get(dateKey) || []
            tasksByDate.set(dateKey, [...existing, task])
        }
    })

    tasksByDate.forEach((dateTasks, date) => {
        if (dateTasks.length >= 4) {
            bottlenecks.push({
                type: 'time',
                affectedTasks: dateTasks.map(t => t.id),
                impact: dateTasks.length >= 6 ? 'high' : 'medium',
                description: `${dateTasks.length} tasks due on ${new Date(date).toLocaleDateString()}`,
                suggestion: 'Consider spreading these tasks across multiple days to avoid resource conflicts'
            })
        }
    })

    return bottlenecks
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateUrgency(dueDate?: string, eventDate?: string): 'low' | 'medium' | 'high' {
    if (!dueDate) return 'low'

    const daysUntilDue = calculateDaysUntil(dueDate)

    if (daysUntilDue < 0) return 'high' // Overdue
    if (daysUntilDue <= 7) return 'high'
    if (daysUntilDue <= 14) return 'medium'
    return 'low'
}

function calculateDaysUntil(dateString: string): number {
    const target = new Date(dateString)
    const now = new Date()
    const diffTime = target.getTime() - now.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

function getBaselineEstimate(taskTitle: string, eventType?: string): number {
    const titleLower = taskTitle.toLowerCase()
    const typeBaselines = EVENT_TYPE_BASELINES[eventType || 'default'] || EVENT_TYPE_BASELINES.default

    // Try to match task category from title
    for (const [category, days] of Object.entries(typeBaselines)) {
        if (titleLower.includes(category)) {
            return days
        }
    }

    return typeBaselines.default || 21
}

function generateRecommendations(risks: RiskFactor[], task: Task): string[] {
    const recommendations: string[] = []

    risks.forEach(risk => {
        switch (risk.type) {
            case 'timeline':
                if (risk.severity >= 80) {
                    recommendations.push('⚠️ Immediate action required - task is overdue or critically close to deadline')
                    recommendations.push('Consider reallocating resources or adjusting scope')
                } else {
                    recommendations.push('Start this task as soon as possible to avoid deadline issues')
                }
                break
            case 'dependency':
                recommendations.push('Review dependencies and ensure prerequisite tasks are on track')
                recommendations.push('Consider parallel workstreams where possible')
                break
            case 'complexity':
                recommendations.push('Break down into smaller sub-tasks for better tracking')
                recommendations.push('Assign additional resources if available')
                break
        }
    })

    return recommendations.length > 0 ? recommendations : ['Monitor progress regularly']
}
