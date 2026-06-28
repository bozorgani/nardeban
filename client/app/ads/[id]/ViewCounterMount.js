'use client';

import dynamic from 'next/dynamic';

const ViewCounter = dynamic(() => import('./ViewCounter'), { ssr: false });

export default function ViewCounterMount({ adId }) {
  return <ViewCounter adId={adId} />;
}
