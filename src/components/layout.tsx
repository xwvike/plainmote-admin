import {
  BoxIcon,
  FileTextIcon,
  LanguagesIcon,
  LayoutGridIcon,
  LinkIcon,
  MonitorIcon,
  MoonIcon,
  ScrollTextIcon,
  ServerIcon,
  SunIcon,
  UsersIcon,
} from 'lucide-react'
import { useTheme } from '@/lib/theme'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { LANGUAGES } from '@/i18n'
import { useTargets } from '@/lib/target-context'
import type { Target } from '@/lib/targets'

function ProductionMark({ className }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <span className={`rounded bg-production/12 px-1.5 py-0.5 text-[10.5px] leading-none font-semibold tracking-wide text-production ${className ?? ''}`}>
      {t('nav.production')}
    </span>
  )
}

function hostOf(target: Target) {
  return new URL(target.baseUrl).host
}

/** The product's mark and name; in the collapsed sidebar, the mark alone. */
function Brand() {
  const { t } = useTranslation()
  return (
    <SidebarMenuButton size="lg" asChild className="hover:bg-transparent active:bg-transparent">
      <NavLink to="/overview">
        <img src="/logo.png" alt="" width={32} height={32} className="size-8 shrink-0 rounded-full" />
        <span className="grid min-w-0 leading-tight">
          <span className="truncate text-sm font-semibold">PlainMote</span>
          <span className="truncate text-xs text-muted-foreground">{t('app.console')}</span>
        </span>
      </NavLink>
    </SidebarMenuButton>
  )
}

function NavItem({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  const { pathname } = useLocation()
  const current = pathname === to || pathname.startsWith(`${to}/`)
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={current} tooltip={label}>
        <NavLink to={to}>
          {icon}
          <span>{label}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

/** Top-right: where targets are managed, and the language and theme of the interface. */
function HeaderActions() {
  const { t, i18n } = useTranslation()
  const { theme, dark, setTheme } = useTheme()
  const { pathname } = useLocation()
  // The button shows what is on screen; the menu says where it comes from.
  const ThemeIcon = dark ? MoonIcon : SunIcon
  return (
    <div className="ml-auto flex items-center gap-1">
      <Button variant={pathname === '/environments' ? 'secondary' : 'ghost'} size="sm" asChild>
        <NavLink to="/environments">
          <ServerIcon />
          <span className="hidden sm:inline">{t('nav.targets')}</span>
        </NavLink>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" aria-label={t('nav.language')}>
            <LanguagesIcon />
            <span className="hidden sm:inline">{LANGUAGES.find((l) => l.code === i18n.resolvedLanguage)?.label}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup value={i18n.resolvedLanguage} onValueChange={(code) => void i18n.changeLanguage(code)}>
            {LANGUAGES.map((l) => (
              <DropdownMenuRadioItem key={l.code} value={l.code}>
                {l.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={t('nav.theme')} title={t('nav.theme')}>
            <ThemeIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
            <DropdownMenuRadioItem value="system"><MonitorIcon />{t('nav.themeSystem')}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="light"><SunIcon />{t('nav.themeLight')}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark"><MoonIcon />{t('nav.themeDark')}</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function Layout() {
  const { t } = useTranslation()
  const { active } = useTargets()
  const icon = 'size-4'
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <Brand />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{t('nav.view')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <NavItem to="/overview" icon={<LayoutGridIcon className={icon} />} label={t('nav.overview')} />
                <NavItem to="/users" icon={<UsersIcon className={icon} />} label={t('nav.users')} />
                <NavItem to="/resources" icon={<FileTextIcon className={icon} />} label={t('nav.resources')} />
                <NavItem to="/plans" icon={<BoxIcon className={icon} />} label={t('nav.plans')} />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>{t('nav.act')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <NavItem to="/lookup" icon={<LinkIcon className={icon} />} label={t('nav.lookup')} />
                <NavItem to="/audit" icon={<ScrollTextIcon className={icon} />} label={t('nav.audit')} />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" aria-label={t('nav.toggleSidebar')} />
          {active && (
            <Link
              to="/environments"
              title={t('nav.targets')}
              className="flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <span className="truncate">{active.name}</span>
              <span className="truncate font-mono text-xs">{hostOf(active)}</span>
              {active.production && <ProductionMark />}
            </Link>
          )}
          <HeaderActions />
          {active?.production && <span className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-production/70" aria-hidden />}
        </header>
        <main className="mx-auto grid w-full max-w-6xl content-start gap-4 px-4 py-5 md:px-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
