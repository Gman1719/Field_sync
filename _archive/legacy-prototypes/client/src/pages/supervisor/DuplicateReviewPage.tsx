import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  AlertTriangle, 
  ArrowRight, 
  User, 
  Calendar, 
  Phone, 
  MapPin, 
  Check, 
  X 
} from 'lucide-react';
import Card, { CardHeader } from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import Badge from '../../components/ui/Badge.tsx';
import DuplicateService, { DuplicateReviewItem, DuplicateReviewStatus } from '../../services/duplicateService.ts';

export const DuplicateReviewPage: React.FC = () => {
  const [reviews, setReviews] = useState<DuplicateReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING_REVIEW');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      const data = await DuplicateService.getDuplicates(statusFilter || undefined);
      setReviews(data);
    } catch (err: any) {
      console.error('Failed to load duplicate reviews:', err);
      setFeedback({ type: 'error', text: 'Failed to fetch duplicate review list.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [statusFilter]);

  const handleResolve = async (id: string, status: DuplicateReviewStatus) => {
    try {
      setResolvingId(id);
      await DuplicateService.resolveDuplicate(
        id,
        status,
        status === 'RESOLVED_AS_VALID'
          ? 'Supervisor verified records are distinct individuals.'
          : 'Supervisor confirmed duplicate submission.'
      );

      setFeedback({
        type: 'success',
        text: `Collision adjudicated successfully as: ${
          status === 'RESOLVED_AS_VALID' ? 'Unique Individual (Approved)' : 'Duplicate (Invalidated)'
        }.`,
      });

      // Remove from active list if pending filter is active
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error('Resolution failed:', err);
      setFeedback({ type: 'error', text: 'Failed to resolve duplicate review.' });
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Duplicate Review Console
            </h1>
            <Badge variant="warning" size="sm">
              Adjudication Desk
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review demographic collisions flagged during ingestion and adjudicate conflicting records
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="PENDING_REVIEW">Pending Review Only</option>
            <option value="CONFIRMED_DUPLICATE">Confirmed Duplicates</option>
            <option value="RESOLVED_AS_VALID">Resolved as Valid</option>
            <option value="">All Reviews</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchReviews}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-lg text-xs flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Review Items List */}
      {isLoading ? (
        <Card className="p-12 text-center text-slate-400">
          <RefreshCw className="w-7 h-7 animate-spin mx-auto text-emerald-600 mb-2" />
          <p className="text-xs font-semibold text-slate-600">Loading flagged demographic collisions...</p>
        </Card>
      ) : reviews.length === 0 ? (
        <Card className="p-12 text-center text-slate-400">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
          <h3 className="text-base font-bold text-slate-800">No Pending Duplicate Collisions</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            All citizen demographic submissions in your jurisdiction are clean and verified.
          </p>
        </Card>
      ) : (
        reviews.map((rev) => {
          const isCurrentResolving = resolvingId === rev.id;

          return (
            <Card key={rev.id} className="p-5 border-amber-200/80 shadow-xs space-y-4">
              {/* Collision Alert Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-amber-100 text-amber-700">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Demographic Collision Detected
                    </h3>
                    <p className="text-xs text-amber-700 font-medium">{rev.matchReason}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      rev.status === 'PENDING_REVIEW'
                        ? 'warning'
                        : rev.status === 'RESOLVED_AS_VALID'
                        ? 'success'
                        : 'danger'
                    }
                    size="sm"
                  >
                    {rev.status.replace('_', ' ')}
                  </Badge>
                  <span className="text-[11px] text-slate-400">
                    Flagged: {new Date(rev.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Side-by-Side Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Column 1: Ingested Record */}
                <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200/70 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                      Record A: Ingested Citizen
                    </span>
                    <Badge variant="purple" size="sm">
                      New Ingestion
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-800">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Full Name:</span>
                      <strong className="text-slate-900 text-sm">{rev.citizen.fullName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Date of Birth &amp; Gender:</span>
                      <span>
                        {rev.citizen.dateOfBirth.split('T')[0]} &bull; {rev.citizen.gender}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Phone Contact:</span>
                      <span className="font-mono">{rev.citizen.phoneNumber || 'None'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Residential Address:</span>
                      <span>{rev.citizen.address}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Station Placement:</span>
                      <span className="font-medium text-emerald-800">
                        {rev.citizen.woreda?.name} &bull; {rev.citizen.kebele?.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Submitted By Officer:</span>
                      <span>{rev.citizen.registeredBy?.fullName || 'Field Officer'}</span>
                    </div>
                  </div>
                </div>

                {/* Column 2: Existing Record */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Record B: Existing Citizen on File
                    </span>
                    <Badge variant="default" size="sm">
                      Existing Record
                    </Badge>
                  </div>

                  {rev.suspectedDuplicate ? (
                    <div className="space-y-1.5 text-xs text-slate-800">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Full Name:</span>
                        <strong className="text-slate-900 text-sm">
                          {rev.suspectedDuplicate.fullName}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Date of Birth &amp; Gender:</span>
                        <span>
                          {rev.suspectedDuplicate.dateOfBirth.split('T')[0]} &bull;{' '}
                          {rev.suspectedDuplicate.gender}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Phone Contact:</span>
                        <span className="font-mono">
                          {rev.suspectedDuplicate.phoneNumber || 'None'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Residential Address:</span>
                        <span>{rev.suspectedDuplicate.address}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Station Placement:</span>
                        <span className="font-medium text-slate-800">
                          {rev.suspectedDuplicate.woreda?.name} &bull;{' '}
                          {rev.suspectedDuplicate.kebele?.name}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Registered By:</span>
                        <span>{rev.suspectedDuplicate.registeredBy?.fullName || 'Field Officer'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      Existing record metadata unavailable.
                    </div>
                  )}
                </div>
              </div>

              {/* Resolution Action Bar */}
              {rev.status === 'PENDING_REVIEW' && (
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <span className="text-xs text-slate-500">
                    Supervisor Decision: Verify if these are two different citizens sharing similar names or an accidental duplicate registration.
                  </span>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isCurrentResolving}
                      onClick={() => handleResolve(rev.id, 'CONFIRMED_DUPLICATE')}
                      className="text-rose-700 hover:bg-rose-50 hover:border-rose-300"
                      leftIcon={<XCircle className="w-4 h-4 text-rose-600" />}
                    >
                      Confirm as Duplicate (Invalidate)
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={isCurrentResolving}
                      onClick={() => handleResolve(rev.id, 'RESOLVED_AS_VALID')}
                      leftIcon={<CheckCircle2 className="w-4 h-4" />}
                    >
                      Approve as Unique Individual
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
};

export default DuplicateReviewPage;
