'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle({ inverse = false }: { inverse?: boolean }) {
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
            className={inverse ? 'rounded-full text-gray-300 hover:bg-white/10 hover:text-white' : 'rounded-full'}
        >
            {theme === 'dark' ? (
                <Sun className={inverse ? 'h-5 w-5' : 'h-5 w-5 text-purple-400'} />
            ) : (
                <Moon className={inverse ? 'h-5 w-5' : 'h-5 w-5 text-purple-600'} />
            )}
            <span className="sr-only">Toggle theme</span>
        </Button>
    )
}
