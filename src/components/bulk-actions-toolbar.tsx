'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { X, Download, Sparkles } from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

interface BulkActionsToolbarProps {
    count: number
    itemType: 'lead' | 'event' | 'task'
    onExport: () => void
    onUpdateStatus?: (status: string) => void
    onGenerateAI?: () => void
    onClear: () => void
    statusOptions?: Array<{ value: string; label: string }>
}

export function BulkActionsToolbar({
    count,
    itemType,
    onExport,
    onUpdateStatus,
    onGenerateAI,
    onClear,
    statusOptions,
}: BulkActionsToolbarProps) {
    if (count === 0) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="fixed bottom-0 left-0 right-0 z-50"
            >
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-6">
                    <div className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-t-xl shadow-2xl px-6 py-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <span className="font-medium">
                                    {count} {itemType}{count > 1 ? 's' : ''} selected
                                </span>

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onExport}
                                        className="bg-white text-indigo-600 hover:bg-zinc-100 dark:bg-lime-400 dark:text-zinc-900 dark:hover:bg-lime-500 font-medium border-none"
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        Export Selected
                                    </Button>

                                    {onGenerateAI && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={onGenerateAI}
                                            className="bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indiogo-500 dark:text-white dark:hover:bg-indigo-600 font-medium border-none"
                                        >
                                            <Sparkles className="h-4 w-4 mr-2" />
                                            Generate AI
                                        </Button>
                                    )}

                                    {onUpdateStatus && statusOptions && (
                                        <Select onValueChange={onUpdateStatus}>
                                            <SelectTrigger className="w-[180px] border-white/20 bg-transparent hover:bg-white/10 dark:border-zinc-900/20 dark:hover:bg-zinc-900/10">
                                                <SelectValue placeholder="Update Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {statusOptions.map(option => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                            </div>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onClear}
                                className="bg-white text-indigo-600 hover:bg-zinc-100 dark:bg-lime-400 dark:text-zinc-900 dark:hover:bg-lime-500 font-medium border-none"
                            >
                                <X className="h-4 w-4 mr-2" />
                                Clear Selection
                            </Button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
