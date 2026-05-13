'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { GoogleIcon } from '@/components/auth/google-icon'
import { EmailSignUpForm } from '@/components/sign-up/email-sign-up-form'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { useAuth } from '@/lib/auth-context'
import { authedFetch, signInWithGoogle } from '@/lib/firebase'

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
    <div className="flex w-full flex-col gap-5">
      <p className="mono-caption text-center text-foreground/55 lg:hidden" aria-hidden>
        {t('auth.context.mobileStrip')}
      </p>

      <div className="paper-card flex flex-col gap-6 rounded-[20px] p-7 sm:p-9">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">{t('auth.signUp.title')}</h1>
          <p className="max-w-[40ch] text-sm leading-relaxed text-muted-foreground">{t('auth.signUp.description')}</p>
        </div>

        <Tabs defaultValue="google" className="w-full" aria-label={t('auth.tabsAriaLabel')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="google">{t('auth.signUp.tabGoogle')}</TabsTrigger>
            <TabsTrigger value="email">{t('auth.signUp.tabEmail')}</TabsTrigger>
          </TabsList>

          <TabsContent value="google" className="mt-4">
            <Button
              type="button"
              size="lg"
              onClick={handleGoogle}
              disabled={!consent || pending || loading}
              className="h-12 w-full bg-[color:var(--hibiscus)] text-base text-[color:var(--hibiscus-foreground)] hover:bg-[color:var(--hibiscus)]/92"
            >
              {pending ? (
                <Loader2 className="mr-2 size-5 animate-spin" aria-hidden />
              ) : (
                <GoogleIcon className="mr-2 size-5" />
              )}
              {t('common.button.continueWithGoogle')}
              <ArrowRight className="ml-2 size-5 opacity-70" aria-hidden />
            </Button>
          </TabsContent>

          <TabsContent value="email" className="mt-4">
            <EmailSignUpForm
              consent={consent}
              onSuccess={() => router.replace('/dashboard')}
              disabled={pending || loading}
            />
          </TabsContent>
        </Tabs>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-foreground/10 bg-foreground/[0.025] p-3 transition-colors hover:bg-accent/40">
          <Checkbox
            checked={consent}
            onCheckedChange={(next) => setConsent(next === true)}
            className="mt-0.5"
            aria-describedby="pdpa-consent-description"
          />
          <span id="pdpa-consent-description" className="text-[12.5px] leading-snug text-foreground/75">
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
        </label>

        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive" role="alert">
            {error}
          </div>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {t('auth.signUp.hasAccountPrefix')}{' '}
        <Link href="/sign-in" className="font-medium text-primary underline-offset-4 hover:underline">
          {t('auth.signUp.hasAccountCta')}
        </Link>
      </p>
    </div>
  )
}
