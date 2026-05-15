'use client';

import React from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import MorningBriefing from '@/components/widgets/MorningBriefing';

export default function BriefingPage() {
  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <MorningBriefing />
      </div>
    </DashboardLayout>
  );
}
