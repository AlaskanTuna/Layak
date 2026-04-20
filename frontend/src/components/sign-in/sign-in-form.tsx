'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, UserRound } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

export function SignInForm() {
  const router = useRouter()

  function handleGuest() {
    router.push('/dashboard')
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="font-heading text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in with email or continue as a guest.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <Button type="button" size="lg" onClick={handleGuest} className="w-full">
          <UserRound className="mr-1.5 size-4" aria-hidden />
          Continue as guest
          <ArrowRight className="ml-1.5 size-4" aria-hidden />
        </Button>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Separator className="flex-1" />
          <span>or</span>
          <Separator className="flex-1" />
        </div>
        <form
          className="flex flex-col gap-3"
          onSubmit={e => {
            e.preventDefault()
            router.push('/dashboard')
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" disabled />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="••••••••" autoComplete="current-password" disabled />
          </div>
          <Button type="submit" variant="outline" disabled>
            Sign in (disabled — use guest)
          </Button>
        </form>
        <p className="text-center text-xs text-muted-foreground">
          No account?{' '}
          <Link href="/sign-in" className="text-primary underline underline-offset-2">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
