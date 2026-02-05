'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useCreateLead } from '@/hooks/useLeads'
import { useSummarizeLead } from '@/hooks/useAI'
import { Loader2, Upload, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'

interface ImportLeadsDialogProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function ImportLeadsDialog({ open, onOpenChange }: ImportLeadsDialogProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successCount, setSuccessCount] = useState(0)
    const [autoGenerateAI, setAutoGenerateAI] = useState(true)
    const [importedLeadIds, setImportedLeadIds] = useState<string[]>([])

    const { mutateAsync: createLead } = useCreateLead()
    const { mutateAsync: summarizeLead } = useSummarizeLead()

    const handleOpenChange = (newOpen: boolean) => {
        setIsOpen(newOpen)
        onOpenChange?.(newOpen)
        if (!newOpen) {
            resetState()
        }
    }

    const resetState = () => {
        setFile(null)
        setError(null)
        setSuccessCount(0)
        setIsLoading(false)
        setImportedLeadIds([])
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            setError(null)
        }
    }

    const parseCSV = (text: string) => {
        const lines = text.split('\n')
        if (lines.length < 2) return [] // Header + at least 1 row

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
        const results: any[] = []

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue

            // Simple split handling quotes roughly - for robust parsing consider a library like papaparse
            // This is a naive implementation assuming simple CSVs
            const currentLine = lines[i]
            // logical split on comma unless inside quotes
            const values: string[] = []
            let inQuote = false
            let val = ''

            for (let char of currentLine) {
                if (char === '"') {
                    inQuote = !inQuote
                } else if (char === ',' && !inQuote) {
                    values.push(val.trim().replace(/^"|"$/g, ''))
                    val = ''
                } else {
                    val += char
                }
            }
            values.push(val.trim().replace(/^"|"$/g, '')) // last value

            if (values.length === headers.length || values.length > 0) {
                const entry: any = {}
                headers.forEach((header, index) => {
                    entry[header] = values[index] || ''
                })
                results.push(entry)
            }
        }
        return results
    }

    const handleUpload = async () => {
        if (!file) return

        setIsLoading(true)
        setError(null)
        setSuccessCount(0)

        const reader = new FileReader()
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string
                const records = parseCSV(text)

                if (records.length === 0) {
                    setError('No valid records found in CSV.')
                    setIsLoading(false)
                    return
                }

                let count = 0
                const createdLeadIds: string[] = []
                for (const record of records) {
                    // Basic mapping - assumes CSV headers match DTO or similar
                    // Expected headers: first_name, last_name, email, company, title, phone
                    if (!record.first_name || !record.email) {
                        console.warn('Skipping record without name/email', record)
                        continue
                    }

                    const newLead = await createLead({
                        first_name: record.first_name,
                        last_name: record.last_name || '',
                        email: record.email,
                        company: record.company,
                        job_title: record.job_title || record.title,
                        phone: record.phone,
                        status: 'New'
                    })
                    count++
                    if (newLead?.id) {
                        createdLeadIds.push(newLead.id)
                    }
                }

                setSuccessCount(count)
                setImportedLeadIds(createdLeadIds)

                // Auto-generate AI if enabled
                if (autoGenerateAI && createdLeadIds.length > 0) {
                    const toastId = toast.loading(`Generating AI intelligence for ${createdLeadIds.length} leads...`)
                    let aiSuccessCount = 0

                    for (const leadId of createdLeadIds) {
                        try {
                            await summarizeLead({ leadId })
                            aiSuccessCount++
                        } catch (err) {
                            console.error(`AI generation failed for lead ${leadId}`, err)
                        }
                        // Small delay to avoid rate limits
                        await new Promise(resolve => setTimeout(resolve, 500))
                    }

                    toast.dismiss(toastId)
                    if (aiSuccessCount > 0) {
                        toast.success(`AI analysis completed for ${aiSuccessCount} leads`)
                    }
                }

                setTimeout(() => {
                    handleOpenChange(false)
                }, 1500)

            } catch (err) {
                console.error(err)
                setError('Failed to process CSV file. Please check the format.')
            } finally {
                setIsLoading(false)
            }
        }
        reader.readAsText(file)
    }

    return (
        <Dialog open={open !== undefined ? open : isOpen} onOpenChange={handleOpenChange}>
            {!open && (
                <DialogTrigger asChild>
                    <Button variant="outline">
                        <Upload className="mr-2 h-4 w-4" />
                        Import
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-900">
                <DialogHeader>
                    <DialogTitle>Import Leads</DialogTitle>
                    <DialogDescription>
                        Upload a CSV file to import multiple leads at once.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="csv-file">CSV File</Label>
                        <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} />
                        <p className="text-xs text-muted-foreground">
                            Required columns: first_name, last_name, email. Optional: company, job_title, phone.
                        </p>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="auto-ai"
                            checked={autoGenerateAI}
                            onCheckedChange={(checked) => setAutoGenerateAI(checked as boolean)}
                        />
                        <label
                            htmlFor="auto-ai"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                            Automatically generate AI intelligence after import
                        </label>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {successCount > 0 && (
                        <Alert className="border-green-500 text-green-600">
                            <FileSpreadsheet className="h-4 w-4" />
                            <AlertTitle>Success</AlertTitle>
                            <AlertDescription>Successfully imported {successCount} leads!</AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter>
                    <Button onClick={handleUpload} disabled={!file || isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isLoading ? 'Importing...' : 'Upload & Import'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
