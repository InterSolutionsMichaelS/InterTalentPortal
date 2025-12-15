'use client';

import { useState } from 'react';

interface RequestTalentModalProps {
  onClose: () => void;
  location?: string;
}

export default function RequestTalentModal({
  onClose,
  location,
}: RequestTalentModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });

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
          location, // ✅ branch-aware routing
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
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold text-gray-900 mb-4">Request Talent</h2>
        <p className="text-gray-600 mb-6">
          At the moment, all available talent is engaged with other properties.
          Please let us know your staffing needs, and an InterSolutions
          representative will follow up shortly.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* inputs unchanged */}
        </form>
      </div>
    </div>
  );
}
