import { useEffect } from 'react';
import type { Settings } from './types';

/**
 * Hook to dynamically update document meta tags based on settings
 */
export function useDocumentMeta(settings: Partial<Settings> | undefined) {
  useEffect(() => {
    if (!settings) return;

    // Update document title
    if (settings.page_title) {
      document.title = settings.page_title;
    }

    // Update favicon
    if (settings.favicon_url) {
      const faviconLink = document.getElementById('favicon-link') as HTMLLinkElement;
      if (faviconLink) {
        faviconLink.href = settings.favicon_url;
      }
    }

    // Update meta description
    if (settings.meta_description) {
      const metaDesc = document.getElementById('meta-description') as HTMLMetaElement;
      if (metaDesc) {
        metaDesc.content = settings.meta_description;
      }
    }

    // Update OpenGraph tags
    if (settings.page_title) {
      const ogTitle = document.getElementById('og-title') as HTMLMetaElement;
      const twitterTitle = document.getElementById('twitter-title') as HTMLMetaElement;
      if (ogTitle) ogTitle.content = settings.page_title;
      if (twitterTitle) twitterTitle.content = settings.page_title;
    }

    if (settings.meta_description) {
      const ogDesc = document.getElementById('og-description') as HTMLMetaElement;
      const twitterDesc = document.getElementById('twitter-description') as HTMLMetaElement;
      if (ogDesc) ogDesc.content = settings.meta_description;
      if (twitterDesc) twitterDesc.content = settings.meta_description;
    }

    if (settings.og_image_url) {
      const ogImage = document.getElementById('og-image') as HTMLMetaElement;
      if (ogImage) ogImage.content = settings.og_image_url;
    }

    // Apply custom CSS
    if (settings.custom_css) {
      let styleEl = document.getElementById('custom-css-style');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'custom-css-style';
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = settings.custom_css;
    }
  }, [settings]);
}

/**
 * Get background pattern CSS based on pattern setting
 */
export function getBackgroundPattern(pattern: string): string {
  switch (pattern) {
    case 'dots':
      return `radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)`;
    case 'squares':
      return `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`;
    case 'waves':
      return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath fill='rgba(255,255,255,0.03)' d='M0 50 Q25 40 50 50 T100 50 V100 H0 Z'/%3E%3C/svg%3E")`;
    default:
      return 'none';
  }
}

/**
 * Get background pattern size based on pattern
 */
export function getPatternSize(pattern: string): string {
  switch (pattern) {
    case 'dots':
      return '20px 20px';
    case 'squares':
      return '40px 40px';
    case 'waves':
      return '100px 50px';
    default:
      return 'auto';
  }
}
