import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  getPublicStatusPage,
  getStatusPageServices,
  getServiceDailyPings,
  getActiveIncidents,
  getPublicMaintenances,
  getPublicSettings,
  getPublicStatusPageSections,
  type StatusPageSection
} from '../lib/api';
import type { Service, DailyPing, Incident, Maintenance, Settings } from '../lib/types';
import { Header } from './Header';
import { ServiceCard } from './ServiceCard';
import { IncidentBanner } from './IncidentBanner';
import { MaintenanceBanner } from './MaintenanceBanner';



export function StatusPage() {
  const { slug } = useParams<{ slug: string }>();
  const pageSlug = slug || 'default';

  const [alertSound, setAlertSound] = useState(false);
  const [nextUpdate, setNextUpdate] = useState(30);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

  // Fetch status page configuration
  const { data: statusPage, isLoading: pageLoading, error: pageError } = useQuery({
    queryKey: ['statusPage', pageSlug],
    queryFn: () => getPublicStatusPage(pageSlug),
    retry: false,
  });

  // Fetch settings for time formatting and refresh interval
  const { data: settings = {} } = useQuery<Partial<Settings>>({
    queryKey: ['settings'],
    queryFn: getPublicSettings,
  });

  // Fetch services for this status page
  const refreshIntervalMs = parseInt(settings?.refresh_interval || '30', 10) * 1000;

  const { data: services = [], dataUpdatedAt } = useQuery<Service[]>({
    queryKey: ['statusPageServices', pageSlug],
    queryFn: () => getStatusPageServices(pageSlug),
    enabled: !!statusPage,
    refetchInterval: refreshIntervalMs,
  });

  // Fetch sections structure
  const { data: sections = [] } = useQuery<StatusPageSection[]>({
    queryKey: ['statusPageSections', pageSlug],
    queryFn: () => getPublicStatusPageSections(pageSlug),
    enabled: !!statusPage,
  });

  // Fetch active incidents
  const { data: incidents = [] } = useQuery<Incident[]>({
    queryKey: ['incidents'],
    queryFn: getActiveIncidents,
    refetchInterval: 60000,
  });

  // Fetch maintenances
  const { data: maintenances = [] } = useQuery<Maintenance[]>({
    queryKey: ['maintenances'],
    queryFn: getPublicMaintenances,
    refetchInterval: 60000,
  });

  // Fetch daily pings for all services
  const { data: dailyPings = {} } = useQuery<Record<number, DailyPing[]>>({
    queryKey: ['dailyPings', services.map(s => s.id).join(',')],
    queryFn: async () => {
      const pingsData: Record<number, DailyPing[]> = {};
      await Promise.all(
        services.map(async (service: Service) => {
          const pings = await getServiceDailyPings(service.id, 90);
          pingsData[service.id] = pings;
        })
      );
      return pingsData;
    },
    enabled: services.length > 0,
    refetchInterval: 30000,
  });

  const refreshIntervalSec = parseInt(settings?.refresh_interval || '30', 10);
  const lastUpdate = new Date(dataUpdatedAt || Date.now());

  // Force light mode as requested
  useEffect(() => {
    setTheme('light');
  }, []);

  // Apply visual theme class
  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (t: 'light' | 'dark' | 'system') => {
      if (t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme(theme);
  }, [theme]);

  // Dynamic metadata based on status page settings

  // Dynamic metadata based on status page settings
  useEffect(() => {
    if (!statusPage) return;

    // Update document title
    const pageTitle = statusPage.title || statusPage.name || 'Status Page';
    document.title = pageTitle;

    // Update meta description
    const metaDescription = document.getElementById('meta-description') as HTMLMetaElement;
    if (metaDescription) {
      metaDescription.content = statusPage.meta_description || `Monitor the status of ${statusPage.name} services`;
    }

    // Update favicon
    const faviconLink = document.getElementById('favicon-link') as HTMLLinkElement;
    if (faviconLink && statusPage.favicon_url) {
      faviconLink.href = statusPage.favicon_url;
    }

    // Update OpenGraph tags
    const ogTitle = document.getElementById('og-title') as HTMLMetaElement;
    if (ogTitle) {
      ogTitle.content = pageTitle;
    }

    const ogDescription = document.getElementById('og-description') as HTMLMetaElement;
    if (ogDescription) {
      ogDescription.content = statusPage.meta_description || `Monitor the status of ${statusPage.name} services`;
    }

    const ogImage = document.getElementById('og-image') as HTMLMetaElement;
    if (ogImage && statusPage.og_image_url) {
      ogImage.content = statusPage.og_image_url;
    }

    // Update Twitter tags
    const twitterTitle = document.getElementById('twitter-title') as HTMLMetaElement;
    if (twitterTitle) {
      twitterTitle.content = pageTitle;
    }

    const twitterDescription = document.getElementById('twitter-description') as HTMLMetaElement;
    if (twitterDescription) {
      twitterDescription.content = statusPage.meta_description || `Monitor the status of ${statusPage.name} services`;
    }

    // Cleanup: reset to defaults when component unmounts
    return () => {
      document.title = 'MEYTRICS - Status Page';
      const metaDesc = document.getElementById('meta-description') as HTMLMetaElement;
      if (metaDesc) metaDesc.content = 'Monitor the status of all our services in real-time';
      const faviconEl = document.getElementById('favicon-link') as HTMLLinkElement;
      if (faviconEl) faviconEl.href = '/favicon.ico';
    };
  }, [statusPage]);

  // Countdown timer
  useEffect(() => {
    setNextUpdate(refreshIntervalSec);
    const timer = setInterval(() => {
      setNextUpdate((prev) => (prev > 0 ? prev - 1 : refreshIntervalSec));
    }, 1000);

    return () => clearInterval(timer);
  }, [refreshIntervalSec, dataUpdatedAt]);



  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const allOperational = services.every((s) => s.current_status === 'up' || s.current_status === null);
  const hasDownServices = services.some((s) => s.current_status === 'down');
  const hasActiveIncidents = incidents.length > 0;

  // Helper to find full service data
  const getFullService = (serviceId: number) => services.find(s => s.id === serviceId);

  // Loading state
  if (pageLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading status page...</p>
        </div>
      </div>
    );
  }

  // No status page found
  if (pageError || !statusPage) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">📊</div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">No Status Page Found</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {slug ? `The status page "${slug}" does not exist.` : 'No default status page has been configured yet.'}
          </p>
          <a
            href="/admin/status-pages"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Create Status Page
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors ${statusPage.bg_pattern && statusPage.bg_pattern !== 'none' ? `bg-pattern-${statusPage.bg_pattern}` : ''}`}
      style={{
        backgroundColor: statusPage.bg_color || undefined,
        color: statusPage.text_color || undefined,
        // @ts-ignore
        '--status-primary': statusPage.primary_color || '#3b82f6',
        '--status-secondary': statusPage.secondary_color || '#64748b',
        '--status-success': statusPage.success_color || '#22c55e',
        '--status-warning': statusPage.warning_color || '#eab308',
        '--status-error': statusPage.error_color || '#ef4444',
      }}
    >
      {/* Dark header area that extends down for overlap effect */}
      <div style={{ backgroundColor: statusPage.hero_bg_color }} className="pt-8">
        <Header
          title={statusPage.navbar_title || statusPage.name}
          subtitle={statusPage.subtitle}
          logoUrl={statusPage.logo_url}
          lastUpdate={lastUpdate}
          nextUpdate={nextUpdate}
        />
        {/* Extra padding for the overlap effect */}
        <div className="h-18"></div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 -mt-14">
        {/* Overall Status Card - overlapping the dark header */}
        <div className="bg-white dark:bg-background rounded-lg shadow-md p-6 md:p-12 mb-6" style={{ backgroundColor: statusPage.bg_color === '#f8fafc' ? undefined : '#ffffff' }}>
          <div className="flex flex-row items-center gap-4 text-left">
            {/* Pulsing status indicator */}
            <div className="relative shrink-0">
              <div
                className={`w-6 h-6 rounded-full ${hasActiveIncidents || hasDownServices
                  ? 'bg-[var(--status-error)]'
                  : allOperational
                    ? 'bg-[var(--status-success)]'
                    : 'bg-[var(--status-warning)]'
                  }`}
                style={{
                  backgroundColor: hasActiveIncidents || hasDownServices
                    ? 'var(--status-error)'
                    : allOperational
                      ? 'var(--status-success)'
                      : 'var(--status-warning)'
                }}
              />
              {/* Pulse ring animation */}
              <div
                className={`absolute inset-0 w-6 h-6 rounded-full animate-ping opacity-75`}
                style={{
                  animationDuration: '2s',
                  backgroundColor: hasActiveIncidents || hasDownServices
                    ? 'var(--status-error)'
                    : allOperational
                      ? 'var(--status-success)'
                      : 'var(--status-warning)'
                }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-2">
              <span className="text-xl md:text-2xl font-bold" style={{ color: statusPage.text_color }}>All systems </span>
              <span
                className="text-xl md:text-2xl font-medium"
                style={{
                  color: hasActiveIncidents || hasDownServices
                    ? 'var(--status-error)'
                    : allOperational
                      ? 'var(--status-success)'
                      : 'var(--status-warning)'
                }}
              >
                {hasActiveIncidents ? 'Experiencing Issues' : hasDownServices ? 'Partially Down' : allOperational ? 'Operational' : 'Partially Degraded'}
              </span>
            </div>
          </div>
        </div>

        {/* Incident Banner */}
        <IncidentBanner incidents={incidents} />

        {/* Maintenance Banner */}
        <MaintenanceBanner maintenances={maintenances} />

        {/* Services Section */}
        <h2 className="text-lg font-semibold mb-4" style={{ color: statusPage.text_color }}>Services</h2>

        {services.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 p-8 text-center text-slate-500 dark:text-slate-400">
            No services configured yet.
          </div>
        ) : (
          <div className="space-y-8">
            {/* Render sections if available */}
            {sections.length > 0 ? (
              sections.map((section) => (
                <div key={section.id || 'uncategorized'}>
                  {section.name && (
                    <h3 className="text-md font-medium text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-2" style={{ color: 'var(--status-secondary)' }}>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--status-primary)' }}></span>
                      {section.name}
                    </h3>
                  )}
                  <div className="space-y-3">
                    {section.services?.map((secService) => {
                      const fullService = getFullService(secService.service_id);
                      if (!fullService) return null;

                      return (
                        <ServiceCard
                          key={fullService.id}
                          service={fullService}
                          dailyPings={dailyPings[fullService.id] || []}
                          settings={settings}
                          monitorStyle={(statusPage.monitor_style as 'bars' | 'dots' | 'list') || 'bars'}
                          statusColors={{
                            success: statusPage.success_color,
                            warning: statusPage.warning_color,
                            error: statusPage.error_color,
                            primary: statusPage.primary_color,
                            secondary: statusPage.secondary_color,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              /* Fallback if no sections defined but services exist (e.g. legacy/default) */
              <div className="space-y-3">
                {services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    dailyPings={dailyPings[service.id] || []}
                    settings={settings}
                    monitorStyle={(statusPage.monitor_style as 'bars' | 'dots' | 'list') || 'bars'}
                    statusColors={{
                      success: statusPage.success_color,
                      warning: statusPage.warning_color,
                      error: statusPage.error_color,
                      primary: statusPage.primary_color,
                      secondary: statusPage.secondary_color,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer - matches UptimeRobot */}
      <footer
        className="border-t border-slate-200 dark:border-slate-700 py-4 mt-8"
        style={{ backgroundColor: statusPage.footer_bg_color || undefined }}
      >
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between text-sm gap-4 md:gap-0">
          <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 justify-center md:justify-start" style={{ color: statusPage.secondary_color }}>
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-1.5 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              Fullscreen
            </button>
            <button
              onClick={() => setAlertSound(!alertSound)}
              className="flex items-center gap-1.5 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 10v4a1 1 0 001 1h1l4 4V5l-4 4h-1a1 1 0 00-1 1z" />
              </svg>
              Alert: {alertSound ? 'on' : 'off'}
            </button>
          </div>


          <div className="flex items-center gap-4 justify-center md:justify-end" style={{ color: statusPage.secondary_color }}>
            <a href="/admin" className="hover:opacity-80 transition-opacity">
              Admin
            </a>
            <span className="opacity-50">|</span>
            <span>
              Status page by <span className="font-medium" style={{ color: statusPage.text_color }}>MEYTRICS</span>
            </span>
          </div>


        </div>
      </footer>
    </div>
  );
}
