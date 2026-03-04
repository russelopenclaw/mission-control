'use client';

import React, { useState } from 'react';

interface NewEventData {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'personal' | 'meeting';
  description: string;
  location: string;
}

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: NewEventData) => void;
}

export default function EventModal({ isOpen, onClose, onSubmit }: EventModalProps) {
  const [formData, setFormData] = useState<NewEventData>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    type: 'personal',
    description: '',
    location: ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    
    onSubmit(formData);
    setFormData({
      title: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '',
      endTime: '',
      type: 'personal',
      description: '',
      location: ''
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#151518] border border-[#27272a] rounded-lg max-w-md w-full p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Add New Event</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-[#888888] uppercase tracking-wide mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-[#0d0d0f] border border-[#27272a] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5e6ad2]"
              placeholder="Event title"
              autoFocus
              required
            />
          </div>
          
          <div>
            <label className="block text-xs text-[#888888] uppercase tracking-wide mb-1">
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'personal' | 'meeting' })}
              className="w-full bg-[#0d0d0f] border border-[#27272a] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5e6ad2]"
            >
              <option value="personal">Personal</option>
              <option value="meeting">Meeting</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs text-[#888888] uppercase tracking-wide mb-1">
              Date *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full bg-[#0d0d0f] border border-[#27272a] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5e6ad2]"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#888888] uppercase tracking-wide mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full bg-[#0d0d0f] border border-[#27272a] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5e6ad2]"
              />
            </div>
            
            <div>
              <label className="block text-xs text-[#888888] uppercase tracking-wide mb-1">
                End Time
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full bg-[#0d0d0f] border border-[#27272a] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5e6ad2]"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs text-[#888888] uppercase tracking-wide mb-1">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full bg-[#0d0d0f] border border-[#27272a] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5e6ad2]"
              placeholder="Where is it?"
            />
          </div>
          
          <div>
            <label className="block text-xs text-[#888888] uppercase tracking-wide mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-[#0d0d0f] border border-[#27272a] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5e6ad2] resize-none"
              rows={3}
              placeholder="Optional details"
            />
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-[#27272a] hover:bg-[#3f3f46] text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#5e6ad2] hover:bg-[#4f5bb5] text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
            >
              Add Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
