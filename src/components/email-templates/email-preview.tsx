'use client'

import { Mail } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { EmailTemplateWithDetails } from '@/types/email-templates'

// Sample data for preview
const SAMPLE_DATA: Record<string, string> = {
    lead_name: 'Sarah',
    'lead.first_name': 'Sarah',
    lead_full_name: 'Sarah Johnson',
    'lead.full_name': 'Sarah Johnson',
    company_name: 'Acme Corp',
    'company.name': 'Acme Corp',
    event_name: 'TechCrunch Disrupt 2024',
    'event.name': 'TechCrunch Disrupt 2024',
    event_date: 'March 15, 2024',
    'event.date': 'March 15, 2024',
    sender_name: 'Alex',
    'sender.name': 'Alex',
    sender_title: 'Sales Director',
    'sender.title': 'Sales Director',
    sender_company: 'Your Company',
    'sender.company': 'Your Company',
    conversation_topic: 'scaling your sales operations',
    'pain_point': 'manual lead qualification',
    lead_title: 'VP of Sales',
    'lead.title': 'VP of Sales',
    lead_industry: 'SaaS',
    'lead.industry': 'SaaS',
    product_name: 'Eventra',
    'product.name': 'Eventra',
}

interface EmailPreviewProps {
    template: EmailTemplateWithDetails
    className?: string
}

export function EmailPreview({ template, className }: EmailPreviewProps) {
    // Replace variables in text with sample data
    const replaceVariables = (text: string): string => {
        let result = text
        Object.entries(SAMPLE_DATA).forEach(([key, value]) => {
            // Escape dots for regex
            const escapedKey = key.replace(/\./g, '\\.')
            const regex = new RegExp(`\\{\\{${escapedKey}\\}\\}`, 'g')
            result = result.replace(regex, `<span class="variable-highlight">${value}</span>`)
        })
        return result
    }

    // Get a random subject line
    const sampleSubject = template.subjects.find((s) => s.is_active)?.subject || 'No subject'
    const processedSubject = replaceVariables(sampleSubject)

    // Assemble email body from blocks
    const emailBody = template.blocks
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((block) => replaceVariables(block.content))
        .join('\n\n')

    // Get CTA
    const ctaText = template.cta?.cta_text || ''
    const processedCta = replaceVariables(ctaText)

    return (
        <Card className={`p-6 bg-white dark:bg-zinc-900 ${className}`}>
            {/* Email Header */}
            <div className="space-y-3 mb-6 pb-4 border-b border-zinc-200 dark:border-zinc-700">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded">
                        <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">
                                {SAMPLE_DATA.sender_name} ({SAMPLE_DATA.sender_company})
                            </span>
                            <Badge variant="secondary" className="text-xs">
                                Preview
                            </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            To: {SAMPLE_DATA.lead_full_name} ({SAMPLE_DATA.company_name})
                        </div>
                    </div>
                </div>

                {/* Subject Line */}
                <div className="pl-11">
                    <div className="text-xs text-muted-foreground mb-1">Subject:</div>
                    <div
                        className="font-semibold text-base"
                        dangerouslySetInnerHTML={{ __html: processedSubject }}
                    />
                </div>
            </div>

            {/* Email Body */}
            <div className="space-y-4 email-preview-body">
                <style jsx>{`
                    .email-preview-body :global(.variable-highlight) {
                        background-color: rgba(168, 85, 247, 0.15);
                        color: rgb(147, 51, 234);
                        padding: 0 4px;
                        border-radius: 3px;
                        font-weight: 500;
                    }
                    .email-preview-body :global(.dark .variable-highlight) {
                        background-color: rgba(168, 85, 247, 0.2);
                        color: rgb(192, 132, 252);
                    }
                `}</style>

                {emailBody.split('\n\n').map((paragraph, index) => (
                    <p
                        key={index}
                        className="text-sm leading-relaxed whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: paragraph }}
                    />
                ))}

                {/* CTA */}
                {template.cta && (
                    <div className="pt-4">
                        {template.cta.cta_type === 'reply' ? (
                            <div
                                className="text-sm font-medium text-blue-600 dark:text-blue-400"
                                dangerouslySetInnerHTML={{ __html: processedCta }}
                            />
                        ) : (
                            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors">
                                <span dangerouslySetInnerHTML={{ __html: processedCta }} />
                            </button>
                        )}
                    </div>
                )}

                {/* Signature */}
                <div className="pt-4 mt-4 border-t border-zinc-200 dark:border-zinc-700 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">{SAMPLE_DATA.sender_name}</p>
                    <p>{SAMPLE_DATA.sender_title}</p>
                    <p>{SAMPLE_DATA.sender_company}</p>
                </div>
            </div>

            {/* Preview Note */}
            <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                <p className="text-xs text-muted-foreground">
                    💡 <span className="font-medium">Preview Note:</span> Highlighted text shows where variables will be replaced with actual lead data.
                </p>
            </div>
        </Card>
    )
}
