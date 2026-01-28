import { db } from '../db.js';

// Get all status pages
export async function getAllStatusPages() {
  return db.statusPage.findMany({
    orderBy: [
      { is_default: 'desc' },
      { name: 'asc' }
    ]
  });
}

export async function getStatusPageById(id) {
  return db.statusPage.findUnique({
    where: { id: parseInt(id) }
  });
}

export async function getStatusPageBySlug(slug) {
  return db.statusPage.findUnique({
    where: { slug }
  });
}

export async function getDefaultStatusPage() {
  return db.statusPage.findFirst({
    where: { is_default: 1 }
  });
}

export async function createStatusPage(data) {
  // Check if default
  const count = await db.statusPage.count();
  const isDefault = count === 0 || data.is_default ? 1 : 0;

  return db.$transaction(async (tx) => {
    if (isDefault) {
      await tx.statusPage.updateMany({
        data: { is_default: 0 }
      });
    }

    return tx.statusPage.create({
      data: {
        slug: data.slug,
        name: data.name,
        title: data.title || data.name,
        subtitle: data.subtitle || 'Real-time system status',
        navbar_title: data.navbar_title || null,
        logo_url: data.logo_url || null,
        favicon_url: data.favicon_url || null,
        hero_bg_color: data.hero_bg_color || '#1e2a38',
        primary_color: data.primary_color || '#3b82f6',
        secondary_color: data.secondary_color || '#64748b',
        bg_color: data.bg_color || '#f8fafc',
        text_color: data.text_color || '#0f172a',
        footer_bg_color: data.footer_bg_color || '#ffffff',
        success_color: data.success_color || '#22c55e',
        warning_color: data.warning_color || '#eab308',
        error_color: data.error_color || '#ef4444',
        theme_mode: data.theme_mode || 'system',
        bg_pattern: data.bg_pattern || 'none',
        monitor_style: data.monitor_style || 'bars',
        meta_description: data.meta_description || null,
        og_image_url: data.og_image_url || null,
        custom_css: data.custom_css || null,
        is_default: isDefault,
        is_public: data.is_public !== false ? 1 : 0
      }
    });
  });
}

export async function updateStatusPage(id, data) {
  return db.$transaction(async (tx) => {
    if (data.is_default) {
      await tx.statusPage.updateMany({
        data: { is_default: 0 }
      });
    }

    try {
      const updateData = {};
      if (data.slug !== undefined) updateData.slug = data.slug;
      if (data.name !== undefined) updateData.name = data.name;
      if (data.title !== undefined) updateData.title = data.title;
      if (data.subtitle !== undefined) updateData.subtitle = data.subtitle;
      if (data.navbar_title !== undefined) updateData.navbar_title = data.navbar_title;
      if (data.logo_url !== undefined) updateData.logo_url = data.logo_url;
      if (data.favicon_url !== undefined) updateData.favicon_url = data.favicon_url;
      if (data.hero_bg_color !== undefined) updateData.hero_bg_color = data.hero_bg_color;
      if (data.primary_color !== undefined) updateData.primary_color = data.primary_color;
      if (data.secondary_color !== undefined) updateData.secondary_color = data.secondary_color;
      if (data.bg_color !== undefined) updateData.bg_color = data.bg_color;
      if (data.text_color !== undefined) updateData.text_color = data.text_color;
      if (data.footer_bg_color !== undefined) updateData.footer_bg_color = data.footer_bg_color;
      if (data.success_color !== undefined) updateData.success_color = data.success_color;
      if (data.warning_color !== undefined) updateData.warning_color = data.warning_color;
      if (data.error_color !== undefined) updateData.error_color = data.error_color;
      if (data.theme_mode !== undefined) updateData.theme_mode = data.theme_mode;
      if (data.bg_pattern !== undefined) updateData.bg_pattern = data.bg_pattern;
      if (data.monitor_style !== undefined) updateData.monitor_style = data.monitor_style;
      if (data.meta_description !== undefined) updateData.meta_description = data.meta_description;
      if (data.og_image_url !== undefined) updateData.og_image_url = data.og_image_url;
      if (data.custom_css !== undefined) updateData.custom_css = data.custom_css;
      if (data.is_default !== undefined) updateData.is_default = data.is_default ? 1 : 0;
      if (data.is_public !== undefined) updateData.is_public = data.is_public ? 1 : 0;

      return await tx.statusPage.update({
        where: { id: parseInt(id) },
        data: updateData
      });
    } catch (e) {
      return null;
    }
  });
}

