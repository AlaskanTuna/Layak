'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { GoogleIcon } from '@/components/auth/google-icon'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-context'
import { signInWithGoogle } from '@/lib/firebase'

export function SignUpForm() {
  const { t } = useTranslation()
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
      setError(err instanceof Error ? err.message : t('auth.signUp.errorFailed'))
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="font-heading text-2xl">{t('auth.signUp.title')}</CardTitle>
        <CardDescription>{t('auth.signUp.description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border border-input accent-primary"
            aria-describedby="pdpa-consent-description"
          />
          <span id="pdpa-consent-description" className="text-muted-foreground">
            {t('auth.signUp.consentPrefix')}{' '}
            <Link href="/privacy" className="text-primary underline underline-offset-2">
              {t('auth.signUp.consentPrivacy')}
            </Link>{' '}
            {t('auth.signUp.consentAnd')}{' '}
            <Link href="/terms" className="text-primary underline underline-offset-2">
              {t('auth.signUp.consentTerms')}
            </Link>
            {t('auth.signUp.consentSuffix')}
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
          {t('common.button.continueWithGoogle')}
          <ArrowRight className="ml-1.5 size-4" aria-hidden />
        </Button>
        {error && (
          <p role="alert" className="text-center text-sm text-destructive">
            {error}
          </p>
        )}
        <p className="text-center text-xs text-muted-foreground">
          {t('auth.signUp.hasAccountPrefix')}{' '}
          <Link href="/sign-in" className="text-primary underline underline-offset-2">
            {t('auth.signUp.hasAccountCta')}
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
