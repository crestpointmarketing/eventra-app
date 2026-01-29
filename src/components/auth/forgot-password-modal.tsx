'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { X, CheckCircle2 } from 'lucide-react'

interface ForgotPasswordModalProps {
    isOpen: boolean
    onClose: () => void
}

export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const supabase = createClient()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            })

            if (error) throw error

            setSuccess(true)
        } catch (error: any) {
            setError(error.message || 'Failed to send reset email')
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        setEmail('')
        setError('')
        setSuccess(false)
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md p-6 relative">
                <button
                    onClick={handleClose}
                    className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-300"
                >
                    <X className="h-5 w-5" />
                </button>

                {!success ? (
                    <>
                        <h2 className="text-2xl font-semibold text-white mb-2">
                            Reset Password
                        </h2>
                        <p className="text-sm text-zinc-300 mb-6">
                            Enter your email and we'll send you a reset link
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="reset-email" className="text-white">
                                    Email
                                </Label>
                                <Input
                                    id="reset-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                    className="mt-1 text-white placeholder:text-zinc-500"
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg">
                                    <p className="text-sm text-red-200">{error}</p>
                                </div>
                            )}

                            <Button type="submit" disabled={loading} className="w-full">
                                {loading ? 'Sending...' : 'Send Reset Link'}
                            </Button>

                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleClose}
                                className="w-full"
                            >
                                Cancel
                            </Button>
                        </form>
                    </>
                ) : (
                    <div className="text-center py-4">
                        <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-950 mx-auto mb-4 flex items-center justify-center">
                            <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-lg font-medium text-white mb-2">
                            Check your email
                        </h3>
                        <p className="text-sm text-zinc-300 mb-4">
                            We've sent a password reset link to <strong>{email}</strong>
                        </p>
                        <Button onClick={handleClose} className="w-full">
                            Close
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    )
}
