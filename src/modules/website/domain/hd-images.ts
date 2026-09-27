// Full-bleed hero photos are shown far larger than the original files on the
// public site. public/site/hd holds upscaled versions of the same photos
// (same content, higher resolution); this maps an original path to its HD
// file when one exists, otherwise returns the path unchanged.
const HD_VERSIONS: Record<string, string> = {
	"/assets/plates/hero-photo.png": "/site/hd/hero-photo.jpg",
	"/site/images/blog1.jpg": "/site/hd/blog1.jpg",
	"/site/images/blog3.jpg": "/site/hd/blog3.jpg",
	"/site/images/Rd.png": "/site/hd/Rd.jpg",
	"/site/images/Rd4.jpg": "/site/hd/Rd4.jpg",
	"/site/images/hero-fachada.jpg": "/site/hd/hero-fachada.jpg",
};

export function hdImage(src: string) {
	return HD_VERSIONS[src] ?? src;
}
