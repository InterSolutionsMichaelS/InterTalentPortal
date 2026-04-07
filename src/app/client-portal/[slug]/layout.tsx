import type React from 'react';
import { notFound } from 'next/navigation';
import { getClientBySlug } from '@/lib/client-portal/get-client-by-slug';
import { ClientPortalProvider } from '@/contexts/ClientPortalContext';

interface ClientPortalLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function ClientPortalLayout({
  children,
  params,
}: ClientPortalLayoutProps) {
  const { slug } = await params;
  const data = await getClientBySlug(slug);

  if (!data) {
    notFound();
  }

  const cssVars = {
    '--color-primary': data.client.primary_color ?? '#1A3C5E',
    '--color-secondary': data.client.secondary_color ?? '#F5A623',
  } as React.CSSProperties;

  return (
    <ClientPortalProvider value={data}>
      <div style={cssVars} className="min-h-screen bg-white text-gray-900">
        <header className="border-b border-gray-200 bg-[var(--color-primary)] text-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <div className="text-sm font-semibold">{data.client.name}</div>
            <nav className="text-xs opacity-90">Client Portal</nav>
          </div>
        </header>

        <main>{children}</main>

        <footer className="border-t border-gray-200 bg-gray-50">
          <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-gray-600">
            Powered by InterTalent
          </div>
        </footer>
      </div>
    </ClientPortalProvider>
  );
}
