import { ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

function findActiveGroupId(navigation, isItemActive) {
  return navigation.find((entry) => (
    entry.type === 'group'
    && (entry.items ?? []).some((item) => isItemActive(item))
  ))?.id ?? null;
}

function AppSidebarSeparator({ id, label = null }) {
  if (!label) {
    return (
      <li
        aria-orientation="horizontal"
        className="mx-2 my-2 border-t border-sidebar-border group-data-[collapsible=icon]:mx-1"
        data-navigation-id={id}
        data-sidebar="separator"
        role="separator"
      />
    );
  }

  return (
    <li
      aria-label={label}
      aria-orientation="horizontal"
      className="my-3 flex items-center gap-2"
      data-navigation-id={id}
      data-sidebar="separator"
      role="separator"
    >
      <span
        aria-hidden="true"
        className="h-px flex-1 bg-sidebar-border group-data-[collapsible=icon]:hidden"
      />
      <span className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground group-data-[collapsible=icon]:sr-only">
        {label}
      </span>
      <span
        aria-hidden="true"
        className="h-px flex-1 bg-sidebar-border group-data-[collapsible=icon]:hidden"
      />
      <span
        aria-hidden="true"
        className="hidden h-px flex-1 bg-sidebar-border group-data-[collapsible=icon]:block"
      />
    </li>
  );
}

function AppSidebarLink({
  getHref,
  getIcon,
  isItemActive,
  item,
  nested = false,
  onNavigate,
}) {
  const Icon = getIcon(item);
  const active = isItemActive(item);
  const link = (
    <NavLink onClick={onNavigate} to={getHref(item)}>
      {Icon && <Icon aria-hidden="true" />}
      <span className={cn(!nested && 'group-data-[collapsible=icon]:hidden')}>
        {item.label}
      </span>
    </NavLink>
  );

  if (nested) {
    return <SidebarMenuSubButton isActive={active} render={link} />;
  }

  return (
    <SidebarMenuButton
      isActive={active}
      render={link}
      tooltip={item.label}
    />
  );
}

function CollapsedSidebarGroup({
  active,
  getHref,
  getIcon,
  group,
  isItemActive,
  onNavigate,
  open,
  setOpen,
}) {
  const Icon = getIcon(group);

  return (
    <SidebarMenuItem>
      <Popover onOpenChange={setOpen} open={open}>
        <SidebarMenuButton
          aria-label={group.label}
          isActive={active}
          render={<PopoverTrigger />}
          tooltip={group.label}
          type="button"
        >
          {Icon && <Icon aria-hidden="true" />}
          <span className="sr-only">{group.label}</span>
        </SidebarMenuButton>
        <PopoverContent align="start" className="w-64" side="right" sideOffset={12}>
          <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </p>
          <SidebarMenu>
            {group.items.map((item) => (
              <SidebarMenuSubItem key={item.id}>
                <AppSidebarLink
                  getHref={getHref}
                  getIcon={getIcon}
                  isItemActive={isItemActive}
                  item={item}
                  nested
                  onNavigate={onNavigate}
                />
              </SidebarMenuSubItem>
            ))}
          </SidebarMenu>
        </PopoverContent>
      </Popover>
    </SidebarMenuItem>
  );
}

function ExpandedSidebarGroup({
  active,
  expanded,
  getHref,
  getIcon,
  group,
  isItemActive,
  onGroupToggle,
  onNavigate,
}) {
  const Icon = getIcon(group);

  return (
    <Collapsible
      onOpenChange={(open) => onGroupToggle(group.id, open)}
      open={expanded}
      render={<SidebarMenuItem />}
    >
      <CollapsibleTrigger
        render={(
          <SidebarMenuButton
            className={cn(active && 'text-sidebar-foreground')}
            type="button"
          />
        )}
      >
        {Icon && <Icon aria-hidden="true" />}
        <span>{group.label}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'ml-auto transition-transform duration-200 motion-reduce:transition-none',
            expanded && 'rotate-180',
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent
        className={cn(
          'h-[var(--collapsible-panel-height)] overflow-hidden opacity-100',
          'transition-[height,opacity] duration-200 ease-out motion-reduce:transition-none',
          'data-[starting-style]:h-0 data-[starting-style]:opacity-0',
          'data-[ending-style]:h-0 data-[ending-style]:opacity-0',
        )}
      >
        <SidebarMenuSub>
          {group.items.map((item) => (
            <SidebarMenuSubItem key={item.id}>
              <AppSidebarLink
                getHref={getHref}
                getIcon={getIcon}
                isItemActive={isItemActive}
                item={item}
                nested
                onNavigate={onNavigate}
              />
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
}

function AppSidebarGroup(props) {
  const { isMobile, state } = useSidebar();
  const collapsed = state === 'collapsed' && !isMobile;
  const active = props.group.items.some((item) => props.isItemActive(item));

  if (collapsed) {
    return (
      <CollapsedSidebarGroup
        {...props}
        active={active}
        open={props.openFlyoutGroupId === props.group.id}
        setOpen={(open) => props.setOpenFlyoutGroupId(open ? props.group.id : null)}
      />
    );
  }

  return <ExpandedSidebarGroup {...props} active={active} />;
}

function AppSidebarNavigation({
  getHref,
  getIcon,
  isItemActive,
  navigation,
  navigationLabel,
  pathname,
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const activeGroupId = useMemo(
    () => findActiveGroupId(navigation, isItemActive),
    [isItemActive, navigation],
  );
  const [openGroupId, setOpenGroupId] = useState(() => activeGroupId);
  const [openFlyoutGroupId, setOpenFlyoutGroupId] = useState(null);

  useEffect(() => {
    setOpenGroupId(activeGroupId);
    setOpenFlyoutGroupId(null);
  }, [activeGroupId, pathname]);

  function handleNavigate() {
    setOpenFlyoutGroupId(null);
    if (isMobile) setOpenMobile(false);
  }

  function toggleGroup(groupId, open) {
    setOpenGroupId(open ? groupId : null);
  }

  return (
    <SidebarContent>
      <nav aria-label={navigationLabel} className="p-3">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((entry) => (
                entry.type === 'separator' ? (
                  <AppSidebarSeparator
                    id={entry.id}
                    key={entry.id}
                    label={entry.label}
                  />
                ) : entry.type === 'group' ? (
                  <AppSidebarGroup
                    expanded={openGroupId === entry.id}
                    getHref={getHref}
                    getIcon={getIcon}
                    group={entry}
                    isItemActive={isItemActive}
                    key={entry.id}
                    onGroupToggle={toggleGroup}
                    onNavigate={handleNavigate}
                    openFlyoutGroupId={openFlyoutGroupId}
                    setOpenFlyoutGroupId={setOpenFlyoutGroupId}
                  />
                ) : (
                  <SidebarMenuItem key={entry.id}>
                    <AppSidebarLink
                      getHref={getHref}
                      getIcon={getIcon}
                      isItemActive={isItemActive}
                      item={entry}
                      onNavigate={handleNavigate}
                    />
                  </SidebarMenuItem>
                )
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </nav>
    </SidebarContent>
  );
}

function AppSidebar({
  eyebrow,
  getHref,
  getIcon,
  isItemActive,
  navigation,
  navigationLabel,
  pathname,
  scope = '',
  title,
}) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 shrink-0 justify-center border-b border-sidebar-border px-3">
        <div className="flex min-w-0 items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="min-w-0 flex-1 overflow-hidden group-data-[collapsible=icon]:hidden">
            {eyebrow && (
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {eyebrow}
              </p>
            )}
            <p className="truncate font-semibold text-sidebar-foreground">{title}</p>
          </div>
          <SidebarTrigger
            className="group-data-[collapsible=icon]:mx-auto"
            scope={scope}
          />
        </div>
      </SidebarHeader>
      <AppSidebarNavigation
        getHref={getHref}
        getIcon={getIcon}
        isItemActive={isItemActive}
        navigation={navigation}
        navigationLabel={navigationLabel}
        pathname={pathname}
      />
    </Sidebar>
  );
}

export {
  AppSidebar,
  AppSidebarNavigation,
  AppSidebarSeparator,
  findActiveGroupId,
};
