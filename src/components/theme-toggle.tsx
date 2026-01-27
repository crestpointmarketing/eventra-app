'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
    const [mounted, setMounted] = useState(false)
    const { theme, setTheme } = useTheme()

    // Avoid hydration mismatch
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return null
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-full"
        >
            {theme === 'dark' ? (
                <Sun className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
            ) : (
                <Moon className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
            )}
            <span className="sr-only">Toggle theme</span>
        </Button>
    )
}
