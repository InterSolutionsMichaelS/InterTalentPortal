'use client';

import type { Ad } from '@/types/ad';

type DeleteAdModalProps = {
  ad: Ad | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
};

export function DeleteAdModal({
  ad,
  isOpen,
  onClose,
  onDeleted,
}: DeleteAdModalProps) {
  if (!isOpen || !ad) return null;

  const handleDelete = async () => {
    const response = await fetch(
      `/api/admin/ads/${ad.id}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      alert('Failed to delete ad');
      return;
    }

    onDeleted();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">

        <div className="rounded-t-xl bg-[#022949] px-6 py-4">
          <h2 className="text-xl font-bold text-white">
            Delete Ad
          </h2>
        </div>

        <div className="p-6">
          <p className="text-gray-700">
            Are you sure you want to delete:
          </p>

          <p className="mt-2 font-bold text-[#022949]">
            {ad.title}
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t px-6 py-4">

          <button
            onClick={onClose}
            className="rounded-lg border border-gray-400 px-4 py-2"
          >
            Cancel
          </button>

          <button
            onClick={handleDelete}
            className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white"
          >
            Delete
          </button>

        </div>
      </div>
    </div>
  );
}