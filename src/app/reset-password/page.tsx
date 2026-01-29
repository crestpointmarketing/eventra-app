'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [sessionValid, setSessionValid] = useState<boolean | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Check if user has valid session from reset link
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setSessionValid(false)
        setError('Invalid or expired reset link. Please request a new password reset.')
      } else {
        setSessionValid(true)
      }
    }
    checkSession()
  }, [supabase])

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const validationError = validatePassword(password)
    if (validationError) {
      setError(validationError)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      setSuccess(true)
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (error: any) {
      setError(error.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  if (sessionValid === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-zinc-600 dark:text-zinc-400">Verifying reset link...</p>
          </div>
        </Card>
      </div>
    )
  }

  if (sessionValid === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-950 mx-auto mb-4 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-medium text-zinc-900 dark:text-white mb-2">
              Invalid Reset Link
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
              {error}
            </p>
            <Button onClick={() => router.push('/login')} className="w-full">
              Back to Login
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
      <Card className="w-full max-w-md p-8 border border-zinc-200 dark:border-zinc-800">
        {!success ? (
          <>
            <h1 className="text-3xl font-medium text-zinc-900 dark:text-white mb-2">
              Set New Password
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              Enter your new password below
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password" className="text-zinc-900 dark:text-white">
                  New Password
                </Label>
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
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Must be at least 8 characters
                </p>
              </div>

              <div>
                <Label htmlFor="confirm-password" className="text-zinc-900 dark:text-white">
                  Confirm Password
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push('/login')}
                className="w-full"
              >
                Back to Login
              </Button>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-950 mx-auto mb-4 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">
              Password Updated!
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Redirecting to dashboard...
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
