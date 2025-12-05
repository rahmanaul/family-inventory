import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestPasswordReset = useMutation(api.authFunctions.requestPasswordReset)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    try {
      await requestPasswordReset({ email })
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email')
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col gap-4 w-full max-w-md p-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Check your email</h1>
            <p className="text-muted-foreground mt-2">
              We've sent a password reset link to {email}
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              If you don't see the email, check your spam folder.
            </p>
          </div>
          <Link to="/">
            <Button className="w-full">Back to sign in</Button>
          </Link>
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
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          {error && (
            <div className="bg-destructive/10 border border-destructive/50 rounded-md p-3">
              <p className="text-sm text-destructive">
                {error}
              </p>
            </div>
          )}
          
          <Button type="submit" className="w-full">
            Send reset link
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


