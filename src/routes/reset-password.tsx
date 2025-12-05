import { createFileRoute, Link, useSearch } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const search = useSearch({ from: '/reset-password' }) as { token: string }
  const token = search.token
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Missing reset token')
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError('Missing reset token')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      const siteUrl = import.meta.env.VITE_CONVEX_URL?.replace('/api', '') || window.location.origin
      const response = await fetch(`${siteUrl}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password')
      }

      setSuccess(true)
      setTimeout(() => {
        window.location.href = '/'
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col gap-4 w-full max-w-md p-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Invalid Reset Link</h1>
            <p className="text-muted-foreground mt-2">
              The password reset link is invalid or missing.
            </p>
          </div>
          <Link to="/forgot-password">
            <Button className="w-full">Request new reset link</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col gap-4 w-full max-w-md p-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Password Reset Successful</h1>
            <p className="text-muted-foreground mt-2">
              Your password has been reset. Redirecting to sign in...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col gap-8 w-full max-w-md p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Reset Password</h1>
          <p className="text-muted-foreground mt-2">
            Enter your new password below.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          
          {error && (
            <div className="bg-destructive/10 border border-destructive/50 rounded-md p-3">
              <p className="text-sm text-destructive">
                {error}
              </p>
            </div>
          )}
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>
          
          <div className="text-center text-sm">
            <Link to="/" className="text-primary hover:underline">
              Back to sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}


