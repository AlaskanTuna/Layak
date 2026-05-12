import { DiscoveryDetailPage } from '@/app/pages/admin/discovery-detail-page'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DiscoveryDetailPage candidateId={id} />
}
