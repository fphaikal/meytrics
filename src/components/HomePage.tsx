import { useQuery } from '@tanstack/react-query';
import { getStatusPages } from '../lib/api';
import type { StatusPage } from '../lib/types';

export function HomePage() {
  const { data: pages = [], isLoading } = useQuery<StatusPage[]>({
    queryKey: ['publicStatusPages'],
    queryFn: getStatusPages,
  });

  const publicPages = pages.filter(p => p.is_public);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            MEYTRICS
          </h1>
          <p className="text-xl text-slate-300 mb-8">
            Real-time service monitoring and status tracking
          </p>
        </div>

        {/* Status Pages Grid */}
        {publicPages.length === 0 ? (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-semibold text-white mb-2">No Status Pages Yet</h2>
            <p className="text-slate-300 mb-6">
              Create your first status page to start monitoring your services.
            </p>
            <a
              href="/admin/status-pages"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Create Status Page
            </a>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {publicPages.map((page) => (
              <a
                key={page.id}
                href={`/status/${page.slug}`}
                className="group bg-white/10 backdrop-blur hover:bg-white/20 rounded-xl p-6 transition-all border border-white/10 hover:border-white/30"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: page.hero_bg_color || '#3b82f6' }}
                  >
                    📊
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white group-hover:text-blue-300 transition-colors">
                      {page.name}
                    </h3>
                    <p className="text-slate-400 text-sm mt-1">
                      {page.subtitle || 'View service status'}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs text-slate-500 font-mono">
                        /status/{page.slug}
                      </span>
                      {page.is_default && (
                        <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                  <svg
                    className="w-5 h-5 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-12 text-center">
          <a
            href="/admin"
            className="text-slate-400 hover:text-white text-sm transition-colors"
          >
            Admin Dashboard →
          </a>
        </div>
      </div>
    </div>
  );
}
