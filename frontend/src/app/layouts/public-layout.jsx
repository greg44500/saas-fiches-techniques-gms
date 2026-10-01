import { Outlet } from 'react-router';

import { APPLICATION_IDENTITY } from '@/app/application-identity';

function PublicLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center px-6 py-4">
          <span className="font-semibold">{APPLICATION_IDENTITY.shortName}</span>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

export { PublicLayout };
