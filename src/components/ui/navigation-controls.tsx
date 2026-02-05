'use client'

import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useRouter, usePathname } from 'next/navigation'

interface NavigationControlsProps {
    className?: string
}

export function NavigationControls({ className }: NavigationControlsProps) {
    const router = useRouter()
    const pathname = usePathname()

    // Exclude Landing Page and Dashboard
    if (pathname === '/' || pathname === '/dashboard') {
        return null
    }

    return (
        <div className="w-full max-w-7xl mx-auto px-8">
            <div className={cn("flex items-center justify-center gap-1 py-4", className)}>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.back()}
                    className="h-8 w-8 px-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    title="Go Back"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="sr-only">Back</span>
                </Button>
                <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700 mx-1" />
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.history.forward()}
                    className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 h-8 w-8 px-0"
                    title="Go Forward"
                >
                    <ArrowRight className="w-4 h-4" />
                    <span className="sr-only">Forward</span>
                </Button>
            </div>
        </div>
    )
}
