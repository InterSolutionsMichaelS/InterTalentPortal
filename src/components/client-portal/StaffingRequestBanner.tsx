'use client';

import { useState } from 'react';
import StaffingRequestModal from './StaffingRequestModal';

export default function StaffingRequestBanner() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="mb-6 flex items-center justify-between rounded-lg border border-[#B7E3A1] bg-[#F3FFF0] px-5 py-4">
        <div>
          <h3 className="font-bold text-[#022949]">
            Don&apos;t see the talent you want? We can still help!
          </h3>
          <p className="text-sm text-gray-600">
            Submit a staffing request and our team will follow up.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="rounded-lg bg-[#022949] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Submit a Staffing Request
        </button>
      </div>

      <StaffingRequestModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}