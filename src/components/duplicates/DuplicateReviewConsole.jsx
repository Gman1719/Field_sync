// src/components/duplicates/DuplicateReviewConsole.jsx
// Enterprise Citizen Duplicate Detection, Side-by-Side Review & Adjudication Console (Phase 8)

import React, { useState, useEffect } from 'react';
import {
  Users, CheckCircle2, AlertTriangle, Search, Filter,
  ArrowRight, ShieldCheck, UserCheck, XCircle, Clock,
  MapPin, Phone, Calendar, RefreshCw, Eye, AlertCircle,
  FileText, Check, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

import { API_BASE } from '../../config/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import StatCard from '../ui/StatCard';
import Modal from '../ui/Modal';
import Textarea from '../ui/Textarea';

export default function DuplicateReviewConsole({ user }) {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ pending: 0, confirmed: 0, approved: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('NEEDS_REVIEW');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Review States
  const [selectedReview, setSelectedReview] = useState(null);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('fieldsync_token');
      if (!token) return;

      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') {
        params.append('status', statusFilter);
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const res = await fetch(`${API_BASE}/duplicates?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setReviews(json.data || []);
          if (json.stats) setStats(json.stats);
        }
      }
    } catch (e) {
      console.error('Failed to fetch duplicate reviews:', e);
      toast.error('Failed to load duplicate review queue');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchReviews();
  };

  // Open modal and initialize notes
  const openReviewModal = (review) => {
    setSelectedReview(review);
    setReviewerNotes(review.notes || '');
  };

  // Submit Adjudication Decision
  const handleResolveDecision = async (decision) => {
    if (!reviewerNotes.trim()) {
      toast.error('Please enter justification notes explaining your adjudication decision');
      return;
    }

    setIsSubmittingDecision(true);
    try {
      const token = localStorage.getItem('fieldsync_token');
      const res = await fetch(`${API_BASE}/duplicates/${selectedReview.id}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          decision,
          notes: reviewerNotes.trim(),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        const decisionText =
          decision === 'APPROVED_AS_DIFFERENT'
            ? 'Approved as Distinct Citizen'
            : 'Confirmed as Duplicate';
        toast.success(`Review Adjudicated: ${decisionText}`);
        setSelectedReview(null);
        setReviewerNotes('');
        await fetchReviews();
      } else {
        toast.error(json.error || 'Failed to resolve duplicate review');
      }
    } catch (e) {
      console.error('Resolve decision error:', e);
      toast.error('Decision submission failed');
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-200 dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1E3A8A] text-white flex items-center justify-center shadow-xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight">
              Citizen Duplicate Detection & Adjudication
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Multi-level identity duplicate review, side-by-side comparison, and official registry adjudication
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchReviews}
            className="text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh Queue
          </Button>
        </div>
      </div>

      {/* Aggregate KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending Adjudication"
          value={stats.pending}
          icon={AlertTriangle}
          color={stats.pending > 0 ? 'amber' : 'blue'}
        />
        <StatCard
          title="Confirmed Duplicates"
          value={stats.confirmed}
          icon={XCircle}
          color="red"
        />
        <StatCard
          title="Approved as Different"
          value={stats.approved}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Total Reviews Audited"
          value={stats.total}
          icon={ShieldCheck}
          color="indigo"
        />
      </div>

      {/* Controls & Filter Bar */}
      <div className="bg-white dark:bg-[#1E293B] p-4 rounded-2xl border border-slate-200 dark:border-[#334155] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
        {/* Status Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'NEEDS_REVIEW', label: 'Pending Review', count: stats.pending },
            { id: 'ALL', label: 'All Reviews', count: stats.total },
            { id: 'APPROVED_AS_DIFFERENT', label: 'Approved Distinct', count: stats.approved },
            { id: 'CONFIRMED_DUPLICATE', label: 'Confirmed Duplicates', count: stats.confirmed },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-colors flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-[#1E3A8A] text-white shadow-xs'
                  : 'bg-slate-50 dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent dark:border-[#334155]'
              }`}
            >
              {tab.label}
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                statusFilter === tab.id ? 'bg-blue-900 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search citizen name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#0F172A] rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); fetchReviews(); }}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
            >
              ×
            </button>
          )}
        </form>
      </div>

      {/* Duplicate Reviews Table Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Duplicate Review Queue</CardTitle>
              <CardDescription className="text-xs">
                Flagged citizen records requiring supervisor identity verification
              </CardDescription>
            </div>
            <span className="text-xs text-slate-400">
              Showing {reviews.length} records
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading duplicate reviews...</div>
          ) : reviews.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 space-y-2">
              <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-semibold text-slate-700 dark:text-slate-200">No duplicate reviews pending in queue.</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">All registered citizen identities have been verified.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-[#334155] text-xs">
              {reviews.map((r) => {
                const candidate = r.candidateCitizen;
                const suspected = r.suspectedDuplicate;

                return (
                  <div
                    key={r.id}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 dark:hover:bg-[#0F172A]/50 transition-colors"
                  >
                    <div className="space-y-1.5 max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-[#F8FAFC] text-sm">
                          {candidate ? candidate.fullName : 'Citizen'}
                        </span>

                        <Badge
                          variant={
                            r.status === 'APPROVED_AS_DIFFERENT'
                              ? 'success'
                              : r.status === 'CONFIRMED_DUPLICATE'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {r.status === 'APPROVED_AS_DIFFERENT'
                            ? 'Approved Distinct'
                            : r.status === 'CONFIRMED_DUPLICATE'
                            ? 'Confirmed Duplicate'
                            : 'Needs Review'}
                        </Badge>

                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Match Reason Callout */}
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-[11px] font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>{r.matchReason}</span>
                      </div>

                      {/* Side-by-side snippet */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300 pt-1">
                        <div className="p-2.5 bg-slate-50 dark:bg-[#0F172A] rounded-lg border border-slate-100 dark:border-[#334155]">
                          <strong className="block text-slate-800 dark:text-slate-200 font-semibold mb-0.5">
                            Candidate (New Registration):
                          </strong>
                          <div>Phone: {candidate?.phoneNumber || 'N/A'}</div>
                          <div>
                            Location: {candidate?.woredaName}, {candidate?.kebeleName} ({candidate?.village || 'Village'})
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Officer: {candidate?.registeredByName || 'Field Officer'}
                          </div>
                        </div>

                        <div className="p-2.5 bg-slate-50 dark:bg-[#0F172A] rounded-lg border border-slate-100 dark:border-[#334155]">
                          <strong className="block text-slate-800 dark:text-slate-200 font-semibold mb-0.5">
                            Suspected Match (Existing Record):
                          </strong>
                          {suspected ? (
                            <>
                              <div>Phone: {suspected.phoneNumber || 'N/A'}</div>
                              <div>
                                Location: {suspected.woredaName}, {suspected.kebeleName} ({suspected.village || 'Village'})
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Officer: {suspected.registeredByName || 'Field Officer'}
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-400 italic">Pre-existing registry entry</span>
                          )}
                        </div>
                      </div>

                      {r.notes && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-1">
                          Reviewer Note: "{r.notes}" {r.reviewerName && `— ${r.reviewerName}`}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant={r.status === 'NEEDS_REVIEW' || r.status === 'POSSIBLE_DUPLICATE' ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => openReviewModal(r)}
                        className="text-xs font-semibold"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1.5" />
                        {r.status === 'NEEDS_REVIEW' || r.status === 'POSSIBLE_DUPLICATE'
                          ? 'Review Side-by-Side'
                          : 'Inspect Details'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ======================================================== */}
      {/* SIDE-BY-SIDE COMPARISON & ADJUDICATION MODAL             */}
      {/* ======================================================== */}
      {selectedReview && (
        <Modal
          isOpen={!!selectedReview}
          onClose={() => setSelectedReview(null)}
          title="Side-by-Side Duplicate Adjudication"
          description={`Review comparison diff and decide if records represent the same or distinct citizens`}
          size="xl"
          footer={
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
              <span className="text-xs text-slate-400 font-mono">
                Review ID: {selectedReview.id?.slice(0, 16)}...
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedReview(null)}
                  disabled={isSubmittingDecision}
                >
                  Cancel
                </Button>

                {/* Decision Actions if Pending */}
                {(selectedReview.status === 'NEEDS_REVIEW' || selectedReview.status === 'POSSIBLE_DUPLICATE') ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleResolveDecision('CONFIRMED_DUPLICATE')}
                      loading={isSubmittingDecision}
                      className="text-red-700 dark:text-red-400 border-red-300 dark:border-red-800/80 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1.5 text-red-600 dark:text-red-400" />
                      Confirm as Duplicate
                    </Button>

                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => handleResolveDecision('APPROVED_AS_DIFFERENT')}
                      loading={isSubmittingDecision}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      Approve as Different Individual
                    </Button>
                  </>
                ) : (
                  <Badge
                    variant={selectedReview.status === 'APPROVED_AS_DIFFERENT' ? 'success' : 'danger'}
                    className="py-1 px-3 text-xs"
                  >
                    {selectedReview.status === 'APPROVED_AS_DIFFERENT' ? 'Approved Distinct' : 'Confirmed Duplicate'}
                  </Badge>
                )}
              </div>
            </div>
          }
        >
          {(() => {
            const cand = selectedReview.candidateCitizen;
            const susp = selectedReview.suspectedDuplicate;

            return (
              <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
                {/* Match Reason Banner */}
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-sm text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Automated Detection Match Reason
                  </div>
                  <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
                    {selectedReview.matchReason}
                  </p>
                </div>

                {/* Two-Column Side-by-Side Comparison Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Column 1: Candidate Record (New) */}
                  <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-200 dark:border-blue-900/40 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-blue-200/80 dark:border-blue-900/60">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-400 block">Candidate Record</span>
                        <h4 className="font-bold text-slate-900 dark:text-[#F8FAFC] text-sm">
                          {cand ? cand.fullName : 'Citizen'}
                        </h4>
                      </div>
                      <Badge variant="primary" className="text-[10px]">
                        New Registration
                      </Badge>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Gender & Age</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {cand?.gender || 'N/A'} • {cand?.age ? `${cand.age} years` : 'Age N/A'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Phone Number</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {cand?.phoneNumber || 'None provided'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Ethiopian Administrative Location</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                          {cand?.regionName} → {cand?.zoneName}
                        </span>
                        <span className="text-slate-600 dark:text-slate-300 text-[11px]">
                          {cand?.woredaName}, {cand?.kebeleName} ({cand?.village || 'Village'})
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Registering Field Officer</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {cand?.registeredByName || 'Field Officer'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Registration Timestamp</span>
                        <span className="font-mono text-slate-600 dark:text-slate-300 text-[11px]">
                          {cand?.registrationTimestamp ? new Date(cand.registrationTimestamp).toLocaleString() : 'N/A'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Client Record UUID</span>
                        <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 break-all">
                          {cand?.clientRecordId}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Suspected Record (Existing) */}
                  <div className="p-4 bg-slate-50 dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-[#334155] space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#334155]">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Suspected Match</span>
                        <h4 className="font-bold text-slate-900 dark:text-[#F8FAFC] text-sm">
                          {susp ? susp.fullName : 'Existing Citizen'}
                        </h4>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        Existing Registry
                      </Badge>
                    </div>

                    {susp ? (
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase">Gender & Age</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {susp.gender || 'N/A'} • {susp.age ? `${susp.age} years` : 'Age N/A'}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase">Phone Number</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {susp.phoneNumber || 'None provided'}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase">Ethiopian Administrative Location</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                            {susp.regionName} → {susp.zoneName}
                          </span>
                          <span className="text-slate-600 dark:text-slate-300 text-[11px]">
                            {susp.woredaName}, {susp.kebeleName} ({susp.village || 'Village'})
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase">Registering Field Officer</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {susp.registeredByName || 'Field Officer'}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase">Registration Timestamp</span>
                          <span className="font-mono text-slate-600 dark:text-slate-300 text-[11px]">
                            {susp.registrationTimestamp ? new Date(susp.registrationTimestamp).toLocaleString() : 'N/A'}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase">Database Record ID</span>
                          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 break-all">
                            {susp.id}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-xs text-slate-400 italic">
                        No direct existing record ID linked.
                      </div>
                    )}
                  </div>
                </div>

                {/* Review Justification Notes */}
                <div className="space-y-1.5 pt-2">
                  <label className="block text-xs font-bold text-slate-900 dark:text-[#F8FAFC] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#1E3A8A] dark:text-blue-400" />
                    Supervisor Justification Notes <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    value={reviewerNotes}
                    onChange={(e) => setReviewerNotes(e.target.value)}
                    placeholder="Enter thorough notes explaining your adjudication (e.g. 'Confirmed both are distinct cousins sharing a household phone' or 'Confirmed duplicate registration recorded during morning and afternoon shifts')..."
                    disabled={
                      selectedReview.status !== 'NEEDS_REVIEW' &&
                      selectedReview.status !== 'POSSIBLE_DUPLICATE'
                    }
                    rows={3}
                    className="text-xs"
                    required
                  />
                  <span className="text-[11px] text-slate-400 block">
                    Notes will be permanently preserved in the audit log and dispatched to the registering field officer.
                  </span>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}
