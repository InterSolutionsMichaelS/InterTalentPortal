import { Suspense } from 'react';
import RequestTalentClient from './request-talent-client';

export default function RequestTalentPage() {
  return (
    <Suspense fallback={null}>
      <RequestTalentClient />
    </Suspense>
  );
}
