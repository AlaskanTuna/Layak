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

export function SignInForm() {
  const { t } = useTranslation()
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
      setError(err instanceof Error ? err.message : t('auth.signIn.errorFailed'))
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="font-heading text-2xl">{t('auth.signIn.title')}</CardTitle>
        <CardDescription>{t('auth.signIn.description')}</CardDescription>
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
          {t('common.button.continueWithGoogle')}
          <ArrowRight className="ml-1.5 size-4" aria-hidden />
        </Button>
        {error && (
          <p role="alert" className="text-center text-sm text-destructive">
            {error}
          </p>
        )}
        <p className="text-center text-xs text-muted-foreground">
          {t('auth.signIn.noAccountPrefix')}{' '}
          <Link href="/sign-up" className="text-primary underline underline-offset-2">
            {t('auth.signIn.noAccountCta')}
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
