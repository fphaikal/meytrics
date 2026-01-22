import { db } from '../db.js';

// Get all sections for a status page
export async function getSections(statusPageId) {
  return db.statusPageSection.findMany({
    where: { status_page_id: parseInt(statusPageId) },
    orderBy: { display_order: 'asc' }
  });
}

export async function getSectionById(id) {
  return db.statusPageSection.findUnique({
    where: { id: parseInt(id) }
  });
}

export async function createSection(statusPageId, name, displayOrder = 0) {
  return db.statusPageSection.create({
    data: {
      status_page_id: parseInt(statusPageId),
      name,
      display_order: displayOrder
    }
  });
}

export async function updateSection(id, data) {
  try {
    return await db.statusPageSection.update({
      where: { id: parseInt(id) },
      data: {
        name: data.name,
        display_order: data.display_order
      }
    });
  } catch (e) {
    return null;
  }
}

export async function deleteSection(id) {
  const sectionId = parseInt(id);
  return db.$transaction(async (tx) => {
    // Unassign services
    // Assuming there is a relation or we update manually
    // statusPageService model has `section_id`? 
    // We need to update junction table `statusPageService` (status_page_services) where section_id = id
    // Prisma schema: StatusPageService model likely has section_id
    await tx.statusPageService.updateMany({
      where: { section_id: sectionId },
      data: { section_id: null }
    });

    return tx.statusPageSection.delete({
      where: { id: sectionId }
    });
  });
}

export async function updateSectionOrder(statusPageId, sectionIds) {
  return db.$transaction(async (tx) => {
    for (let i = 0; i < sectionIds.length; i++) {
      await tx.statusPageSection.update({
        where: { id: parseInt(sectionIds[i]) },
        data: { display_order: i }
      });
    }
  });
}

export async function assignServiceToSection(statusPageId, serviceId, sectionId, displayOptions = null) {
  const optionsStr = displayOptions ? JSON.stringify(displayOptions) : '{"showHistory":true,"showChart":true}';

  // Check existing
  const exists = await db.statusPageService.findUnique({
    where: {
      status_page_id_service_id: {
        status_page_id: parseInt(statusPageId),
        service_id: parseInt(serviceId)
      }
    }
  });

  if (exists) {
    await db.statusPageService.update({
      where: {
        status_page_id_service_id: {
          status_page_id: parseInt(statusPageId),
          service_id: parseInt(serviceId)
        }
      },
      data: {
        section_id: parseInt(sectionId),
        display_options: optionsStr
      }
    });
  } else {
    // Find max order
    const agg = await db.statusPageService.aggregate({
      _max: { sort_order: true },
      where: { status_page_id: parseInt(statusPageId) }
    });
    const nextOrder = (agg._max.sort_order || -1) + 1;

    await db.statusPageService.create({
      data: {
        status_page_id: parseInt(statusPageId),
        service_id: parseInt(serviceId),
        section_id: parseInt(sectionId),
        display_options: optionsStr,
        sort_order: nextOrder
      }
    });
  }
}

// Get services for a section
export async function getServicesInSection(statusPageId, sectionId) {
  // Join with services
  const entries = await db.statusPageService.findMany({
    where: {
      status_page_id: parseInt(statusPageId),
      section_id: parseInt(sectionId)
    },
    include: { service: true },
    orderBy: { sort_order: 'asc' }
  });

  return entries.map(e => ({
    ...e,
    // Flatten service details
    service_name: e.service.name,
    url: e.service.url,
    // Include raw entry for metadata like display_options
    ...e.service
    // Careful with spread, we want sps fields + service fields.
    // The original returned "sps.*, s.name.., s.url".
  })).map(e => ({
    // We'll mimic the structure roughly but clean it up
    id: e.id, // junction id if any? schema usually composite. Or maybe `id` exists?
    // Actually junction table usually doesn't have ID if composite PK.
    // But original code: `SELECT sps.*`.
    // If Prisma model has id, good. If composite PK, no single ID.
    // Assuming we rely on service_id/status_page_id.
    // Original frontend likely uses service_id.
    status_page_id: e.status_page_id,
    service_id: e.service_id,
    section_id: e.section_id,
    sort_order: e.sort_order,
    display_options: e.display_options,
    service_name: e.service.name,
    url: e.service.url
  }));
}

export async function getServicesWithoutSection(statusPageId) {
  const entries = await db.statusPageService.findMany({
    where: {
      status_page_id: parseInt(statusPageId),
      section_id: null
    },
    include: { service: true },
    orderBy: { sort_order: 'asc' }
  });

  return entries.map(e => ({
    status_page_id: e.status_page_id,
    service_id: e.service_id,
    section_id: e.section_id,
    sort_order: e.sort_order,
    display_options: e.display_options,
    service_name: e.service.name,
    url: e.service.url
  }));
}

// Get all sections with their services for a status page
export async function getSectionsWithServices(statusPageId) {
  const sections = await getSections(statusPageId);
  // Loop valid because manageable number of sections
  // Or fetch all services and map in memory

  // Fetch all services for page
  const allServices = await db.statusPageService.findMany({
    where: { status_page_id: parseInt(statusPageId) },
    include: { service: true },
    orderBy: { sort_order: 'asc' }
  });

  const serviceMap = new Map(); // sectionId -> services[]
  const uncategorized = [];

  allServices.forEach(sps => {
    const mapped = {
      status_page_id: sps.status_page_id,
      service_id: sps.service_id,
      section_id: sps.section_id,
      sort_order: sps.sort_order,
      display_options: sps.display_options,
      service_name: sps.service.name,
      url: sps.service.url
    };

    if (sps.section_id) {
      if (!serviceMap.has(sps.section_id)) serviceMap.set(sps.section_id, []);
      serviceMap.get(sps.section_id).push(mapped);
    } else {
      uncategorized.push(mapped);
    }
  });

  const result = sections.map(section => ({
    ...section,
    services: serviceMap.get(section.id) || []
  }));

  if (uncategorized.length > 0) {
    result.push({
      id: null,
      name: 'Uncategorized',
      display_order: 9999,
      services: uncategorized
    });
  }

  return result;
}
