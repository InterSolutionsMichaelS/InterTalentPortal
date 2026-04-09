'use client';

import { useSearchParams } from 'next/navigation';

export default function WelcomeMessage() {
  const searchParams = useSearchParams();

  const contactName = searchParams.get('contactName') || 'Valued Partner';
  const propertyName =
    searchParams.get('department') || 'your local properties';

  const customerName = searchParams.get('customerName');
  const location =
    searchParams.get('location') || 'areas across the U.S';

  return (
    <div className="mb-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
        Hello {contactName},
      </h1>
      <p className="text-gray-600 mt-1">
        Welcome to the InterTalent Portal servicing{' '}
        <span className="font-medium">{propertyName}</span>
        
        {/*conditional Insert */}
        {customerName && (
            <>
                {' '}of <span className="font-medium">{customerName}</span>
            </>
        )}

         {' '}in{' '} <span className="font-medium">{location}</span>.

         {' '}We’re excited to connect you with top talent in your area. 
         
         InterTalent is designed to make finding the right professionals simple and efficient.

         <br></br>
         <br></br>
 
         Start your search today and discover the talent that best fits your team.
      </p>
    </div>
  );
}