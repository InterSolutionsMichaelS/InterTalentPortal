'use client';

import { useState } from 'react';
import ProfileCard from '@/components/profiles/ProfileCard';
import ViewToggle from './ViewToggle';
import type { Profile } from '@/lib/db/supabase';

interface ProfileResultsProps {
  profiles: Profile[];
}

export default function ProfileResults({ profiles }: ProfileResultsProps) {
  // Initialize with lazy function to read localStorage once
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      const savedView = localStorage.getItem('profileViewMode') as
        | 'grid'
        | 'list'
        | null;
      return savedView || 'grid';
    }
    return 'grid';
  });

  const handleViewChange = (view: 'grid' | 'list') => {
    setViewMode(view);
    localStorage.setItem('profileViewMode', view);
  };

  return (
    <>
      {/* View Toggle */}
      <div className="flex justify-end mb-4">
        <ViewToggle onViewChange={handleViewChange} initialView={viewMode} />
      </div>

      {/* Profile Grid or List */}
      <div
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 gap-6'
            : 'space-y-4'
        }
      >
        {profiles.map((profile) => (
          <ProfileCard key={profile.id} profile={profile} variant={viewMode} />
        ))}
      </div>
    </>
  );
}
