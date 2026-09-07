import {
  getWebsiteSettings,
  listReusableProjectEvidence,
  listWebsiteInquiries,
  listWebsitePhotos,
  listWebsiteServices
} from "./service";

export async function getWebsiteAdminWorkspace() {
  const [settings, services, photos, inquiries, reusableEvidence] = await Promise.all([
    getWebsiteSettings(),
    listWebsiteServices(),
    listWebsitePhotos(),
    listWebsiteInquiries(),
    listReusableProjectEvidence()
  ]);

  return { settings, services, photos, inquiries, reusableEvidence };
}

// Read-only projection for the public site: only published settings and only
// active services/photos, in display order. The admin workspace above shows
// everything, including inactive/unpublished, so staff can review before
// flipping the switch.
export async function getPublicWebsiteContent() {
  const [settings, services, photos] = await Promise.all([
    getWebsiteSettings(),
    listWebsiteServices(),
    listWebsitePhotos()
  ]);

  return {
    settings: settings.published ? settings : null,
    services: services.filter((service) => service.active),
    photos: photos.filter((photo) => photo.active)
  };
}
