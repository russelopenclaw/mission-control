'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

interface JobListing {
  title: string;
  company: string;
  location: string;
  postedAgo: string;
  url: string;
  type: 'remote' | 'onsite' | 'hybrid';
}

interface JobApplication {
  id: string;
  title: string;
  company: string;
  location: string | null;
  url: string | null;
  status: 'interested' | 'applied' | 'phone_screen' | 'interview' | 'offer' | 'rejected' | 'withdrawn';
  source: string | null;
  applied_date: string | null;
  notes: string | null;
  salary_range: string | null;
  next_step: string | null;
  next_step_date: string | null;
  updated_at: string;
}

const statusOrder = [
  'offer',           // Best outcome
  'interview',       // Active - advanced
  'phone_screen',    // Active - early
  'applied',         // Active - initial
  'interested',      // Pipeline start
  'withdrawn',       // Lost - user chose
  'rejected',        // Lost - company chose
];

const statusColors: Record<string, string> = {
  interested: 'bg-gray-700 text-gray-200',
  applied: 'bg-blue-700 text-blue-100',
  phone_screen: 'bg-yellow-700 text-yellow-100',
  interview: 'bg-purple-700 text-purple-100',
  offer: 'bg-green-700 text-green-100',
  rejected: 'bg-red-900 text-red-200',
  withdrawn: 'bg-gray-800 text-gray-400',
};

