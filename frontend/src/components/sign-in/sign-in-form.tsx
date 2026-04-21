'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'

import { GoogleIcon } from '@/components/auth/google-icon'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-context'
import { signInWithGoogle } from '@/lib/firebase'

export function SignInForm() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard')
    }
  }, [loading, user, router])

  async function handleGoogle() {
    setError(null)
    setPending(true)
    try {
      await signInWithGoogle()
      router.replace('/dashboard')
    } catch (err) {
      setPending(false)
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.')
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="font-heading text-2xl">Welcome back</CardTitle>
        <CardDescription>Continue with your Google account to reach your dashboard.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <Button
          type="button"
          size="lg"
          onClick={handleGoogle}
          disabled={pending || loading}
          className="w-full"
        >
          {pending ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden />
          ) : (
            <GoogleIcon className="mr-1.5 size-4" />
          )}
          Continue with Google
          <ArrowRight className="ml-1.5 size-4" aria-hidden />
        </Button>
        {error && (
          <p role="alert" className="text-center text-sm text-destructive">
            {error}
          </p>
        )}
        <p className="text-center text-xs text-muted-foreground">
          No account?{' '}
          <Link href="/sign-up" className="text-primary underline underline-offset-2">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
