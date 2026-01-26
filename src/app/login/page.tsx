'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setError(error.message)
        } else {
            router.push('/')
            router.refresh()
        }

        setLoading(false)
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50">
            <Card className="w-full max-w-md p-8 border border-zinc-200">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-medium text-zinc-900 mb-2">
                        Sign in to Eventra
                    </h1>
                    <p className="text-zinc-600">
                        Event management and lead tracking platform
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <Label htmlFor="email" className="text-zinc-900">
                            Email
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            className="mt-1"
                        />
                    </div>

                    <div>
                        <Label htmlFor="password" className="text-zinc-900">
                            Password
                        </Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="mt-1"
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={loading}
                    >
                        {loading ? 'Signing in...' : 'Sign in'}
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-zinc-600">
                        Demo credentials from synthetic data:
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                        Check your Supabase users table
                    </p>
                </div>
            </Card>
        </div>
    )
}