const statusLabels: Record<string, string> = {
  interested: 'Interested',
  applied: 'Applied',
  phone_screen: 'Phone Screen',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export default function JobsPage() {
  const [activeTab, setActiveTab] = useState<'search' | 'applications'>('search');
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'remote' | 'onsite'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [jobsRes, appsRes] = await Promise.all([
        fetch('/api/jobs'),
        fetch('/api/jobs/applications'),
      ]);
      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        setJobs(jobsData.jobs || []);
      }
      if (appsRes.ok) {
        const appsData = await appsRes.json();
        setApplications(appsData.applications || []);
      }
    } catch (e) {
      console.error('Failed to load:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(id: string, newStatus: JobApplication['status']) {
    try {
      const res = await fetch(`/api/jobs/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      loadData();
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this application?')) return;
    try {
      const res = await fetch(`/api/jobs/applications/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      loadData();
    } catch (e) {
      console.error('Failed to delete:', e);
    }
  }

  const filteredJobs = filter === 'all' ? jobs : jobs.filter(j => j.type === filter);
  const groupedApps = applications.reduce((acc, job) => {
    if (!acc[job.status]) acc[job.status] = [];
    acc[job.status].push(job);
    return acc;
  }, {} as Record<string, JobApplication[]>);

  const typeBadge = (type: string) => {
    const colors: Record<string, string> = {
      remote: 'bg-[#22c55e]/20 text-[#86efac] border-[#22c55e]/30',
      onsite: 'bg-[#3b82f6]/20 text-[#93c5fd] border-[#3b82f6]/30',
      hybrid: 'bg-[#f59e0b]/20 text-[#fde68a] border-[#f59e0b]/30',
    };
    return colors[type] || colors.onsite;
  };

  return (
    <DashboardLayout>
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">💼 Jobs</h1>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-[#27272a]">
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'search'
                ? 'border-[#5e6ad2] text-white'
                : 'border-transparent text-[#71717a] hover:text-[#a1a1a1]'
            }`}
          >
            🔍 Search
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'applications'
                ? 'border-[#5e6ad2] text-white'
                : 'border-transparent text-[#71717a] hover:text-[#a1a1a1]'
            }`}
          >
            📋 My Applications
            {applications.length > 0 && (
              <span className="ml-2 text-xs bg-[#5e6ad2] text-white px-1.5 py-0.5 rounded-full">
                {applications.length}
              </span>
            )}
          </button>
          {activeTab === 'applications' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="ml-auto text-sm text-[#5e6ad2] hover:text-[#6d79e0] font-medium"
            >
              + Add Application
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="text-[#888888]">Loading...</span>
          </div>
        ) : activeTab === 'search' ? (
          /* Search Tab */
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-xs text-[#888888]">
                  Senior Java Software Engineer — Kansas + Remote US • Full-time
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-[#151518] border border-[#27272a] rounded-md overflow-hidden">
                  {(['all', 'remote', 'onsite'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`text-sm px-3 py-2 transition-colors capitalize ${
                        filter === f ? 'bg-[#5e6ad2] text-white' : 'text-[#888888] hover:text-white'
                      }`}
                    >
                      {f === 'all' ? `All (${jobs.length})` : `${f} (${jobs.filter(j => j.type === f).length})`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick search links */}
            <div className="bg-[#151518] border border-[#27272a] rounded-lg p-4 mb-6">
              <h3 className="text-xs text-[#888888] uppercase tracking-wide mb-3">Search LinkedIn directly</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Kansas Java', url: 'https://www.linkedin.com/jobs/search/?keywords=Senior+Software+Engineer+Java&location=Kansas%2C+United+States&f_JT=F' },
                  { label: 'Kansas .NET', url: 'https://www.linkedin.com/jobs/search/?keywords=Senior+Software+Engineer+.NET&location=Kansas%2C+United+States&f_JT=F' },
                  { label: 'Remote Java', url: 'https://www.linkedin.com/jobs/search/?keywords=Senior+Java+Developer&location=United+States&f_JT=F&f_WT=2' },
                  { label: 'Remote .NET', url: 'https://www.linkedin.com/jobs/search/?keywords=Senior+.NET+Developer&location=United+States&f_JT=F&f_WT=2' },
                ].map(s => (
                  <a
                    key={s.label}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#5e6ad2] hover:text-[#7c8aff] transition-colors"
                  >
                    🔗 {s.label}
                  </a>
                ))}
              </div>
            </div>

            {filteredJobs.length === 0 ? (
              <div className="text-center py-20 text-[#888888]">No jobs found</div>
            ) : (
              <div className="space-y-3">
                {filteredJobs.map((job, i) => (
                  <a
                    key={i}
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-[#151518] border border-[#27272a] rounded-lg p-4 hover:border-[#3f3f46] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white truncate">{job.title}</h3>
                        <p className="text-xs text-[#a1a1a1] mt-0.5">{job.company}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${typeBadge(job.type)}`}>
                          {job.type}
                        </span>
                        <span className="text-[10px] text-[#71717a] whitespace-nowrap">{job.postedAgo}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-[#525252]">📍 {job.location}</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Applications Tab */
          <>
            {applications.length === 0 ? (
              <div className="bg-[#151518] border border-[#27272a] rounded-lg p-8 text-center">
                <div className="text-[#71717a] mb-4">No job applications tracked yet</div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="text-[#5e6ad2] hover:text-[#6d79e0] text-sm font-medium"
                >
                  Add your first application →
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {statusOrder.map(status => {
                  const apps = groupedApps[status] || [];
                  if (apps.length === 0) return null;
                  return (
                    <div key={status}>
                      <div className="flex items-center gap-2 mb-3">
                        <h2 className="text-sm font-medium text-[#888888] uppercase tracking-wide">
                          {statusLabels[status]}
                        </h2>
                        <span className="text-xs text-[#525252] bg-[#151518] px-2 py-0.5 rounded">
                          {apps.length}
                        </span>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {apps.map(app => (
                          <div key={app.id} className="bg-[#151518] border border-[#27272a] rounded-lg p-4 hover:border-[#3f3f46] transition-colors">
                            <div className="flex items-start justify-between mb-2">
                              <div className="min-w-0 flex-1">
                                <h3 className="text-white font-medium truncate">{app.title}</h3>
                                <div className="text-sm text-[#71717a]">{app.company}</div>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ml-2 ${statusColors[app.status]}`}>
                                {statusLabels[app.status]}
                              </span>
                            </div>
                            {app.location && <div className="text-xs text-[#525252] mb-1">📍 {app.location}</div>}
                            {(app.applied_date || app.updated_at) && (
                              <div className="text-xs text-[#525252] mb-2">
                                📅 Applied {new Date(app.applied_date || app.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                            )}
                            {app.url && (
                              <a href={app.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#5e6ad2] hover:underline block mb-3 truncate">
                                View posting →
                              </a>
                            )}
                            {app.next_step && (
                              <div className="text-xs text-[#a1a1a1] bg-[#0d0d0f] border border-[#27272a] rounded p-2 mb-3">
                                <span className="text-[#5e6ad2] font-medium">Next: </span>{app.next_step}
                                {app.next_step_date && (
                                  <span className="text-[#525252] ml-2">({new Date(app.next_step_date).toLocaleDateString()})</span>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <select
                                value={app.status}
                                onChange={(e) => handleStatusChange(app.id, e.target.value as JobApplication['status'])}
                                className="text-xs bg-[#0d0d0f] border border-[#27272a] rounded px-2 py-1 text-[#a1a1a1] focus:border-[#5e6ad2] focus:outline-none"
                              >
                                {Object.entries(statusLabels).map(([key]) => (
                                  <option key={key} value={key}>{statusLabels[key]}</option>
                                ))}
                              </select>
                              <button onClick={() => setShowAddModal(true)} className="text-xs text-[#525252] hover:text-[#71717a]">
                                📝 Notes
                              </button>
                              <button onClick={() => handleDelete(app.id)} className="text-xs text-[#525252] hover:text-red-400 ml-auto">
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Application Modal */}
      {showAddModal && (
        <AddApplicationModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => { loadData(); setShowAddModal(false); }}
        />
      )}
    </DashboardLayout>
  );
}

function AddApplicationModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [url, setUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    company: '',
    location: '',
    url: '',
    source: '',
    salary_range: '',
    notes: '',
    status: 'interested' as JobApplication['status'],
  });

  async function handleExtract() {
    if (!url.trim()) return;
    setExtracting(true);
    setError('');
    try {
      const res = await fetch('/api/jobs/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (data.extracted) {
        setForm(prev => ({
          ...prev,
          url: url.trim(),
          title: data.extracted.title || prev.title,
          company: data.extracted.company || prev.company,
          location: data.extracted.location || prev.location,
          source: data.extracted.source || prev.source,
          notes: data.extracted.description ? data.extracted.description.slice(0, 500) : prev.notes,
        }));
      }
    } catch {
      setError('Failed to extract info from URL');
    } finally {
      setExtracting(false);
    }
  }

  async function handleSave() {
    if (!form.title || !form.company) {
      setError('Title and Company are required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/jobs/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to save');
      onSaved();
    } catch {
      setError('Failed to save application');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#151518] border border-[#27272a] rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Add Application</h2>
          <button onClick={onClose} className="text-[#71717a] hover:text-white text-xl">×</button>
        </div>

        {/* URL extraction */}
        <div className="mb-4">
          <label className="text-xs text-[#888888] uppercase tracking-wide block mb-1">Paste job URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://www.linkedin.com/jobs/view/..."
              className="flex-1 bg-[#0d0d0f] border border-[#27272a] rounded px-3 py-2 text-sm text-white focus:border-[#5e6ad2] focus:outline-none"
            />
            <button
              onClick={handleExtract}
              disabled={extracting || !url.trim()}
              className="bg-[#5e6ad2] hover:bg-[#6d79e0] disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
            >
              {extracting ? 'Extracting...' : 'Extract'}
            </button>
          </div>
          <p className="text-[10px] text-[#525252] mt-1">Paste a LinkedIn or job posting URL to auto-fill the fields</p>
        </div>

        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

        {/* Form fields */}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#888888] block mb-1">Title *</label>
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-[#0d0d0f] border border-[#27272a] rounded px-3 py-2 text-sm text-white focus:border-[#5e6ad2] focus:outline-none" placeholder="Senior Software Engineer" />
          </div>
          <div>
            <label className="text-xs text-[#888888] block mb-1">Company *</label>
            <input value={form.company} onChange={e => setForm({...form, company: e.target.value})} className="w-full bg-[#0d0d0f] border border-[#27272a] rounded px-3 py-2 text-sm text-white focus:border-[#5e6ad2] focus:outline-none" placeholder="Garmin" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#888888] block mb-1">Location</label>
              <input value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full bg-[#0d0d0f] border border-[#27272a] rounded px-3 py-2 text-sm text-white focus:border-[#5e6ad2] focus:outline-none" placeholder="Olathe, KS" />
            </div>
            <div>
              <label className="text-xs text-[#888888] block mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value as JobApplication['status']})} className="w-full bg-[#0d0d0f] border border-[#27272a] rounded px-3 py-2 text-sm text-white focus:border-[#5e6ad2] focus:outline-none">
                {Object.entries(statusLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-[#888888] block mb-1">Salary Range</label>
            <input value={form.salary_range} onChange={e => setForm({...form, salary_range: e.target.value})} className="w-full bg-[#0d0d0f] border border-[#27272a] rounded px-3 py-2 text-sm text-white focus:border-[#5e6ad2] focus:outline-none" placeholder="$120k-$150k" />
          </div>
          <div>
            <label className="text-xs text-[#888888] block mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full bg-[#0d0d0f] border border-[#27272a] rounded px-3 py-2 text-sm text-white focus:border-[#5e6ad2] focus:outline-none h-20 resize-none" placeholder="Any notes about this position..." />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#71717a] hover:text-white border border-[#27272a] rounded transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.title || !form.company} className="bg-[#5e6ad2] hover:bg-[#6d79e0] disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium transition-colors">
            {saving ? 'Saving...' : 'Save Application'}
          </button>
        </div>
      </div>
    </div>
  );
}
