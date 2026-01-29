'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { ForgotPasswordModal } from '@/components/auth/forgot-password-modal'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showForgotPassword, setShowForgotPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [mode, setMode] = useState<'login' | 'signup'>('login')
    const [message, setMessage] = useState('')
    const router = useRouter()
    const supabase = createClient()

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setMessage('')

        try {
            if (mode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })

                if (error) throw error

                router.push('/dashboard')
                router.refresh()
            } else {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`
                    }
                })

                if (error) throw error

                if (data.user) {
                    setMessage('Account created successfully! You can now sign in.')
                    setMode('login')
                }
            }
        } catch (error: any) {
            setError(error.message || 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const createTestUser = async () => {
        setEmail('test@eventra.com')
        setPassword('TestPassword123!')
        setMode('signup')
        setMessage('Click "Sign up" to create this test account')
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50">
            <Card className="w-full max-w-md p-8 border border-zinc-200">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-medium text-zinc-900 mb-2">
                        {mode === 'login' ? 'Sign in to Eventra' : 'Create Eventra Account'}
                    </h1>
                    <p className="text-zinc-600">
                        Event management and lead tracking platform
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
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
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password" className="text-zinc-900">
                                Password
                            </Label>
                            {mode === 'login' && (
                                <a
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        setShowForgotPassword(true)
                                    }}
                                    className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                                >
                                    Forgot password?
                                </a>
                            )}
                        </div>
                        <div className="relative mt-1">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    {message && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-green-600">{message}</p>
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={loading}
                    >
                        {loading ? (mode === 'login' ? 'Signing in...' : 'Creating account...') : (mode === 'login' ? 'Sign in' : 'Sign up')}
                    </Button>
                </form>

                <div className="mt-4 text-center">
                    <button
                        type="button"
                        onClick={() => {
                            setMode(mode === 'login' ? 'signup' : 'login')
                            setError('')
                            setMessage('')
                        }}
                        className="text-sm text-indigo-600 hover:text-indigo-700"
                    >
                        {mode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                    </button>
                </div>
            </Card>

            <ForgotPasswordModal
                isOpen={showForgotPassword}
                onClose={() => setShowForgotPassword(false)}
            />
        </div>
    )
}
