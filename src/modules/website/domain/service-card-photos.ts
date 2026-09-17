// Los servicios (WebsiteService) no tienen una foto propia en la base de
// datos - son texto + ícono. Para que cada tarjeta de servicio muestre una
// foto real de obra (no inventada) se asigna por posición un ciclo fijo de
// fotos reales ya existentes en public/site/images, en vez de agregar una
// columna nueva a la tabla solo para esto.
const SERVICE_CARD_PHOTOS = [
	"/site/images/Rd1.png",
	"/site/images/proyecto3.jpg",
	"/site/images/Rd4.jpg",
	"/site/images/Rd5.jpg",
	"/site/images/proyecto2.jpg",
	"/site/images/proyecto4.jpg",
] as const;

export function serviceCardPhoto(index: number) {
	return SERVICE_CARD_PHOTOS[index % SERVICE_CARD_PHOTOS.length];
}
