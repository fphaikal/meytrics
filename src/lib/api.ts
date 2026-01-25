const API_BASE = '';

export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });

    if (response.status === 401 && endpoint !== '/api/auth/login') {
        localStorage.removeItem('token');
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
        throw new Error('Session expired');
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || 'Request failed');
    }

    return response.json();
}

// Auth
export const login = (username: string, password: string) =>
    fetchAPI('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });

export const getMe = () => fetchAPI('/api/auth/me');

export const changePassword = (currentPassword: string, newPassword: string) =>
    fetchAPI('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });

// Services (public)
export const getPublicServices = () => fetchAPI('/api/public/services');

// Services (admin)
export const getServices = () => fetchAPI('/api/services');
import type { ServiceUpdate } from './types';

export const createService = (data: ServiceUpdate) =>
    fetchAPI('/api/services', { method: 'POST', body: JSON.stringify(data) });
export const updateService = (id: number, data: Partial<{ name: string; url: string; type: string; interval: number; notify_down: boolean; paused: boolean; category_id: number | null }>) =>
    fetchAPI(`/api/services/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteService = (id: number) =>
    fetchAPI(`/api/services/${id}`, { method: 'DELETE' });

// Bulk Service Actions
export const bulkUpdateCategory = (serviceIds: number[], categoryId: number | null) =>
    fetchAPI('/api/services/bulk/category', { method: 'POST', body: JSON.stringify({ service_ids: serviceIds, category_id: categoryId }) });
export const bulkPauseServices = (serviceIds: number[]) =>
    fetchAPI('/api/services/bulk/pause', { method: 'POST', body: JSON.stringify({ service_ids: serviceIds }) });
export const bulkStartServices = (serviceIds: number[]) =>
    fetchAPI('/api/services/bulk/start', { method: 'POST', body: JSON.stringify({ service_ids: serviceIds }) });
export const bulkResetStats = (serviceIds: number[]) =>
    fetchAPI('/api/services/bulk/reset-stats', { method: 'POST', body: JSON.stringify({ service_ids: serviceIds }) });
export const bulkDeleteServices = (serviceIds: number[]) =>
    fetchAPI('/api/services/bulk', { method: 'DELETE', body: JSON.stringify({ service_ids: serviceIds }) });

// Tags
export const getTags = () => fetchAPI('/api/tags');
export const createTag = (data: { name: string; color?: string }) =>
    fetchAPI('/api/tags', { method: 'POST', body: JSON.stringify(data) });
export const updateTag = (id: number, data: { name?: string; color?: string }) =>
    fetchAPI(`/api/tags/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTag = (id: number) =>
    fetchAPI(`/api/tags/${id}`, { method: 'DELETE' });
export const getServiceTags = (serviceId: number) =>
    fetchAPI(`/api/tags/service/${serviceId}`);
export const bulkUpdateTags = (serviceIds: number[], tagIds: number[], action: 'add' | 'remove') =>
    fetchAPI('/api/tags/services/bulk', { method: 'POST', body: JSON.stringify({ service_ids: serviceIds, tag_ids: tagIds, action }) });

// Service Incidents
export const getServiceIncidents = (serviceId: number) =>
    fetchAPI(`/api/services/${serviceId}/incidents`);

export const getGlobalServiceIncidents = () =>
    fetchAPI('/api/services/incidents/history');

export const getServiceIncidentById = (id: number) =>
    fetchAPI(`/api/services/incidents/${id}`);

// Pings
export const getServicePings = (serviceId: number, days = 30) =>
    fetchAPI(`/api/public/pings/${serviceId}?days=${days}`);
export const getServiceDailyPings = (serviceId: number, days = 90) =>
    fetchAPI(`/api/public/pings/${serviceId}/daily?days=${days}`);
export const getAggregatedPings = (serviceId: number, params: { hours?: number; days?: number }) => {
    const queryParams = new URLSearchParams();
    if (params.hours) queryParams.append('hours', params.hours.toString());
    if (params.days) queryParams.append('days', params.days.toString());
    return fetchAPI(`/api/public/pings/${serviceId}/aggregated?${queryParams.toString()}`);
};

export const getServicePingSummary = (serviceId: number, params: { hours?: number; days?: number }) => {
    const queryParams = new URLSearchParams();
    if (params.hours) queryParams.append('hours', params.hours.toString());
    if (params.days) queryParams.append('days', params.days.toString());
    return fetchAPI(`/api/public/pings/${serviceId}/summary?${queryParams.toString()}`);
};

// Settings
export const getSettings = () => fetchAPI('/api/settings');
export const updateSettings = (data: Record<string, string>) =>
    fetchAPI('/api/settings', { method: 'PUT', body: JSON.stringify(data) });
export const getPublicSettings = () => fetchAPI('/api/settings/public');
export const testSmtp = (email: string, config?: Record<string, string>) =>
    fetchAPI('/api/settings/test-smtp', { method: 'POST', body: JSON.stringify({ email, config }) });

// Categories
export const getPublicCategories = () => fetchAPI('/api/public/categories/public');
export const getCategories = () => fetchAPI('/api/categories');
export const createCategory = (data: { name: string; description?: string; sort_order?: number }) =>
    fetchAPI('/api/categories', { method: 'POST', body: JSON.stringify(data) });
export const updateCategory = (id: number, data: { name: string; description?: string; sort_order?: number }) =>
    fetchAPI(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCategory = (id: number) =>
    fetchAPI(`/api/categories/${id}`, { method: 'DELETE' });

// Incidents
export const getPublicIncidents = () => fetchAPI('/api/public/incidents/public');
export const getActiveIncidents = () => fetchAPI('/api/public/incidents/public/active');
export const getIncidents = () => fetchAPI('/api/incidents');
export const getIncident = (id: number) => fetchAPI(`/api/incidents/${id}`);
export const createIncident = (data: { title: string; description?: string; status?: string; severity?: string; service_ids?: number[] }) =>
    fetchAPI('/api/incidents', { method: 'POST', body: JSON.stringify(data) });
export const updateIncident = (id: number, data: { title?: string; description?: string; status?: string; severity?: string; service_ids?: number[] }) =>
    fetchAPI(`/api/incidents/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const addIncidentUpdate = (id: number, data: { message: string; status?: string }) =>
    fetchAPI(`/api/incidents/${id}/updates`, { method: 'POST', body: JSON.stringify(data) });
export const deleteIncident = (id: number) =>
    fetchAPI(`/api/incidents/${id}`, { method: 'DELETE' });

// Maintenances
export const getPublicMaintenances = () => fetchAPI('/api/public/maintenances/public');
export const getMaintenances = () => fetchAPI('/api/maintenances');
export const createMaintenance = (data: { title: string; description?: string; start_time: string; end_time: string; service_ids?: number[] }) =>
    fetchAPI('/api/maintenances', { method: 'POST', body: JSON.stringify(data) });
export const updateMaintenance = (id: number, data: { title?: string; description?: string; start_time?: string; end_time?: string; service_ids?: number[] }) =>
    fetchAPI(`/api/maintenances/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteMaintenance = (id: number) =>
    fetchAPI(`/api/maintenances/${id}`, { method: 'DELETE' });

// Webhooks
export const getWebhooks = () => fetchAPI('/api/webhooks');
export const createWebhook = (data: { name: string; url: string; type?: string; events?: string[]; headers?: Record<string, string>; enabled?: boolean }) =>
    fetchAPI('/api/webhooks', { method: 'POST', body: JSON.stringify(data) });
export const updateWebhook = (id: number, data: { name?: string; url?: string; type?: string; events?: string[]; headers?: Record<string, string>; enabled?: boolean }) =>
    fetchAPI(`/api/webhooks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteWebhook = (id: number) =>
    fetchAPI(`/api/webhooks/${id}`, { method: 'DELETE' });
export const testWebhook = (id: number) =>
    fetchAPI(`/api/webhooks/${id}/test`, { method: 'POST' });

// Alert History
export const getAlertHistory = (limit = 100) => fetchAPI(`/api/webhooks/history?limit=${limit}`);

// Subscribers
export const getSubscribers = () => fetchAPI('/api/admin/subscribers');
export const deleteSubscriber = (id: number) =>
    fetchAPI(`/api/admin/subscribers/${id}`, { method: 'DELETE' });
export const subscribe = (email: string) =>
    fetchAPI('/api/subscribers/subscribe', { method: 'POST', body: JSON.stringify({ email }) });
export const verifySubscription = (token: string) =>
    fetchAPI(`/api/subscribers/verify/${token}`);
export const unsubscribe = (email: string, token?: string) =>
    fetchAPI('/api/subscribers/unsubscribe', { method: 'POST', body: JSON.stringify({ email, token }) });

// API Keys
export const getApiKeys = () => fetchAPI('/api/admin/api-keys');
export const createApiKey = (data: { name: string; permissions?: string[] }) =>
    fetchAPI('/api/admin/api-keys', { method: 'POST', body: JSON.stringify(data) });
export const updateApiKey = (id: number, data: { name?: string; permissions?: string[]; enabled?: boolean }) =>
    fetchAPI(`/api/admin/api-keys/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteApiKey = (id: number) =>
    fetchAPI(`/api/admin/api-keys/${id}`, { method: 'DELETE' });

// Status Overrides
export const getStatusOverrides = () => fetchAPI('/api/admin/status-overrides');
export const getActiveStatusOverrides = () => fetchAPI('/api/public/status-overrides/active');
export const createStatusOverride = (data: { service_id: number; status: string; reason?: string; start_time: string; end_time: string }) =>
    fetchAPI('/api/admin/status-overrides', { method: 'POST', body: JSON.stringify(data) });
export const updateStatusOverride = (id: number, data: { service_id?: number; status?: string; reason?: string; start_time?: string; end_time?: string }) =>
    fetchAPI(`/api/admin/status-overrides/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteStatusOverride = (id: number) =>
    fetchAPI(`/api/admin/status-overrides/${id}`, { method: 'DELETE' });

// Status Pages
export const getStatusPages = () => fetchAPI('/api/admin/status-pages');
export const getStatusPageById = (id: number) => fetchAPI(`/api/admin/status-pages/${id}`);
export const createStatusPage = (data: { slug: string; name: string; title?: string; subtitle?: string; logo_url?: string; favicon_url?: string; hero_bg_color?: string; theme_mode?: string; bg_pattern?: string; monitor_style?: string; meta_description?: string; og_image_url?: string; custom_css?: string; is_default?: boolean; is_public?: boolean }) =>
    fetchAPI('/api/admin/status-pages', { method: 'POST', body: JSON.stringify(data) });
export const updateStatusPage = (id: number, data: Partial<{ slug: string; name: string; title: string; subtitle: string; logo_url: string; favicon_url: string; hero_bg_color: string; theme_mode: string; bg_pattern: string; monitor_style: string; meta_description: string; og_image_url: string; custom_css: string; is_default: boolean; is_public: boolean }>) =>
    fetchAPI(`/api/admin/status-pages/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteStatusPage = (id: number) =>
    fetchAPI(`/api/admin/status-pages/${id}`, { method: 'DELETE' });
export const getPublicStatusPage = (slug: string) => fetchAPI(`/api/public/status-pages/${slug}`);
export const getStatusPageServices = (slug: string) => fetchAPI(`/api/public/status-pages/${slug}/services`);
export const getPublicStatusPageSections = (slug: string) => fetchAPI(`/api/public/status-pages/${slug}/sections`);

// Status Page Service Assignments (Admin)
export const getStatusPageServiceIds = (id: number): Promise<number[]> => fetchAPI(`/api/admin/status-pages/${id}/service-ids`);
export const updateStatusPageServiceIds = (id: number, serviceIds: number[]) =>
    fetchAPI(`/api/admin/status-pages/${id}/services`, { method: 'PUT', body: JSON.stringify({ service_ids: serviceIds }) });

// Status Page Sections
export interface StatusPageSection {
    id: number | null;
    name: string;
    display_order: number;
    status_page_id?: number;
    services?: {
        service_id: number;
        service_name: string;
        url: string;
        current_status: string;
        display_options: string;
        sort_order: number;
    }[];
}

export const getStatusPageSections = (id: number): Promise<StatusPageSection[]> =>
    fetchAPI(`/api/admin/status-pages/${id}/sections`);
export const createStatusPageSection = (id: number, name: string, displayOrder = 0) =>
    fetchAPI(`/api/admin/status-pages/${id}/sections`, { method: 'POST', body: JSON.stringify({ name, display_order: displayOrder }) });
export const updateStatusPageSection = (statusPageId: number, sectionId: number, data: { name?: string; display_order?: number }) =>
    fetchAPI(`/api/admin/status-pages/${statusPageId}/sections/${sectionId}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteStatusPageSection = (statusPageId: number, sectionId: number) =>
    fetchAPI(`/api/admin/status-pages/${statusPageId}/sections/${sectionId}`, { method: 'DELETE' });
export const assignServiceToSection = (statusPageId: number, serviceId: number, sectionId: number | null, displayOptions?: { showHistory: boolean; showChart: boolean }) =>
    fetchAPI(`/api/admin/status-pages/${statusPageId}/services/${serviceId}/section`, { method: 'PUT', body: JSON.stringify({ section_id: sectionId, display_options: displayOptions }) });
