'use client';

import { useEffect, useState } from 'react';
import type { Ad } from '@/types/ad';


export default function AdsPanel() {
  const [current, setCurrent] = useState(0);
  const [ads, setAds] = useState<Ad[]>([]);

  useEffect(() => {
    loadAds();
  }, []);

  useEffect(() => {
    if (ads.length <= 1) return;

    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % ads.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [ads]);

  const loadAds = async () => {
    try {
        const response = await fetch('/api/admin/ads');

        if (!response.ok) {
        throw new Error('Failed to load ads');
        }

        const data = await response.json();

        setAds(data);
    } catch (error) {
        console.error(error);
    }
  };

  if (ads.length === 0) {
    return null;
  }

  const ad = ads[current];

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <a href={ad.destinationUrl}>
        <img
          src={ad.imageUrl}
          alt={ad.title}
          className="w-full h-auto object-cover"
        />
      </a>

    </div>  
  );
}