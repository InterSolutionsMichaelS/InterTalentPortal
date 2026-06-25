import type { AnalyticsEvent } from '@/lib/db/interface';

export function trackEvent(
  event: AnalyticsEvent
): void {
  fetch('/api/analytics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  }).catch((error) => {
    console.error(
      'Analytics tracking failed:',
      error
    );
  });
}