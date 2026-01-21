import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Tags, Info, Share2 } from 'lucide-react';

import { CategoriesPage } from './admin/CategoriesPage';
import { TagsPage } from './admin/TagsPage';
import { IncidentsPage } from './admin/IncidentsPage';
import { MaintenancesPage } from './admin/MaintenancesPage';
import { IntegrationsPage } from './admin/IntegrationsPage';
import { SubscribersPage } from './admin/SubscribersPage';
import { ApiKeysPage } from './admin/ApiKeysPage';
import { StatusOverridesPage } from './admin/StatusOverridesPage';
import { StatusPagesPage } from './admin/StatusPagesPage';
import { ServicesPage } from './admin/ServicesPage';
import { AddServicePage } from './admin/AddServicePage';
import { ServiceDetailPage } from './admin/ServiceDetailPage';
import { EditServicePage } from './admin/EditServicePage';
import { AnnouncementsPage } from './admin/AnnouncementsPage';
import { EditStatusPagePage } from './admin/EditStatusPagePage';
import { IncidentDetailPage } from './admin/IncidentDetailPage';
import { AboutPage } from './admin/AboutPage';
import { SettingsPage } from './admin/SettingsPage';
import { ThemeToggle } from './ThemeToggle';



export function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path || location.pathname === path + '/';

  return (
    <div className="min-h-screen bg-vulcan-100 dark:bg-vulcan-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-black-pearl-950 border-r border-black-pearl-200 dark:border-divider fixed inset-y-0 left-0 z-40 flex flex-col">
        {/* Logo */}
        <div className="p-6 ">
          <h1 className="text-xl font-bold text-foreground">MEYTRICS</h1>
          <p className="text-xs text-default-500 mt-1">Admin Dashboard</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="px-3 py-2 text-xs font-semibold text-default-400 uppercase tracking-wider">Monitoring</p>
          <Link
            to="/admin"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('/admin') ? 'bg-primary/10 text-primary border-l-4 border-primary' : 'text-default-600 hover:bg-default-100'}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>
            Services
          </Link>
          <Link
            to="/admin/categories"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('/admin/categories') ? 'bg-primary/10 text-primary border-l-4 border-primary' : 'text-default-600 hover:bg-default-100'}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
            Categories
          </Link>
          <Link
            to="/admin/tags"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('/admin/tags') ? 'bg-primary/10 text-primary border-l-4 border-primary' : 'text-default-600 hover:bg-default-100'}`}
          >
            <Tags className="w-5 h-5" />
            Tags
          </Link>
          <Link
            to="/admin/status-pages"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('/admin/status-pages') ? 'bg-primary/10 text-primary border-l-4 border-primary' : 'text-default-600 hover:bg-default-100'}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
            Status Pages
          </Link>

          <p className="px-3 py-2 text-xs font-semibold text-default-400 uppercase tracking-wider mt-6">Alerts</p>
          <Link
            to="/admin/incidents"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('/admin/incidents') ? 'bg-danger/10 text-danger border-l-4 border-danger' : 'text-default-600 hover:bg-default-100'}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Incidents
          </Link>
          <Link
            to="/admin/announcements"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('/admin/announcements') ? 'bg-primary/10 text-primary border-l-4 border-primary' : 'text-default-600 hover:bg-default-100'}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
            Announcements
          </Link>
          <Link
            to="/admin/maintenances"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('/admin/maintenances') ? 'bg-primary/10 text-primary border-l-4 border-primary' : 'text-default-600 hover:bg-default-100'}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Maintenance
          </Link>
          <Link
            to="/admin/status-overrides"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('/admin/status-overrides') ? 'bg-primary/10 text-primary border-l-4 border-primary' : 'text-default-600 hover:bg-default-100'}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            Status Overrides
          </Link>

          <p className="px-3 py-2 text-xs font-semibold text-default-400 uppercase tracking-wider mt-6">Notifications</p>
          <Link
            to="/admin/integrations"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('/admin/integrations') ? 'bg-primary/10 text-primary border-l-4 border-primary' : 'text-default-600 hover:bg-default-100'}`}
          >
            <Share2 className="w-5 h-5" />
            Integrations
          </Link>
          <Link
            to="/admin/subscribers"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('/admin/subscribers') ? 'bg-primary/10 text-primary border-l-4 border-primary' : 'text-default-600 hover:bg-default-100'}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            Subscribers
          </Link>

          <p className="px-3 py-2 text-xs font-semibold text-default-400 uppercase tracking-wider mt-6">System</p>
          <Link
            to="/admin/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('/admin/settings') ? 'bg-primary/10 text-primary border-l-4 border-primary' : 'text-default-600 hover:bg-default-100'}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
            Settings
          </Link>
          <Link
            to="/admin/about"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('/admin/about') ? 'bg-primary/10 text-primary border-l-4 border-primary' : 'text-default-600 hover:bg-default-100'}`}
          >
            <Info className="w-5 h-5" />
            About
          </Link>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-divider space-y-2">
          <ThemeToggle />
          <a
            href="/"
            target="_blank"
            className="flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            View Status Page
          </a>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-default-600 hover:bg-default-100 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        {/* Top Bar */}
        {/* <header className="bg-white dark:bg-black-pearl-950 border-b border-black-pearl-200 dark:border-default-200 sticky top-0 z-30 px-8 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground capitalize">
              {location.pathname === '/admin' ? 'Services' : location.pathname.split('/').pop()?.replace('-', ' ')}
            </h2>
            <span className="text-sm text-default-500">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </header> */}

        {/* Content Area */}
        <div className="p-8">
          <Routes>
            <Route index element={<ServicesPage />} />
            <Route path="/services/new" element={<AddServicePage />} />
            <Route path="/services/:id" element={<ServiceDetailPage />} />
            <Route path="/services/:id/edit" element={<EditServicePage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/tags" element={<TagsPage />} />
            <Route path="incidents" element={<IncidentsPage />} />
            <Route path="incidents/:id" element={<IncidentDetailPage />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="maintenances" element={<MaintenancesPage />} />
            <Route path="integrations" element={<IntegrationsPage />} />
            <Route path="subscribers" element={<SubscribersPage />} />
            <Route path="api-keys" element={<ApiKeysPage />} />
            <Route path="status-overrides" element={<StatusOverridesPage />} />
            <Route path="status-pages" element={<StatusPagesPage />} />
            <Route path="status-pages/:id/edit" element={<EditStatusPagePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="about" element={<AboutPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
