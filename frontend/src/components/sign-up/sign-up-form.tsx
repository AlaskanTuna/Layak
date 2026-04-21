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

export function SignUpForm() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [consent, setConsent] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard')
    }
  }, [loading, user, router])

  async function handleGoogle() {
    if (!consent) return
    setError(null)
    setPending(true)
    try {
      await signInWithGoogle()
      router.replace('/dashboard')
    } catch (err) {
      setPending(false)
      setError(err instanceof Error ? err.message : 'Sign-up failed. Please try again.')
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="font-heading text-2xl">Create your account</CardTitle>
        <CardDescription>
          Sign up with Google. Layak never submits anything on your behalf — you stay in control of every draft packet.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={consent}
            onChange={event => setConsent(event.target.checked)}
            className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border border-input accent-primary"
            aria-describedby="pdpa-consent-description"
          />
          <span id="pdpa-consent-description" className="text-muted-foreground">
            I consent to Layak processing my uploaded documents (IC, payslip, utility bill) to match government
            schemes, per the{' '}
            <Link href="/privacy" className="text-primary underline underline-offset-2">
              Privacy Policy
            </Link>{' '}
            and{' '}
            <Link href="/terms" className="text-primary underline underline-offset-2">
              Terms
            </Link>
            .
          </span>
        </label>
        <Button
          type="button"
          size="lg"
          onClick={handleGoogle}
          disabled={!consent || pending || loading}
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
          Already have an account?{' '}
          <Link href="/sign-in" className="text-primary underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
