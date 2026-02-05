'use client'

import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

// Common email template variables
export const TEMPLATE_VARIABLES = [
    { value: 'lead_name', label: 'Lead Name', description: 'First name of the lead' },
    { value: 'lead_full_name', label: 'Lead Full Name', description: 'Full name of the lead' },
    { value: 'company_name', label: 'Company Name', description: "Lead's company" },
    { value: 'event_name', label: 'Event Name', description: 'Event where you met' },
    { value: 'event_date', label: 'Event Date', description: 'Date of the event' },
    { value: 'sender_name', label: 'Sender Name', description: 'Your name' },
    { value: 'sender_title', label: 'Sender Title', description: 'Your job title' },
    { value: 'sender_company', label: 'Sender Company', description: 'Your company name' },
    { value: 'conversation_topic', label: 'Conversation Topic', description: 'What you discussed' },
    { value: 'lead_title', label: 'Lead Title', description: "Lead's job title" },
    { value: 'lead_industry', label: 'Lead Industry', description: "Lead's industry" },
    { value: 'product_name', label: 'Product Name', description: 'Your product/service name' },
]

interface VariableSelectorProps {
    selectedVariables: string[]
    onChange: (variables: string[]) => void
    label?: string
    className?: string
}

export function VariableSelector({
    selectedVariables,
    onChange,
    label = 'Allowed Variables',
    className,
}: VariableSelectorProps) {
    const handleAdd = (value: string) => {
        if (!selectedVariables.includes(value)) {
            onChange([...selectedVariables, value])
        }
    }

    const handleRemove = (value: string) => {
        onChange(selectedVariables.filter((v) => v !== value))
    }

    const availableVariables = TEMPLATE_VARIABLES.filter(
        (v) => !selectedVariables.includes(v.value)
    )

    return (
        <div className={className}>
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium">{label}</label>
                    {availableVariables.length > 0 && (
                        <Select onValueChange={handleAdd} value="">
                            <SelectTrigger className="w-[200px] h-8 text-xs">
                                <SelectValue placeholder="Please Select" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableVariables.map((variable) => (
                                    <SelectItem key={variable.value} value={variable.value}>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{variable.label}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {variable.description}
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {selectedVariables.length > 0 ? (
                    <div className="flex flex-wrap gap-2 p-2 border border-zinc-200 dark:border-zinc-700 rounded-md min-h-[40px]">
                        {selectedVariables.map((variable) => {
                            const varInfo = TEMPLATE_VARIABLES.find((v) => v.value === variable)
                            return (
                                <Badge
                                    key={variable}
                                    variant="secondary"
                                    className="gap-1 pr-1"
                                >
                                    <code className="text-xs">{`{{${variable}}}`}</code>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-4 w-4 p-0 hover:bg-transparent"
                                        onClick={() => handleRemove(variable)}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </Badge>
                            )
                        })}
                    </div>
                ) : (
                    <div className="p-2 border border-dashed border-zinc-200 dark:border-zinc-700 rounded-md text-xs text-muted-foreground text-center">
                        No variables selected. Click "Add variable..." to add.
                    </div>
                )}
            </div>
        </div>
    )
}
