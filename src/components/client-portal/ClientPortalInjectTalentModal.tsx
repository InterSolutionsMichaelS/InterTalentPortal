'use client';

//Created for the Request Talent Modal on 12/12/25 by MS 
import { useEffect, useState } from 'react';
import ClientPortalRequestTalentModal from '@/components/client-portal/ClientPortalRequestTalentModal';
import { trackEvent } from '@/lib/analytics/trackEvent';




interface ClientPortalInjectTalentModalProps {
  children: React.ReactNode;
  location?: string;
}


export default function ClientPortalInjectTalentModal({ children, location, }: ClientPortalInjectTalentModalProps) {
  const [open, setOpen] = useState(false);
  const [associateId, setAssociateId] = useState<string | undefined>(location);
  
  // 🔑 Deep-link support from email
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idFromUrl = params.get('associateId');

    if (idFromUrl) {
      setAssociateId(idFromUrl);
      setOpen(true);
    }
  }, []);


  return (
    <>
      <div className="text-center mb-6">
        <button
          onClick={() => {

            trackEvent({
              eventType: 'talent_request_open',
              page: 'Home',
              component: 'InjectTalentModal',
              value: location ?? 'unknown',
            });

            setOpen(true);
          }}
          className="
            inline-flex
            items-center
            justify-center
            w-full
            max-w-md
            bg-[var(--color-primary)] 
            hover:opacity-90
            text-white
            text-lg
            font-bold
            px-10
            py-4
            rounded-xl
            shadow-lg
            hover:shadow-xl
            transition
          "
        >
          Request Talent
        </button>
      </div>

      {children}

      {open && (
        <ClientPortalRequestTalentModal
          location={location}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
  
}
