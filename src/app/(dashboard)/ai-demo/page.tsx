// AI Features Demo Page
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Brain, Sparkles, FileText, Mail } from 'lucide-react'
import { AIScoreBadge, AIInsightCard, AILoadingState } from '@/components/ai/ai-score-display'
import { AILeadSummary } from '@/components/ai/ai-lead-summary'
import { PageTransition } from '@/components/animations/page-transition'
import { useScoreLead, useSummarizeLead, useGenerateContent } from '@/hooks/useAI'
import { toast } from 'sonner'

export default function AIFeaturesPage() {
    const [selectedDemo, setSelectedDemo] = useState<'score' | 'summary' | 'content' | null>(null)
    const [generatedContent, setGeneratedContent] = useState('')

    // AI Hooks
    const scoreLead = useScoreLead()
    const summarizeLead = useSummarizeLead()
    const generateContent = useGenerateContent()

    // Demo: Score Lead (using a mock lead ID)
    const handleScoreDemo = async () => {
        setSelectedDemo('score')
        // In a real app, you'd pass actual lead ID
        // For demo, we'll just show the UI with mock data
        toast.info('In production, this would analyze a real lead from your database')
    }

    // Demo: Summarize Lead
    const handleSummaryDemo = async () => {
        setSelectedDemo('summary')
        toast.info('In production, this would generate a summary from real lead data')
    }

    // Demo: Generate Email
    const handleGenerateEmail = async () => {
        setSelectedDemo('content')

        const result = await generateContent.mutateAsync({
            type: 'email_followup',
            context: {
                leadName: 'John Doe',
                company: 'Acme Corp',
                lastInteraction: 'initial discovery call',
                notes: 'Interested in enterprise package, budget approved',
            },
        })

        if (result.content) {
            setGeneratedContent(result.content)
        }
    }

    // Mock data for demo
    const mockScoreData = {
        score: 85,
        confidence: 0.87,
        reasoning: 'This lead shows strong buying signals with approved budget, enterprise interest, and active engagement.',
        strengths: [
            'Budget already approved for enterprise package',
            'Active engagement with multiple touchpoints',
            'Company size matches ideal customer profile',
            'Decision maker directly involved in conversations',
        ],
        weaknesses: [
            'Long sales cycle typical for enterprise deals',
            'Multiple stakeholders need to be engaged',
        ],
        recommendations: [
            'Schedule executive demo within next 48 hours',
            'Prepare custom ROI calculator for their use case',
            'Introduce customer success manager early',
            'Share relevant case studies from similar industry',
        ],
    }

    const mockSummaryData = {
        summary: 'High-value enterprise prospect from Acme Corp with approved budget and strong buying intent. John Doe is the primary decision maker actively seeking an enterprise solution. Recent discovery call revealed immediate need and good product-market fit.',
        keyInsights: [
            'Budget of $150K+ approved for Q1 implementation',
            'Enterprise package features align with their requirements',
            'Competitor evaluation stage - need to differentiate quickly',
            'Timeline pressure: looking to implement within 60 days',
        ],
        nextSteps: [
            'Send custom demo link within 24 hours',
            'Schedule technical deep-dive with their IT team',
            'Prepare pricing proposal with ROI projection',
        ],
        sentiment: 'positive' as const,
        urgency: 'high' as const,
    }

    return (
        <PageTransition>
            <div className="container mx-auto p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-5xl font-medium text-zinc-900 dark:text-white flex items-center gap-3">
                            <Brain className="w-12 h-12 text-purple-600" />
                            AI Features Demo
                        </h1>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-2">
                            Explore AI-powered lead intelligence, content generation, and insights.
                        </p>
                    </div>
                </div>

                {/* Feature Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Lead Scoring */}
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col" onClick={handleScoreDemo}>
                        <CardHeader className="flex-grow">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                                    <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                </div>
                                <CardTitle className="text-zinc-900 dark:text-white">Lead Scoring</CardTitle>
                            </div>
                            <CardDescription className="text-zinc-600 dark:text-zinc-400">
                                AI analyzes lead data to predict conversion likelihood with detailed insights
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="mt-auto">
                            <Button className="w-full" onClick={handleScoreDemo}>
                                Try Lead Scoring
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Lead Summary */}
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col" onClick={handleSummaryDemo}>
                        <CardHeader className="flex-grow">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                    <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <CardTitle className="text-zinc-900 dark:text-white">Lead Summary</CardTitle>
                            </div>
                            <CardDescription className="text-zinc-600 dark:text-zinc-400">
                                Generate executive summaries with key insights and recommended actions
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="mt-auto">
                            <Button className="w-full" variant="outline" onClick={handleSummaryDemo}>
                                Generate Summary
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Content Generation */}
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col" onClick={handleGenerateEmail}>
                        <CardHeader className="flex-grow">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                                    <Mail className="w-6 h-6 text-green-600 dark:text-green-400" />
                                </div>
                                <CardTitle className="text-zinc-900 dark:text-white">Content Generation</CardTitle>
                            </div>
                            <CardDescription className="text-zinc-600 dark:text-zinc-400">
                                AI-powered email templates, event descriptions, and more
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="mt-auto">
                            <Button
                                className="w-full"
                                variant="outline"
                                onClick={handleGenerateEmail}
                                disabled={generateContent.isPending}
                            >
                                {generateContent.isPending ? 'Generating...' : 'Generate Email'}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Demo Results */}
                {selectedDemo === 'score' && (
                    <AIInsightCard {...mockScoreData} />
                )}

                {selectedDemo === 'summary' && (
                    <AILeadSummary {...mockSummaryData} />
                )}

                {selectedDemo === 'content' && generatedContent && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-green-600" />
                                Generated Email
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg font-mono text-sm whitespace-pre-wrap">
                                {generatedContent}
                            </div>
                            <div className="mt-4 flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        navigator.clipboard.writeText(generatedContent)
                                        toast.success('Copied to clipboard!')
                                    }}
                                >
                                    Copy to Clipboard
                                </Button>
                                <Button variant="ghost" onClick={() => setGeneratedContent('')}>
                                    Clear
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {generateContent.isPending && (
                    <AILoadingState message="AI is crafting your email..." />
                )}

                {/* Info Card */}
                <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
                    <CardHeader>
                        <CardTitle className="text-lg text-blue-900 dark:text-blue-100">How to Use AI Features</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                        <p>
                            <strong>✨ Lead Scoring:</strong> Click on any lead to see AI-powered conversion prediction
                        </p>
                        <p>
                            <strong>📝 Lead Summary:</strong> Generate executive summaries with sentiment analysis
                        </p>
                        <p>
                            <strong>✍️ Content Generation:</strong> Create personalized emails, event descriptions, and more
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-4">
                            💡 All AI insights are cached for 24 hours to optimize costs and performance
                        </p>
                    </CardContent>
                </Card>
            </div>
        </PageTransition>
    )
}
