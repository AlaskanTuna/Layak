import { HomeClient } from '@/components/home/home-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Home() {
  return (
    <main className="flex flex-1 items-start justify-center p-4 sm:p-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Layak</CardTitle>
          <CardDescription>
            Upload three documents — your MyKad, a recent payslip, and a utility bill. The agent extracts, classifies,
            matches, ranks, and drafts application packets for every scheme you qualify for. Every number cites a source
            page. Every packet is a DRAFT — you submit manually.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HomeClient />
        </CardContent>
      </Card>
    </main>
  )
}
