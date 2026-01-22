export interface Service {
    id: number;
    name: string;
    url: string;
    type: 'http' | 'tcp' | 'keyword' | 'dns' | 'postgres' | 'mysql' | 'mongodb' | 'redis';
    interval: number;
    notify_down: boolean;
    paused: boolean;
    category_id: number | null;
    current_status: 'up' | 'down' | 'paused' | null;
    uptime_percent: string;
    keyword?: string; // Keyword monitoring
    keyword_condition?: 'exists' | 'not_exists'; // Keyword monitoring
    keyword_case_sensitive?: boolean; // Keyword monitoring
    dns_record_type?: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS'; // DNS monitoring
    dns_expected_value?: string; // DNS monitoring
    db_connection_string?: string; // Database monitoring
    db_query?: string; // Database monitoring
    tags?: Tag[];
    ssl_expiry?: string;
    domain_expiry?: string;
    region?: string;
    server_country?: string;
    server_city?: string;
    server_lat?: number;
    server_lon?: number;
    // Advanced monitoring settings
    timeout?: number;
    slow_threshold?: number;
    http_method?: 'GET' | 'POST' | 'HEAD' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';
    custom_headers?: string | Record<string, string>;
    follow_redirects?: boolean;
    auth_type?: 'none' | 'basic' | 'bearer';
    auth_user?: string;
    auth_pass?: string;
    notification_repeat?: number;
    notification_delay?: number;
    created_at: string;
}

export interface Category {
    id: number;
    name: string;
    description: string;
    sort_order: number;
    service_count: number;
    created_at: string;
}

export interface Ping {
    id: number;
    service_id: number;
    status: 'up' | 'down';
    response_time: number | null;
    status_code: number | null;
    error: string | null;
    created_at: string;
}

export interface DailyPing {
    date: string;
    status: 'up' | 'down' | 'partial' | 'no_data';
    uptime_percent: string;
    total_checks: number;
    avg_response_time: number | null;
    downtime_minutes?: number;
}

export interface Settings {
    // General
    page_title: string;
    page_subtitle: string;
    site_url: string;
    refresh_interval: string;
    timezone: string;
    time_format: '12h' | '24h';

    // Branding
    logo_url: string;
    favicon_url: string;
    hero_bg_color: string;
    theme_mode: 'light' | 'dark' | 'system';
    bg_pattern: 'none' | 'dots' | 'squares' | 'waves';
    monitor_style: 'bars' | 'pills';

    // SEO
    meta_description: string;
    og_image_url: string;

    // Custom Links
    nav_links: string; // JSON array of {label, url}
    footer_links: string; // JSON array of {label, url}
    custom_css: string;

    // SMTP
    smtp_host: string;
    smtp_port: string;
    smtp_user: string;
    smtp_pass: string;
    smtp_from: string;
    smtp_from_name: string;
    notification_emails: string;

    // Security
    session_timeout: string; // minutes

    // Data Retention
    ping_retention_days: string;
    incident_retention_days: string;
    alert_retention_days: string;
}

export interface ServiceIncident {
    id: number;
    service_id: number;
    status: 'down' | 'resolved';
    started_at: string;
    ended_at: string | null;
    duration_seconds: number | null;
    error_message: string | null;
    created_at: string;
}

export interface Incident {
    id: number;
    title: string;
    description: string;
    status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
    severity: 'minor' | 'major' | 'critical';
    service_ids: number[];
    affected_services: string[];
    updates: IncidentUpdate[];
    created_at: string;
    updated_at: string;
    resolved_at: string | null;
}

export interface IncidentUpdate {
    id: number;
    incident_id: number;
    message: string;
    status: string | null;
    created_at: string;
}

export interface Maintenance {
    id: number;
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    service_ids: number[];
    affected_services: string[];
    created_at: string;
}

export interface User {
    id: number;
    username: string;
}

export interface CustomLink {
    label: string;
    url: string;
}

export interface Webhook {
    id: number;
    name: string;
    url: string;
    type: 'discord' | 'slack' | 'custom';
    events: string[];
    headers: Record<string, string>;
    config?: any;
    enabled: boolean;
    created_at: string;
}

export interface AlertHistory {
    id: number;
    service_id: number | null;
    service_name: string | null;
    service_url: string | null;
    type: string;
    message: string;
    created_at: string;
}

export interface Subscriber {
    id: number;
    email: string;
    verified: boolean;
    created_at: string;
}

export interface ApiKey {
    id: number;
    name: string;
    key: string; // masked
    permissions: string[];
    last_used: string | null;
    enabled: boolean;
    created_at: string;
}

export interface StatusOverride {
    id: number;
    service_id: number;
    service_name?: string;
    status: string;
    reason: string | null;
    start_time: string;
    end_time: string;
    created_at: string;
}

export interface StatusPage {
    id: number;
    slug: string;
    name: string;
    title: string;
    subtitle: string;
    navbar_title?: string;
    logo_url: string | null;
    favicon_url: string | null;
    hero_bg_color: string;
    theme_mode: string;
    bg_pattern: string;
    monitor_style: string;
    meta_description: string | null;
    og_image_url: string | null;
    custom_css: string | null;
    is_default: boolean;
    is_public: boolean;
    created_at: string;
}

export interface Tag {
    id: number;
    name: string;
    color: string;
    created_at: string;
}

export interface ServiceUpdate {
    name?: string;
    url?: string;
    type?: 'http' | 'tcp' | 'keyword' | 'dns' | 'postgres' | 'mysql' | 'mongodb' | 'redis';
    interval?: number;
    notify_down?: boolean;
    category_id?: number | null;
    tags?: string[];
    paused?: boolean;
    keyword?: string;
    keyword_condition?: 'exists' | 'not_exists';
    keyword_case_sensitive?: boolean;
    dns_record_type?: string;
    dns_expected_value?: string;
    db_connection_string?: string;
    db_query?: string;
    ssl_expiry?: string;
    domain_expiry?: string;
    region?: string;
    // Advanced monitoring settings
    timeout?: number;
    slow_threshold?: number;
    http_method?: 'GET' | 'POST' | 'HEAD' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';
    custom_headers?: Record<string, string>;
    follow_redirects?: boolean;
    auth_type?: 'none' | 'basic' | 'bearer';
    auth_user?: string;
    auth_pass?: string;
    notification_repeat?: number;
    notification_delay?: number;
}

