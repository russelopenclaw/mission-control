'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FiveDayView from '@/components/calendar/FiveDayView';
import MonthlyView from '@/components/calendar/MonthlyView';
import LiveActivitySidebar from '@/components/widgets/LiveActivitySidebar';
import EventModal from '@/components/calendar/EventModal';

interface AgentStatus {
  status: 'working' | 'idle';
  currentTask?: string;
  lastActivity: string;
}

interface CronJob {
  schedule: string;
  command: string;
  description: string;
  nextRun: Date;
}

export default function CalendarPage() {
  const [agents, setAgents] = useState<{ [key: string]: AgentStatus }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);

  // Fetch agent status
  const fetchAgentStatus = useCallback(async () => {
    try {
      const statusRes = await fetch('/api/status');
      const statusData = await statusRes.json();
      setAgents(statusData.agents || {});
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch agent status:', error);
      setIsLoading(false);
    }
  }, []);

  // Fetch cron jobs
  const fetchCronJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/cron');
      const data = await res.json();
      setCronJobs(data.cronJobs || []);
    } catch (error) {
      console.error('Failed to fetch cron jobs:', error);
    }
  }, []);

  useEffect(() => {
    fetchAgentStatus();
    fetchCronJobs();

    // Poll for updates every 30 seconds
    const interval = setInterval(() => {
      fetchAgentStatus();
      fetchCronJobs();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchAgentStatus, fetchCronJobs]);

  const handleAddEvent = async (eventData: any) => {
    try {
      // Convert form data to Google Calendar API format
      const startDateTime = eventData.startTime
        ? `${eventData.date}T${eventData.startTime}:00`
        : eventData.date; // all-day if no time

      const endDateTime = eventData.endTime
        ? `${eventData.date}T${eventData.endTime}:00`
        : eventData.startTime
          ? `${eventData.date}T${eventData.endTime || eventData.startTime}:00` // default 1hr if no end
          : eventData.date; // all-day

      const payload: any = {
        summary: eventData.title,
        start: startDateTime,
        end: endDateTime,
        description: eventData.description,
        location: eventData.location,
        reminders: [{ method: 'popup', minutes: 0 }], // default reminder at event time
      };

      if (!eventData.startTime) {
        payload.allDay = true;
      }

      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setShowEventModal(false);
        // Refresh calendar data
        window.location.reload();
      } else {
        const error = await response.json();
        console.error('Failed to add event:', error);
        alert('Failed to create event: ' + (error.errorMessage || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to add event:', error);
      alert('Failed to create event');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <span className="text-[#888888]">Loading calendar...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="relative">
        {/* Main Calendar Content */}
        <div className="lg:pr-[340px]">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-semibold text-white">Calendar</h1>
            <button
              onClick={() => setShowEventModal(true)}
              className="bg-[#5e6ad2] hover:bg-[#4f5bb5] text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
            >
              + Add Event
            </button>
          </div>

          <div className="space-y-6">
            {/* Section 1: 5-Day Rolling View (40% of viewport) */}
            <section
              className="bg-[#151518] border border-[#27272a] rounded-lg p-3 sm:p-4"
              style={{ minHeight: '30vh' }}
            >
              <h2 className="text-sm font-medium text-[#888888] uppercase tracking-wide mb-4">
                Next 5 Days
              </h2>
              <FiveDayView />
            </section>

            {/* Section 2: Monthly Calendar View (60% of viewport) */}
            <section className="bg-[#151518] border border-[#27272a] rounded-lg p-3 sm:p-4">
              <MonthlyView />
            </section>

            {/* Section 3: Scheduled Jobs (Cron Jobs) */}
            <section className="bg-[#151518] border border-[#27272a] rounded-lg p-3 sm:p-4">
              <h2 className="text-sm font-medium text-[#888888] uppercase tracking-wide mb-4">
                🤖 Scheduled Jobs
              </h2>
              <div className="space-y-2">
                {cronJobs.map((job, index) => (
                  <div
                    key={index}
                    className="bg-[#0d0d0f] border border-[#27272a] rounded-md p-3 flex items-center gap-3"
                  >
                    <span className="text-2xl">⏲️</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-[#e8e8e8]">{job.description}</div>
                      <div className="text-xs text-[#888888] mt-0.5">
                        <span className="font-mono bg-[#1a1a1f] px-1.5 py-0.5 rounded">{job.schedule}</span>
                        <span className="ml-2">Next: {new Date(job.nextRun).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* Live Activity Sidebar - Desktop only */}
        <div className="fixed top-0 right-0 h-screen w-[340px] z-40 hidden lg:block">
          <LiveActivitySidebar agents={agents} />
        </div>
      </div>

      {/* Add Event Modal */}
      <EventModal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        onSubmit={handleAddEvent}
      />
    </DashboardLayout>
  );
}