export async function deleteStatusPage(id) {
  const pageId = parseInt(id);
  const page = await getStatusPageById(pageId);
  if (!page) return null;

  return db.$transaction(async (tx) => {
    const count = await tx.statusPage.count();
    if (page.is_default && count > 1) {
      // Set another page as default
      const other = await tx.statusPage.findFirst({
        where: { id: { not: pageId } }
      });
      if (other) {
        await tx.statusPage.update({
          where: { id: other.id },
          data: { is_default: 1 }
        });
      }
    }

    // Remove service assignments (cascade usually handles this if defined, but schema might not have cascade)
    // status_page_services has onDelete: Cascade in schema? Let's assume manual cleanup to be safe unless checked.
    // Actually schema usually has references but SQLite enforcement varies.
    // Let's delete manually to be safe.
    // Actually relations in schema usually sufficient for Prisma delete cascade if configured.
    // But let's follow original logic: "UPDATE services SET status_page_id = NULL" ? 
    // Original logic: "UPDATE services SET status_page_id = NULL". Wait, services table has status_page_id column?
    // Wait, there is a `status_page_services` junction table AND a direct `status_page_id` on services table?
    // Let's check `statusPageService.js` original code.
    // Line 118: `db.prepare('UPDATE services SET status_page_id = NULL WHERE status_page_id = ?').run(id);`
    // So yes, `services` table has `status_page_id`.

    await tx.service.updateMany({
      where: { status_page_id: pageId },
      data: { status_page_id: null }
    });

    // Also delete from junction table `status_page_services`? 
    // Original code didn't explicit delete from junction table here, maybe cascade or `services` column was legacy?
    // But `status_page_services` exists (lines 124+).
    // If schema has cascade, it's fine. If not, we should delete.
    // `status_page_services` likely has FK to status_pages.

    // Let's safe delete
    await tx.statusPageService.deleteMany({
      where: { status_page_id: pageId }
    });

    return tx.statusPage.delete({
      where: { id: pageId }
    });
  });
}

// Get services assigned to a status page (using junction table)
export async function getServicesForStatusPage(statusPageId) {
  if (statusPageId) {
    // Services linked via status_page_services
    const entries = await db.statusPageService.findMany({
      where: { status_page_id: parseInt(statusPageId) },
      include: { service: true },
      orderBy: [
        { sort_order: 'asc' },
        { service: { name: 'asc' } }
      ]
    });

    return entries.map(e => ({
      ...e.service,
      sort_order: e.sort_order
    }));
  }
  // For default/no specific page, get all services
  return db.service.findMany({
    orderBy: { name: 'asc' }
  });
}

// Get service IDs for a status page
export async function getServiceIdsForStatusPage(statusPageId) {
  const rows = await db.statusPageService.findMany({
    where: { status_page_id: parseInt(statusPageId) },
    select: { service_id: true }
  });
  return rows.map(r => r.service_id);
}

// Assign service to a status page (junction table)
export async function assignServiceToStatusPage(serviceId, statusPageId) {
  // insert or ignore/replace
  // Prisma upsert
  // Sort order? Defaults to 0 or null? schema says Int? @default(0)? 
  // We can just create, if exists catch error (unique constraint).
  try {
    await db.statusPageService.upsert({
      where: {
        status_page_id_service_id: {
          status_page_id: parseInt(statusPageId),
          service_id: parseInt(serviceId)
        }
      },
      create: {
        status_page_id: parseInt(statusPageId),
        service_id: parseInt(serviceId)
      },
      update: {} // do nothing
    });
  } catch (e) {
    // ignore
  }
}

// Remove service from a status page
export async function removeServiceFromStatusPage(serviceId, statusPageId) {
  return db.statusPageService.deleteMany({
    where: {
      status_page_id: parseInt(statusPageId),
      service_id: parseInt(serviceId)
    }
  });
}

// Update all services for a status page (replace all, but preserve section assignments)
export async function updateStatusPageServices(statusPageId, serviceIds) {
  const id = parseInt(statusPageId);

  return db.$transaction(async (tx) => {
    // Get existing to preserve section_id
    const existing = await tx.statusPageService.findMany({
      where: { status_page_id: id }
    });
    const existingMap = new Map(existing.map(e => [e.service_id, e.section_id]));

    // Delete all (simplest way to "sync" without complex diffing, but slightly expensive if many)
    // Or delete ones not in serviceIds
    await tx.statusPageService.deleteMany({
      where: {
        status_page_id: id,
        service_id: { notIn: serviceIds.map(Number) }
      }
    });

    // Upsert each
    for (let i = 0; i < serviceIds.length; i++) {
      const sid = parseInt(serviceIds[i]);
      const sectionId = existingMap.get(sid) || null;

      await tx.statusPageService.upsert({
        where: {
          status_page_id_service_id: {
            status_page_id: id,
            service_id: sid
          }
        },
        update: {
          sort_order: i
        },
        create: {
          status_page_id: id,
          service_id: sid,
          sort_order: i,
          section_id: sectionId
        }
      });
    }

    const rows = await tx.statusPageService.findMany({
      where: { status_page_id: id },
      select: { service_id: true }
    });
    return rows.map(r => r.service_id);
  });
}
