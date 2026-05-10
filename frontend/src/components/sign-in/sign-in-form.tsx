'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { GoogleIcon } from '@/components/auth/google-icon'
import { Button } from '@/components/ui/button'

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
    <div className="flex w-full flex-col justify-center space-y-6 sm:w-100">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">{t('auth.signIn.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('auth.signIn.description')}</p>
      </div>

      <div className="grid gap-4">
        <Button type="button" size="lg" onClick={handleGoogle} disabled={busy} className="w-full text-base h-12">
          {pending === 'google' ? (
            <Loader2 className="mr-2 size-5 animate-spin" aria-hidden />
          ) : (
            <GoogleIcon className="mr-2 size-5" />
          )}
          {t('common.button.continueWithGoogle')}
          <ArrowRight className="ml-2 size-5 opacity-70" aria-hidden />
        </Button>

        <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <span aria-hidden className="h-px flex-1 bg-border" />
          {t('auth.signIn.orDivider')}
          <span aria-hidden className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={handleGuest}
          disabled={busy}
          className="w-full text-base h-12"
        >
          {pending === 'guest' && <Loader2 className="mr-2 size-5 animate-spin" aria-hidden />}
          {t('auth.signIn.continueAsGuest')}
        </Button>

        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive" role="alert">
            {error}
          </div>
        )}
      </div>

      <p className="px-8 text-center text-sm text-muted-foreground">
        {t('auth.signIn.noAccountPrefix')}{' '}
        <Link href="/sign-up" className="font-medium text-primary underline-offset-4 hover:underline">
          {t('auth.signIn.noAccountCta')}
        </Link>
      </p>
    </div>
  )
}
