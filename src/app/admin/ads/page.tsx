'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { CreateAdModal } from '@/components/admin/CreateAdModal';
import { EditAdModal } from '@/components/admin/EditAdModal';
import { DeleteAdModal } from '@/components/admin/DeleteAdModal';
import { Ad } from '@/types/ad'; 


export default function AdminAdsPage() {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedAd, setSelectedAd] = useState<Ad | null>(null);


    const [ads, setAds] = useState<Ad[]>([]);

    useEffect(() => {
      loadAds();
    }, []);

    const loadAds = async () => {
      try {
        const response = await fetch('/api/admin/ads');

        if (!response.ok) {
        throw new Error('Failed to load ads');
        }

        const data = await response.json();

        setAds(data);
      } catch (error) {
        console.error(error);
      }
    };

    return (
        <AdminLayout
            sidebar={
                <div className="p-4">
                    <h2 className="font-bold text-[#022949]">
                        Ad Management
                    </h2>
                </div>
            }
        >
            <div className="p-6">

                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-[#022949]">
                            Ad Management
                        </h1>
                        <p className="text-sm text-gray-600">
                            Upload and manage portal ads
                        </p>
                    </div>

                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="rounded-lg bg-[#FF30AF] px-4 py-2 font-semibold text-white transition hover:opacity-90"
                    >
                        + Upload Ad
                    </button>
                </div>

                {/* Ads Table */}
                <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table className="w-full">
                        <thead className="bg-[#022949] text-white">
                            <tr>
                                <th className="p-3 text-left">Preview</th>
                                <th className="p-3 text-left">Title</th>
                                <th className="p-3 text-left">Status</th>
                                <th className="p-3 text-left">Order</th>
                                <th className="p-3 text-left">Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {ads.map((ad) => (
                                <tr key={ad.id} className="border-t">
                                    <td className="p-3">
                                        <img
                                            src={ad.imageUrl}
                                            alt={ad.title}
                                            className="h-24 w-20 rounded-md object-cover"
                                        />
                                    </td>

                                    <td className="p-4 font-bold text-[#022949]">
                                        {ad.title}
                                    </td>
                                    <td className="p-3">
                                        <span
                                        className="
                                            rounded-full
                                            bg-[#022949]
                                            px-4
                                            py-1
                                            text-xs
                                            font-semibold
                                            text-white
                                        "
                                        >
                                        Active
                                        </span>
                                    </td>

                                    <td className="p-3 text-[#022949]">
                                        {ad.displayOrder}
                                    </td>

                                    <td className="p-3">
                                        <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setSelectedAd(ad);
                                                setShowEditModal(true);
                                            }}
                                            className="
                                            rounded
                                            border
                                            border-[#022949]
                                            px-3
                                            py-1
                                            text-[#022949]
                                            hover:bg-[#022949]
                                            hover:text-white
                                            "
                                        >
                                            Edit
                                        </button>

                                        <button
                                            onClick={() => {
                                            setSelectedAd(ad);
                                            setShowDeleteModal(true);
                                        }}
                                            className="rounded border px-3 py-1 text-red-600"
                                        >
                                            Delete
                                        </button>
                                        </div>
                                    </td>
                                </tr>
                                
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Modals */}
                <CreateAdModal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                />

                <EditAdModal
                    ad={selectedAd}
                    isOpen={showEditModal}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedAd(null);
                    }}
                    onUpdated={loadAds}
                />

                <DeleteAdModal
                    ad={selectedAd}
                    isOpen={showDeleteModal}
                    onClose={() => {
                        setShowDeleteModal(false);
                        setSelectedAd(null);
                    }}
                    onDeleted={loadAds}
                />
            </div>
        </AdminLayout>
    );
}