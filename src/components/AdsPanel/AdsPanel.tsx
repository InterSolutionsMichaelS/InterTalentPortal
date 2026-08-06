'use client';

import { useEffect, useState } from 'react';
import type { Ad } from '@/types/ad';
import { trackEvent } from '@/lib/analytics/trackEvent';

type AdsPanelProps = {
  targetAccount: string;
};

export default function AdsPanel({
  targetAccount,
}: AdsPanelProps) {
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

      const filteredAds = data.filter((ad: Ad) => {
        const targets = (ad.targetAccounts ?? []).map(
          (x: string) => x.toLowerCase()
        );

        return (
          targets.includes('all') ||
          targets.includes(targetAccount.toLowerCase())
        );
      });
      
      setAds(filteredAds);
      setCurrent(0);
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
      <a
        href={ad.destinationUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          trackEvent({
            eventType: 'ad_click',
            page: 'Home',
            component: 'AdsPanel',
            value: String(ad.id),
            metadata: {
              title: ad.title,
              destinationUrl: ad.destinationUrl,
              displayOrder: ad.displayOrder,
            },
          });
        }}
      >
        <img
          src={ad.imageUrl}
          alt={ad.title}
          className="h-auto w-full object-cover"
        />
      </a>
    </div>
  );
}