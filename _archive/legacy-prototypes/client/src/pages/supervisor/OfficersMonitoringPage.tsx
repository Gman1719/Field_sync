import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  RefreshCw, 
  MapPin, 
  ShieldCheck, 
  UserCheck, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import Card from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import Badge from '../../components/ui/Badge.tsx';
import StatsCard from '../../components/ui/StatsCard.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import UserService from '../../services/userService.ts';
import { User } from '../../types/index.ts';

export const OfficersMonitoringPage: React.FC = () => {
  const { user } = useAuth();
  const [officers, setOfficers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchOfficers = async () => {
    try {
      setIsLoading(true);
      const params: any = { role: 'FIELD_OFFICER' };
      if (user?.role === 'SUPERVISOR' && user.woredaId) {
        params.woredaId = user.woredaId;
      }
      const data = await UserService.getUsers(params);
      setOfficers(data);
    } catch (err: any) {
      console.error('Failed to load field officers:', err);
      setFeedback({ type: 'error', text: 'Could not load field officers directory.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOfficers();
  }, [user]);

  const handleToggleStatus = async (targetOfficer: User) => {
    const nextStatus = !targetOfficer.isActive;
    try {
      setUpdatingId(targetOfficer.id);
      await UserService.toggleUserStatus(targetOfficer.id, nextStatus);
      setOfficers((prev) =>
        prev.map((o) => (o.id === targetOfficer.id ? { ...o, isActive: nextStatus } : o))
      );
      setFeedback({
        type: 'success',
        text: `Officer ${targetOfficer.fullName} is now ${nextStatus ? 'Active' : 'Deactivated'}.`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', text: 'Failed to update officer status.' });
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOfficers = officers.filter((o) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      o.fullName.toLowerCase().includes(q) ||
      o.email.toLowerCase().includes(q) ||
      (o.kebele?.name && o.kebele.name.toLowerCase().includes(q))
    );
  });

  const activeCount = officers.filter((o) => o.isActive).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Field Officers Monitoring
            </h1>
            <Badge variant="info" size="sm">
              {user?.role === 'SUPERVISOR' ? 'Woreda Jurisdiction' : 'National Directory'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Supervise Kebele Field Officers, monitor account statuses, and coordinate field assignments
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOfficers}
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
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="Deployed Officers"
          value={officers.length}
          subtitle="Stationed in jurisdiction"
          icon={<Users className="w-5 h-5" />}
        />
        <StatsCard
          title="Active Accounts"
          value={activeCount}
          subtitle="Authorized for registration"
          icon={<UserCheck className="w-5 h-5" />}
        />
        <StatsCard
          title="Woreda Station"
          value={user?.woredaId ? 'Assigned' : 'Headquarters'}
          subtitle="Supervisory district"
          icon={<ShieldCheck className="w-5 h-5" />}
        />
      </div>

      {/* Directory Table */}
      <Card noPadding className="border-slate-200 shadow-xs">
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by officer name, email, or kebele..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Officer Profile</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Assigned Kebele Station</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    <span>Loading deployed field officers...</span>
                  </td>
                </tr>
              ) : filteredOfficers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No field officers found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      No officers currently assigned to this jurisdiction.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOfficers.map((officer) => (
                  <tr key={officer.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">
                          {officer.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{officer.fullName}</div>
                          <div className="text-[11px] text-slate-500">{officer.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-mono text-slate-800">
                        {officer.phoneNumber || 'None'}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-start gap-1 text-slate-900 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                        <div>
                          <div>{officer.kebele?.name || 'Unassigned Kebele'}</div>
                          <div className="text-[11px] text-slate-400">
                            Woreda: {officer.woreda?.name || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                          officer.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            officer.isActive ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        {officer.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <Button
                        variant={officer.isActive ? 'outline' : 'secondary'}
                        size="sm"
                        disabled={updatingId === officer.id}
                        isLoading={updatingId === officer.id}
                        onClick={() => handleToggleStatus(officer)}
                      >
                        {officer.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default OfficersMonitoringPage;
