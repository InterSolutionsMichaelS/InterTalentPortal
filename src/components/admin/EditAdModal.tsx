'use client';

import { useEffect, useState } from 'react';
import type { Ad } from '@/types/ad';

type EditAdModalProps = {
  ad: Ad | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
};

export function EditAdModal({
  ad,
  isOpen,
  onClose,
  onUpdated,
}: EditAdModalProps) {


  const [title, setTitle] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [displayOrder, setDisplayOrder] = useState(1);
  const [isActive, setIsActive] = useState(true);

  const [availableAccounts, setAvailableAccounts] = useState<string[]>([]);
  const specialAccounts = [
    'all',
    'base',
  ];
  const [targetAccounts, setTargetAccounts] = useState<string[]>([]);



  useEffect(() => {
    if (!ad) return;

    setTitle(ad.title);
    setDestinationUrl(ad.destinationUrl);
    setDisplayOrder(ad.displayOrder);
    setIsActive(ad.isActive);
    setTargetAccounts(ad.targetAccounts);
  }, [ad]);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    const response = await fetch(
      '/api/admin/clients/slugs'
    );

    const result = await response.json();

    setAvailableAccounts(
      result.data.map(
        (client: { slug: string }) => client.slug
      )
    );
  };

  const handleSave = async () => {
    if (!ad) return;

    const response = await fetch(`/api/admin/ads/${ad.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        destinationUrl,
        displayOrder,
        isActive,
        targetAccounts,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error(error);
      alert('Failed to update ad');
      return;
    }

    onUpdated();
    onClose();
  };

  if (!isOpen || !ad) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-xl rounded-xl bg-white shadow-xl">
        <div className="rounded-t-xl bg-[#022949] px-6 py-4">
          <h2 className="text-xl font-bold text-white">
            Edit Ad
          </h2>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#022949]">
              Ad Title
            </label>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-400 px-3 py-2 text-[#022949]"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#022949]">
              Destination URL
            </label>

            <input
              type="text"
              value={destinationUrl}
              onChange={(e) =>
                setDestinationUrl(e.target.value)
              }
              className="w-full rounded-lg border border-gray-400 px-3 py-2 text-[#022949]"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#022949]">
              Display Order
            </label>

            <input
              type="number"
              value={displayOrder}
              onChange={(e) =>
                setDisplayOrder(Number(e.target.value))
              }
              className="w-32 rounded-lg border border-gray-400 px-3 py-2 text-[#022949]"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) =>
                setIsActive(e.target.checked)
              }
            />

            <label className="font-medium text-[#022949]">
              Active
            </label>
          </div>
          <div>
            <div className="border-t pt-4">
            <label className="mb-3 block text-sm font-semibold text-[#022949]">
              Show Ad For
            </label>

            <div className="grid grid-cols-2 gap-2">
              {specialAccounts.map((account) => (
                <label
                  key={account}
                  className="flex items-center gap-2 text-[#022949]"
                >
                  <input
                    type="checkbox"
                    checked={targetAccounts.includes(account)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setTargetAccounts([
                          ...targetAccounts,
                          account,
                        ]);
                      } else {
                        setTargetAccounts(
                          targetAccounts.filter(
                            (a) => a !== account
                          )
                        );
                      }
                    }}
                  />

                  <span className="capitalize">
                    {account}
                  </span>
                </label>
              ))}
              {availableAccounts.map((account) => (
                <label
                  key={account}
                  className="flex items-center gap-2 text-[#022949]"
                >
                  <input
                    type="checkbox"
                    checked={targetAccounts.includes(account)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setTargetAccounts([
                          ...targetAccounts,
                          account,
                        ]);
                      } else {
                        setTargetAccounts(
                          targetAccounts.filter(
                            (a) => a !== account
                          )
                        );
                      }
                    }}
                  />

                  <span>{account}</span>
                </label>
              ))}
            </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-400 px-4 py-2 text-[#022949]"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-[#FF30AF] px-4 py-2 font-semibold text-white"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}