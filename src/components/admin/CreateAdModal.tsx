'use client';

import { useEffect, useState } from 'react';

type CreateAdModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function CreateAdModal({
  isOpen,
  onClose,
}: CreateAdModalProps) {
  const [title, setTitle] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [displayOrder, setDisplayOrder] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [availableAccounts, setAvailableAccounts] = useState<string[]>([]);
  const [targetAccounts, setTargetAccounts] = useState<string[]>([]);
  
  const specialAccounts = [
    'all',
    'base',
  ];

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    const response = await fetch('/api/admin/clients/slugs');

    const result = await response.json();

    setAvailableAccounts(
      result.data.map(
        (client: { slug: string }) => client.slug
      )
    );

    console.log(
      result.data.map(
        (client: { slug: string }) => client.slug
      )
    );
  };

  if (!isOpen) return null;

  const canSave =
    title.trim() !== '' &&
    destinationUrl.trim() !== '' &&
    imageFile !== null &&
    targetAccounts.length > 0;

  const handleSave = async () => {

    if (!imageFile) return;

    const arrayBuffer = await imageFile.arrayBuffer();

    const imageBytes = Array.from(
    new Uint8Array(arrayBuffer)
    );

    const response = await fetch('/api/admin/ads', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        },
        body: JSON.stringify({
        title,
        destinationUrl,
        displayOrder,
        isActive,

        imageData: imageBytes,
        imageMimeType: imageFile.type,
        targetAccounts,
        }),
    });

    if (!response.ok) {
        const error = await response.json();

        console.error(error);

        alert('Failed to create ad');

        return;
    }

    console.log('Ad created successfully');

    handleClose();
    window.location.reload();
    };

  const resetForm = () => {
    setTitle('');
    setDestinationUrl('');
    setDisplayOrder(1);
    setIsActive(true);
    setImageFile(null);
    setTargetAccounts([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="
          flex
          max-h-[90vh]
          w-full
          max-w-xl
          flex-col
          rounded-xl
          bg-white
          shadow-xl
        "
      >

        {/* Header */}
        <div className="rounded-t-xl bg-[#022949] px-6 py-4">
          <h2 className="text-xl font-bold text-white">
            Upload New Ad
          </h2>
        </div>

        {/* Body */}
        <div
          className="
            flex-1
            space-y-5
            overflow-y-auto
            p-6
          "
        >

          {/* Title */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#022949]">
              Ad Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Direct Hire Campaign"
              className="w-full rounded-lg border border-gray-400  px-3 py-2 placeholder:text-gray-600 focus:border-[#FF30AF] focus:outline-none text-[#022949]"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#022949]">
                Ad Image
            </label>

            <label
                htmlFor="ad-upload"
                className="
                flex
                cursor-pointer
                items-center
                justify-between
                rounded-lg
                border
                border-gray-400
                px-4
                py-3
                hover:border-[#FF30AF]
                "
            >
                <span className="text-gray-600">
                {imageFile ? imageFile.name : 'Choose an ad image'}
                </span>

                <span className="rounded bg-[#022949] px-3 py-1 text-sm text-white">
                Browse
                </span>
            </label>

            <input
                id="ad-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) =>
                setImageFile(e.target.files?.[0] ?? null)
                }
            />

            <p className="mt-1 text-xs text-gray-500">
                Recommended size: 1200 × 1400 px
            </p>

              {imageFile && (
                <div className="mt-3">
                    <img
                    src={URL.createObjectURL(imageFile)}
                    alt="Preview"
                    className="max-h-56 rounded-lg border border-gray-300 src-[#022949]"
                    />
                </div>
              )}
          </div>

          {/* Destination URL */}
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
              placeholder="/direct-hire"
              className="w-full rounded-lg border border-gray-400 px-3 py-2 placeholder:text-gray-600 focus:border-[#FF30AF] focus:outline-none text-[#022949]"
            />
            <p className="mt-1 text-xs text-gray-500">
                Example: /direct-hire
            </p>
          </div>

          {/* Display Order */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#022949]">
              Display Order
            </label>

            <input
                type="number"
                min={1}
                value={displayOrder}
                onChange={(e) =>
                    setDisplayOrder(Number(e.target.value))
                }
                className="
                    w-32
                    rounded-lg
                    border
                    border-gray-400
                    px-3
                    py-2
                    focus:border-[#FF30AF]
                    focus:outline-none
                    text-[#022949]
                "
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#022949]">
              Visible To
            </label>

            <div
              className="
                max-h-48
                overflow-y-auto
                rounded-lg
                border
                border-gray-300
                p-3
              "
            >
              <div className="grid grid-cols-2 gap-2">
              {[...specialAccounts, ...availableAccounts].map((account) => (
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

          {/* Active */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) =>
                setIsActive(e.target.checked)
              }
              className="h-4 w-4"
            />

            <label className="font-medium text-[#022949]">
              Active
            </label>
          </div>

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t px-6 py-4">

          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-gray-400 px-4 py-2"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className={`
                rounded-lg px-4 py-2 font-semibold text-white
                ${
                canSave
                    ? 'bg-[#FF30AF] hover:opacity-90'
                    : 'cursor-not-allowed bg-gray-300'
                }
            `}
            >
            Save Ad
          </button>

        </div>
      </div>
    </div>
  );
}