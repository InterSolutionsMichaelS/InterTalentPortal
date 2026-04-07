import { notFound } from 'next/navigation';
import { getClientBySlug } from '@/lib/client-portal/get-client-by-slug';

interface ClientPortalPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ClientPortalPage({ params }: ClientPortalPageProps) {
  const { slug } = await params;
  const data = await getClientBySlug(slug);

  if (!data) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-4 text-3xl font-bold text-gray-900">{data.client.name}</h1>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="grid grid-cols-1 gap-0 divide-y divide-gray-200 text-sm md:grid-cols-2 md:divide-x md:divide-y-0">
          <div className="p-4">
            <p className="text-gray-500">Client slug</p>
            <p className="font-medium text-gray-900">{data.client.slug}</p>
          </div>
          <div className="p-4">
            <p className="text-gray-500">Properties</p>
            <p className="font-medium text-gray-900">{data.properties.length}</p>
          </div>
          <div className="p-4">
            <p className="text-gray-500">Contacts</p>
            <p className="font-medium text-gray-900">{data.contacts.length}</p>
          </div>
          <div className="p-4">
            <p className="text-gray-500">Brand colors</p>
            <p className="font-medium text-gray-900">
              Primary: {data.client.primary_color ?? '#1A3C5E'}
              <br />
              Secondary: {data.client.secondary_color ?? '#F5A623'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
