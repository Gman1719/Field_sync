import React from 'react';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import Button from '../../components/ui/Button.tsx';

export interface NotFoundPageProps {
  onBack: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onBack }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4 border border-rose-100 shadow-xs">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-slate-900">Page Not Found</h2>
      <p className="mt-2 text-xs text-slate-500 max-w-sm">
        The requested module or screen does not exist or has been relocated in this deployment.
      </p>
      <div className="mt-6">
        <Button
          variant="outline"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={onBack}
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default NotFoundPage;
