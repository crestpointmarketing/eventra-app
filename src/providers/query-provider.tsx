'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { createClient } from '@/lib/supabase/client'

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000, // 1 minute
                        refetchOnWindowFocus: false,
                    },
                },
            })
    )

    useEffect(() => {
        let previousUser: string | null | undefined
        const { data: { subscription } } = createClient().auth.onAuthStateChange((_event, session) => {
            const nextUser = session?.user.id ?? null
            if (previousUser !== undefined && previousUser !== nextUser) queryClient.clear()
            previousUser = nextUser
        })
        return () => subscription.unsubscribe()
    }, [queryClient])
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}
