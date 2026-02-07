import { Loader2 } from 'lucide-react';

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export function Loading({ message = 'Loading...', fullScreen = false }: LoadingProps) {
  const content = (
    <div className="flex flex-col items-center justify-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-gray-900" aria-hidden="true" />
      <p className="text-sm text-gray-600">{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-live="polite">
        {content}
      </div>
    );
  }

  return (
    <div className="flex min-h-[200px] items-center justify-center" role="status" aria-live="polite">
      {content}
    </div>
  );
}

export function PageLoading() {
  return <Loading fullScreen />;
}

export function SectionLoading({ message }: { message?: string }) {
  return <Loading message={message} />;
}
