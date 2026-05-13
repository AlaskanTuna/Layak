'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { GoogleIcon } from '@/components/auth/google-icon'
import { EmailSignInForm } from '@/components/sign-in/email-sign-in-form'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { useAuth } from '@/lib/auth-context'
import { signInAsGuest, signInWithGoogle } from '@/lib/firebase'

type Pending = 'google' | 'guest' | null

export function SignInForm() {
  const { t } = useTranslation()
  const router = useRouter()
  const { user, loading } = useAuth()
  const [pending, setPending] = useState<Pending>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard')
    }
  }, [loading, user, router])

  async function handleGoogle() {
    setError(null)
    setPending('google')
    try {
      await signInWithGoogle()
      router.replace('/dashboard')
    } catch (err) {
      setPending(null)
      setError(err instanceof Error ? err.message : t('auth.signIn.errorFailed'))
    }
  }

  async function handleGuest() {
    setError(null)
    setPending('guest')
    try {
      await signInAsGuest()
      router.replace('/dashboard')
    } catch (err) {
      setPending(null)
      setError(err instanceof Error ? err.message : t('auth.signIn.errorGuestFailed'))
    }
  }

  const busy = pending !== null || loading

  return (
    <div className="flex w-full flex-col gap-5">
      <p className="mono-caption text-center text-foreground/55 lg:hidden" aria-hidden>
        {t('auth.context.mobileStrip')}
      </p>

      <div className="paper-card flex flex-col gap-6 rounded-[20px] p-7 sm:p-9">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">{t('auth.signIn.title')}</h1>
          <p className="max-w-[40ch] text-sm leading-relaxed text-muted-foreground">{t('auth.signIn.description')}</p>
        </div>

        <Tabs defaultValue="google" className="w-full" aria-label={t('auth.tabsAriaLabel')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="google">{t('auth.signIn.tabGoogle')}</TabsTrigger>
            <TabsTrigger value="email">{t('auth.signIn.tabEmail')}</TabsTrigger>
          </TabsList>

          <TabsContent value="google" className="mt-4">
            <Button
              type="button"
              size="lg"
              onClick={handleGoogle}
              disabled={busy}
              className="h-12 w-full bg-[color:var(--hibiscus)] text-base text-[color:var(--hibiscus-foreground)] hover:bg-[color:var(--hibiscus)]/92"
            >
              {pending === 'google' ? (
                <Loader2 className="mr-2 size-5 animate-spin" aria-hidden />
              ) : (
                <GoogleIcon className="mr-2 size-5" />
              )}
              {t('common.button.continueWithGoogle')}
              <ArrowRight className="ml-2 size-5 opacity-70" aria-hidden />
            </Button>
          </TabsContent>

          <TabsContent value="email" className="mt-4">
            <EmailSignInForm onSuccess={() => router.replace('/dashboard')} disabled={busy} />
          </TabsContent>
        </Tabs>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleGuest}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-foreground/65 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50"
          >
            {pending === 'guest' && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {t('auth.signIn.continueAsGuest')}
            <ArrowRight className="size-4 opacity-70" aria-hidden />
          </button>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive" role="alert">
            {error}
          </div>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {t('auth.signIn.noAccountPrefix')}{' '}
        <Link href="/sign-up" className="font-medium text-primary underline-offset-4 hover:underline">
          {t('auth.signIn.noAccountCta')}
        </Link>
      </p>
    </div>
  )
}
