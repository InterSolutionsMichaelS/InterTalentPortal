'use client';

import { useState, useEffect } from 'react';




interface RequestTalentModalProps {
  onClose: () => void;
  location?: string;

  associateId?: string;
  associateName?: string;
  campaign?: 'TalentTuesday' | 'Generic';

  requestMode?: 'ASSOCIATE' | 'GENERIC' | 'UNAVAILABLE';
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  personId?: string;
}

//added logic for contact name email and phone to be pulled through. 1/27/26 MS
export default function RequestTalentModal({
  onClose,
  location,
  associateId,
  associateName,
  personId,
  campaign,
  requestMode,
  contactName,
  contactEmail,
  contactPhone
}: RequestTalentModalProps) {
  // 🔑 Single source of truth for behavior
  const mode: 'ASSOCIATE' | 'GENERIC' | 'UNAVAILABLE' =
    requestMode ?? (associateId ? 'ASSOCIATE' : 'GENERIC');


  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      name: contactName ?? prev.name,
      email: contactEmail ?? prev.email,
      phone: contactPhone ?? prev.phone,
      notes:
  mode === 'ASSOCIATE' && associateName
    ? `Requesting associate: ${associateName}\n\n`
    : '',
    }));
}, [contactName, contactEmail, contactPhone, associateName, mode]);


  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus('idle');

    try {
      const res = await fetch('/api/request-talent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,

          // context
          requestMode: mode,
          campaign: campaign ?? 'Generic',

          associateId: associateId ?? null,
          associateName: associateName ?? null,
          personId: personId ?? null,

          location,
        }),
      });

      if (!res.ok) throw new Error('Request failed');

      setStatus('success');
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      console.error(err);
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          aria-label="Close"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {mode === 'ASSOCIATE' ? 'Request Associate' : 'Request Talent'}
        </h2>

        <p className="text-gray-600 mb-6">
          {mode === 'ASSOCIATE' && associateName && (
            <>
              You’re requesting <strong>{associateName}</strong>. Please confirm
              your details and we’ll route this request to the appropriate
              representative.
            </>
          )}

          {mode === 'UNAVAILABLE' && (
            <>
              No associates are currently available in your area. Please share
              your staffing needs and an InterSolutions representative will
              follow up shortly.
            </>
          )}

          {mode === 'GENERIC' && (
            <>
              Please share your staffing needs and an InterSolutions
              representative will follow up shortly.
            </>
          )}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Your name"
            required
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            className="w-full border rounded-md px-3 py-2 placeholder-gray-550 text-gray-900"
          />

          <input
            type="email"
            placeholder="Your email"
            required
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="w-full border rounded-md px-3 py-2 placeholder-gray-550 text-gray-900"
          />

          <input
            type="tel"
            placeholder="Phone number (optional)"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            className="w-full border rounded-md px-3 py-2 placeholder-gray-550 text-gray-900"
          />

          {/* 🔒 Masked Employee ID (UI only) */}
          {mode === 'ASSOCIATE' && associateName && personId && (
            <p className="text-sm text-gray-500 mb-2">
              Employee ID: ••••••
            </p>
          )}
          <textarea
            placeholder="Tell us what kind of talent you’re looking for"
            required
            rows={4}
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            className="w-full border rounded-md px-3 py-2 placeholder-gray-550 text-gray-900"
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#1e3a5f] hover:bg-[#2d5a8f] text-white py-2 rounded-md font-semibold transition disabled:opacity-50"
          >
            {isSubmitting ? 'Sending…' : 'Submit Request'}
          </button>

          {status === 'success' && (
            <p className="text-green-600 text-center text-sm">
              Request sent successfully. We’ll be in touch shortly.
            </p>
          )}

          {status === 'error' && (
            <p className="text-red-600 text-center text-sm">
              Something went wrong. Please try again.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
