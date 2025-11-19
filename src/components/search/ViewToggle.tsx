'use client';

import { useState } from 'react';

type ViewMode = 'grid' | 'list';

interface ViewToggleProps {
  onViewChange: (view: ViewMode) => void;
  initialView?: ViewMode;
}

export default function ViewToggle({
  onViewChange,
  initialView = 'grid',
}: ViewToggleProps) {
  const [view, setView] = useState<ViewMode>(initialView);

  const handleViewChange = (newView: ViewMode) => {
    setView(newView);
    localStorage.setItem('profileViewMode', newView);
    onViewChange(newView);
  };

  return (
    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
      {/* Grid view button */}
      <button
        onClick={() => handleViewChange('grid')}
        className={`p-2 rounded transition-all ${
          view === 'grid'
            ? 'bg-white shadow-sm text-blue-600'
            : 'text-gray-600 hover:text-gray-900'
        }`}
        title="Grid view"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      </button>

      {/* List view button */}
      <button
        onClick={() => handleViewChange('list')}
        className={`p-2 rounded transition-all ${
          view === 'list'
            ? 'bg-white shadow-sm text-blue-600'
            : 'text-gray-600 hover:text-gray-900'
        }`}
        title="List view"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
    </div>
  );
}
