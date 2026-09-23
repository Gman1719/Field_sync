import React from 'react';
import { ShieldX, ArrowLeft } from 'lucide-react';
import Button from '../../components/ui/Button.tsx';

export interface UnauthorizedPageProps {
  onBack: () => void;
}

export const UnauthorizedPage: React.FC<UnauthorizedPageProps> = ({ onBack }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-4 border border-amber-100 shadow-xs">
        <ShieldX className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-slate-900">Access Restricted</h2>
      <p className="mt-2 text-xs text-slate-500 max-w-sm">
        You do not possess the necessary role permissions to access this administrative module.
        Contact your regional supervisor or system manager.
      </p>
      <div className="mt-6">
        <Button
          variant="outline"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={onBack}
        >
          Return to Authorized Dashboard
        </Button>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
