'use client';

//Created for the Request Talent Modal on 12/12/25 by MS 
import { useState } from 'react';
import RequestTalentModal from '@/components/modals/RequestTalentModal';

interface InjectTalentModalProps {
  children: React.ReactNode;
  location?: string;
}

export default function InjectTalentModal({ children, location, }: InjectTalentModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Existing EmptyState UI */}
      {children}

      {/* New Request Talent button under it */}
      <div className="text-center mt-1">
        <button
          onClick={() => setOpen(true)}
          className="inline-block bg-[#1e3a5f] hover:bg-[#2d5a8f] text-white px-6 py-3 rounded-md font-semibold transition"
        >
          Request Talent
        </button>
      </div>

      {open && <RequestTalentModal 
      location={location} 
      onClose={() => setOpen(false)} />}
    </>
  );
}
