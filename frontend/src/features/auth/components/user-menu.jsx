import {
  Gauge,
  LogOut,
  Settings2,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  useGetCurrentUserQuery,
  useLogoutMutation,
} from '@/features/auth/api/auth-api';
import { useGetCurrentPlatformContextQuery } from '@/features/platform/api/platform-current-context-api';
import { PlatformAccessSummary } from '@/features/platform/components/platform-access-summary';
import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';

const USER_MENU_POPOVER_ID = 'user-menu-popover';

function getInitials(user) {
  const firstInitial = user?.firstName?.trim()?.charAt(0) ?? '';
  const lastInitial = user?.lastName?.trim()?.charAt(0) ?? '';
  const initials = `${firstInitial}${lastInitial}`.toUpperCase();

  return initials || user?.email?.trim()?.charAt(0)?.toUpperCase() || '?';
}

function getLocationPath(location) {
  return `${location.pathname}${location.search ?? ''}${location.hash ?? ''}`;
}

function UserMenu({ contextItems = [] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const { data: user, isLoading } = useGetCurrentUserQuery();
  const { data: platformAccess } = useGetCurrentPlatformContextQuery();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const visibleContextItems = (Array.isArray(contextItems) ? contextItems : [])
    .filter((item) => (
      typeof item?.label === 'string'
      && item.label.trim().length > 0
      && typeof item?.value === 'string'
      && item.value.trim().length > 0
    ));

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search, location.hash]);

  async function handleLogout() {
    setOpen(false);

    try {
      await logout().unwrap();
    } finally {
      navigate('/login', { replace: true });
    }
  }

  function navigateFromMenu(destination, { preserveReturnDestination = false } = {}) {
    setOpen(false);

    if (!preserveReturnDestination) {
      navigate(destination);
      return;
    }

    const accountReturnTo = location.state?.accountReturnTo ?? getLocationPath(location);
    navigate(destination, { state: { accountReturnTo } });
  }

  const displayName = user
    ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
    : 'Compte utilisateur';
  const canOpenPlatformConsole = platformAccess?.status === 'active'
    && platformAccess.permissions?.includes(PLATFORM_PERMISSION.OVERVIEW_READ);
  const isPlatformContext = location.pathname.startsWith('/platform');

  return (
    <div className="relative" ref={rootRef}>
      <Tooltip>
        <TooltipTrigger
          render={(
            <Button
              aria-controls={open ? USER_MENU_POPOVER_ID : undefined}
              aria-expanded={open}
              aria-label={open ? 'Fermer le menu utilisateur' : 'Ouvrir le menu utilisateur'}
              className="rounded-full"
              disabled={isLoading || isLoggingOut}
              onClick={() => setOpen((current) => !current)}
              ref={triggerRef}
              size="icon"
              type="button"
              variant="outline"
            />
          )}
        >
          <span className="text-xs font-semibold" aria-hidden="true">
            {getInitials(user)}
          </span>
        </TooltipTrigger>
        <TooltipContent align="center" side="bottom">
          Voir le compte utilisateur
        </TooltipContent>
      </Tooltip>

      {open && (
        <div
          aria-label="Menu utilisateur"
          className="absolute right-0 z-[var(--layer-dropdown)] mt-2 w-64 rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-lg"
          id={USER_MENU_POPOVER_ID}
          role="group"
        >
          <div className="border-b border-border px-3 py-2">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            {user?.email && (
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            )}
            <PlatformAccessSummary platformAccess={platformAccess} />

            {visibleContextItems.length > 0 && (
              <dl className="mt-2 space-y-1 border-t border-border pt-2">
                {visibleContextItems.map((item) => (
                  <div
                    className="flex items-start justify-between gap-3 text-xs"
                    key={item.label}
                  >
                    <dt className="text-muted-foreground">{item.label}</dt>
                    <dd className="min-w-0 truncate text-right font-medium">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className="py-2">
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => navigateFromMenu('/account/profile', { preserveReturnDestination: true })}
              type="button"
            >
              <UserRound aria-hidden="true" className="size-4" />
              Profil
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => navigateFromMenu('/account/preferences', { preserveReturnDestination: true })}
              type="button"
            >
              <Settings2 aria-hidden="true" className="size-4" />
              Préférences
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => navigateFromMenu('/account/security', { preserveReturnDestination: true })}
              type="button"
            >
              <ShieldCheck aria-hidden="true" className="size-4" />
              Sécurité
            </button>
            {canOpenPlatformConsole && !isPlatformContext && (
              <button
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => navigateFromMenu('/platform/overview')}
                type="button"
              >
                <Gauge aria-hidden="true" className="size-4" />
                Console d’administration
              </button>
            )}
          </div>

          <div className="border-t border-border pt-2">
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={isLoggingOut}
              onClick={handleLogout}
              type="button"
            >
              <LogOut aria-hidden="true" className="size-4" />
              {isLoggingOut ? 'Déconnexion…' : 'Déconnexion'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { USER_MENU_POPOVER_ID, UserMenu, getInitials, getLocationPath };
