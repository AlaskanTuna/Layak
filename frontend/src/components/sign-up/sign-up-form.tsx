'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { GoogleIcon } from '@/components/auth/google-icon'
import { Button } from '@/components/ui/button'

import { useAuth } from '@/lib/auth-context'
import { signInWithGoogle, authedFetch } from '@/lib/firebase'

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

      // Ping the backend to record consent on first touch
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || ''
      await authedFetch(`${backendUrl}/api/quota`, {
        headers: {
          'X-PDPA-Consent': 'true'
        }
      }).catch(console.error)

      router.replace('/dashboard')
    } catch (err) {
      setPending(false)
      setError(err instanceof Error ? err.message : t('auth.signUp.errorFailed'))
    }
  }

  return (
    <div className="flex w-full flex-col justify-center space-y-6 sm:w-100">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">{t('auth.signUp.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('auth.signUp.description')}</p>
      </div>

      <div className="grid gap-6">
        <div className="grid gap-4">
          <label className="flex items-start gap-3 rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-accent/50 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-1 size-4 shrink-0 rounded border-primary text-primary focus:ring-primary"
              aria-describedby="pdpa-consent-description"
            />
            <div className="grid gap-1.5 leading-none">
              <span id="pdpa-consent-description" className="text-sm text-foreground/80">
                {t('auth.signUp.consentPrefix')}{' '}
                <Link href="/privacy" className="font-medium text-primary underline-offset-4 hover:underline">
                  {t('auth.signUp.consentPrivacy')}
                </Link>{' '}
                {t('auth.signUp.consentAnd')}{' '}
                <Link href="/terms" className="font-medium text-primary underline-offset-4 hover:underline">
                  {t('auth.signUp.consentTerms')}
                </Link>
                {t('auth.signUp.consentSuffix')}
              </span>
            </div>
          </label>
        </div>

        <Button
          type="button"
          size="lg"
          onClick={handleGoogle}
          disabled={!consent || pending || loading}
          className="w-full text-base h-12"
        >
          {pending ? (
            <Loader2 className="mr-2 size-5 animate-spin" aria-hidden />
          ) : (
            <GoogleIcon className="mr-2 size-5" />
          )}
          {t('common.button.continueWithGoogle')}
          <ArrowRight className="ml-2 size-5 opacity-70" aria-hidden />
        </Button>

        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive" role="alert">
            {error}
          </div>
        )}
      </div>

      <p className="px-8 text-center text-sm text-muted-foreground">
        {t('auth.signUp.hasAccountPrefix')}{' '}
        <Link href="/sign-in" className="font-medium text-primary underline-offset-4 hover:underline">
          {t('auth.signUp.hasAccountCta')}
        </Link>
      </p>
    </div>
  )
}
