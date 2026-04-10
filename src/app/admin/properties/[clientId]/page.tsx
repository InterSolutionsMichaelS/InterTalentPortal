'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { BulkImportPropertiesModal } from '@/components/admin/BulkImportPropertiesModal';
import { ClientSidebar } from '@/components/admin/ClientSidebar';
import { CreateClientModal } from '@/components/admin/CreateClientModal';
import { CreatePropertyModal } from '@/components/admin/CreatePropertyModal';
import { DeleteClientModal } from '@/components/admin/DeleteClientModal';
import { DeletePropertyModal } from '@/components/admin/DeletePropertyModal';
import { EditPropertyModal } from '@/components/admin/EditPropertyModal';
import { PropertyContactsSection } from '@/components/admin/PropertyContactsSection';
import { ToastProvider } from '@/components/admin/ToastContext';
import { useAdminClients } from '@/hooks/useAdminClients';
import type {
  ApiErrorResponse,
  Client,
  Property,
  PropertyListResponse,
} from '@/types/admin';

export default function AdminPropertiesPage() {
  const params = useParams();
  const router = useRouter();
  const rawParam = params.clientId;
  const clientId =
    typeof rawParam === 'string' ? Number.parseInt(rawParam, 10) : NaN;

  const {
    clients,
    isLoading: loadingList,
    addClient,
    removeClient,
  } = useAdminClients();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [showCreatePropertyModal, setShowCreatePropertyModal] =
    useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeletePropertyModal, setShowDeletePropertyModal] =
    useState(false);
  const [showDeleteClientModal, setShowDeleteClientModal] = useState(false);
  const [deleteClientTarget, setDeleteClientTarget] = useState<Client | null>(
    null
  );
  const [editProperty, setEditProperty] = useState<Property | null>(null);
  const [deletePropertyTarget, setDeletePropertyTarget] =
    useState<Property | null>(null);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);

  const filteredClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q)
    );
  }, [clients, searchQuery]);

  const clientIdValid = Number.isFinite(clientId);
  const selectedClient = useMemo(
    () => (clientIdValid ? clients.find((c) => c.id === clientId) : undefined),
    [clients, clientId, clientIdValid]
  );

  const fetchProperties = useCallback(async (cid: number) => {
    setLoadingProperties(true);
    setPropertiesError(null);
    try {
      const res = await fetch(`/api/admin/clients/${cid}/properties`);
      const json = (await res.json()) as PropertyListResponse | ApiErrorResponse;
      if (!json.success) {
        setProperties([]);
        if (json.error === 'CLIENT_NOT_FOUND') {
          setPropertiesError('CLIENT_NOT_FOUND');
        } else {
          setPropertiesError('LOAD_FAILED');
        }
        return;
      }
      setProperties(json.data);
    } catch {
      setProperties([]);
      setPropertiesError('LOAD_FAILED');
    } finally {
      setLoadingProperties(false);
    }
  }, []);

  useEffect(() => {
    if (!clientIdValid) {
      setProperties([]);
      setLoadingProperties(false);
      setPropertiesError(null);
      return;
    }
    void fetchProperties(clientId);
  }, [clientId, clientIdValid, fetchProperties]);

  useEffect(() => {
    if (clients.length === 0) return;
    if (!clientIdValid) return;
    if (!selectedClient) {
      router.replace(`/admin/properties/${clients[0].id}`);
    }
  }, [clients, clientIdValid, router, selectedClient]);

  const mainNoSearchMatches =
    searchQuery.trim().length > 0 && filteredClients.length === 0;

  const handleSelectClient = (id: number) => {
    router.push(`/admin/clients/${id}`);
  };

  const openDeleteClient = (id: number) => {
    const c = clients.find((x) => x.id === id);
    if (c) {
      setDeleteClientTarget(c);
      setShowDeleteClientModal(true);
    }
  };

  const renderMain = () => {
    if (loadingList) {
      return (
        <div className="animate-pulse p-6 md:p-8">
          <div className="mb-6 h-9 w-64 max-w-full rounded bg-gray-200" />
          <div className="h-64 rounded-lg border border-gray-200 bg-gray-100" />
        </div>
      );
    }

    if (clients.length === 0) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
          <p className="mb-4 max-w-md text-sm text-gray-600">
            Create a client portal first, then you can add properties.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateClientModal(true)}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50"
          >
            + New Client
          </button>
        </div>
      );
    }

    if (mainNoSearchMatches) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            No matching clients
          </h1>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50"
          >
            Clear search
          </button>
        </div>
      );
    }

    if (!clientIdValid) {
      return (
        <div className="p-6 md:p-8">
          <p className="text-sm text-gray-600">Invalid client in URL.</p>
          <Link
            href="/admin"
            className="mt-4 inline-block text-sm text-gray-800 hover:underline"
          >
            ← Back to branding
          </Link>
        </div>
      );
    }

    if (propertiesError === 'CLIENT_NOT_FOUND') {
      return (
        <div className="p-6 md:p-8">
          <p className="text-sm text-gray-600">This client was not found.</p>
          <Link
            href="/admin"
            className="mt-4 inline-block text-sm text-gray-800 hover:underline"
          >
            ← Back to branding
          </Link>
        </div>
      );
    }

    return (
      <div className="p-6 md:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href={`/admin/clients/${clientId}`}
              className="mb-3 inline-block text-sm text-gray-800 hover:underline"
            >
              ← Branding & overview
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
              📍 Properties
              {selectedClient ? ` · ${selectedClient.name}` : ''}
            </h1>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowBulkModal(true)}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              Import CSV
            </button>
            <button
              type="button"
              onClick={() => setShowCreatePropertyModal(true)}
              className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
            >
              + Add property
            </button>
          </div>
        </div>

        <section className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-md">
          <div className="border-b border-gray-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                All locations
              </h2>
              <span className="text-sm text-gray-500">
                {properties.length}{' '}
                {properties.length === 1 ? 'property' : 'properties'}
              </span>
            </div>
          </div>

          {loadingProperties ? (
            <div className="p-8 text-center text-sm text-gray-500">
              Loading properties…
            </div>
          ) : propertiesError ? (
            <div className="p-8 text-center text-sm text-red-600">
              Could not load properties. Please try again.
            </div>
          ) : properties.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <span className="mb-3 text-4xl" aria-hidden>
                📍
              </span>
              <p className="mb-1 text-sm font-semibold text-gray-900">
                No properties added yet
              </p>
              <p className="mb-4 text-xs text-gray-500">
                Add properties manually one by one, or import multiple at once
                using a CSV file.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(true)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  📤 Import CSV
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreatePropertyModal(true)}
                  className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
                >
                  + Add Property
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {properties.map((p) => {
                const cityState = [p.city, p.state].filter(Boolean).join(' ');
                const addressParts = [p.address, cityState, p.zip].filter(
                  Boolean
                );
                const addressLine = addressParts.join(', ');

                return (
                  <div key={p.id} className="flex flex-col">
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {p.name}
                        </p>
                        {addressLine ? (
                          <p className="mt-0.5 truncate text-xs text-gray-500">
                            {addressLine}
                          </p>
                        ) : null}
                      </div>
                      <div className="ml-4 flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditProperty(p);
                            setShowEditModal(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-orange-500 px-3 py-1.5 text-sm font-semibold text-orange-600 hover:bg-orange-50"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeletePropertyTarget(p);
                            setShowDeletePropertyModal(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-red-500 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                        >
                          🗑 Delete
                        </button>
                      </div>
                    </div>
                    <PropertyContactsSection
                      propertyId={p.id}
                      propertyName={p.name}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    );
  };

  return (
    <ToastProvider>
      <div className="admin-portal w-full">
        <AdminLayout
          sidebar={
            <ClientSidebar
              clients={clients}
              filteredClients={filteredClients}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              selectedClientId={clientIdValid ? clientId : null}
              onSelectClient={handleSelectClient}
              onNewClient={() => setShowCreateClientModal(true)}
              onRequestDelete={openDeleteClient}
              loading={loadingList}
            />
          }
        >
          {renderMain()}
        </AdminLayout>
      </div>

      <CreateClientModal
        isOpen={showCreateClientModal}
        onClose={() => setShowCreateClientModal(false)}
        onSuccess={(newClient) => {
          addClient(newClient);
          router.push(`/admin/properties/${newClient.id}`);
        }}
      />

      <CreatePropertyModal
        isOpen={showCreatePropertyModal}
        clientId={clientIdValid ? clientId : null}
        onClose={() => setShowCreatePropertyModal(false)}
        onSuccess={() => {
          if (clientIdValid) void fetchProperties(clientId);
        }}
      />

      <BulkImportPropertiesModal
        isOpen={showBulkModal}
        clientId={clientIdValid ? clientId : null}
        onClose={() => setShowBulkModal(false)}
        onSuccess={() => {
          if (clientIdValid) void fetchProperties(clientId);
        }}
      />

      <EditPropertyModal
        isOpen={showEditModal}
        property={editProperty}
        onClose={() => {
          setShowEditModal(false);
          setEditProperty(null);
        }}
        onSuccess={() => {
          if (clientIdValid) void fetchProperties(clientId);
        }}
      />

      <DeletePropertyModal
        isOpen={showDeletePropertyModal}
        property={deletePropertyTarget}
        onClose={() => {
          setShowDeletePropertyModal(false);
          setDeletePropertyTarget(null);
        }}
        onSuccess={() => {
          if (clientIdValid) void fetchProperties(clientId);
        }}
      />

      <DeleteClientModal
        isOpen={showDeleteClientModal}
        client={deleteClientTarget}
        onClose={() => {
          setShowDeleteClientModal(false);
          setDeleteClientTarget(null);
        }}
        onSuccess={(deletedId) => {
          setShowDeleteClientModal(false);
          setDeleteClientTarget(null);
          removeClient(deletedId);
          const next = clients.filter((c) => c.id !== deletedId);
          if (deletedId === clientId) {
            if (next.length > 0) {
              router.push(`/admin/properties/${next[0].id}`);
            } else {
              router.push('/admin');
            }
          }
        }}
      />
    </ToastProvider>
  );
}
