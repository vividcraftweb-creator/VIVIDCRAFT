'use client';

import ApiKeysView from '@/components/dashboard/ApiKeysView';

export default function ApiKeysPage() {
  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-4xl mx-auto">
        <ApiKeysView />
      </div>
    </div>
  );
}
