import { Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Layak</CardTitle>
          <CardDescription>
            Agentic AI concierge for Malaysian social-assistance schemes. Upload three documents; the agent returns a
            ranked, cited list of what you qualify for and a pre-filled draft application packet.
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6">
          <Button disabled className="w-full">
            <Play className="mr-2 h-4 w-4" aria-hidden />
            Start
          </Button>
        </div>
      </Card>
    </main>
  )
}
