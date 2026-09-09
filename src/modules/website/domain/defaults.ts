// Fallback copy: the real content captured from hmconstructora.com, used
// until an editor fills in /website (WebsiteSettings starts as an empty row).
export const websiteDefaults = {
	heroEyebrow: "Diseño & construcción",
	heroHeading: "Constructora H&M",
	heroSubheading:
		"Somos tu aliado estratégico en la materialización de proyectos arquitectónicos y de ingeniería. Transformamos visiones en estructuras sólidas y funcionales.",
	homeServicesEyebrow: "Diseño y construcción",
	homeServicesHeading: "Servicios pensados para cada etapa de tu obra",
	ctaHeading: "¿Tienes un proyecto en mente?",
	ctaText:
		"Cuéntanos qué necesitas y te contactamos para asesorarte sin costo.",
	aboutHeading: "Comprometidos con la excelencia en cada obra",
	aboutText:
		"Somos una empresa comprometida con la excelencia en el desarrollo de proyectos de construcción. Con años de experiencia en el sector, nos especializamos en obras residenciales, comerciales e industriales.",
	missionText:
		"Brindar servicios de construcción de calidad, comprometidos con el cumplimiento de los estándares de calidad, desempeño de ejecución y satisfacción del cliente.",
	visionText:
		"Ser una empresa constructora de referencia a nivel nacional, destacando por nuestra responsabilidad, innovación y compromiso.",
	phonePrimary: "+502 4982-2112",
	phoneSecondary: "+502 3152-5467",
	email: "hmconstruccionesgt@gmail.com",
	address: "0 calle Zona 2 Barrio San Sebastián, San Cristóbal Verapaz A.V.",
	hoursWeekdays: "Lunes a viernes: 08:00 – 17:00",
	hoursSaturday: "Sábado: 08:00 – 12:00",
	facebookUrl: "HM constructora",
	instagramUrl: "@hmconstructoragt",
	servicesEyebrow: "Diseño y construcción",
	servicesHeading: "Conoce nuestros servicios de construcción",
	projectsEyebrow: "Portafolio",
	projectsHeading: "Proyectos y remodelaciones",
	projectsSubheading:
		"Cada proyecto es único. Por eso nos enfocamos en entender tus necesidades y superar tus expectativas.",
	contactEyebrow: "Contacto",
	contactHeading: "Hablemos de tu proyecto",
	contactSubheading:
		"En HM Constructora te ofrecemos calidad y atención personalizada. Nuestro equipo está listo para asesorarte y ayudarte a cumplir tus metas.",
	seoTitle: "HM Constructora | Construcción y remodelación",
	seoDescription:
		"HM Constructora: diseño, construcción, remodelaciones y movimiento de tierra en San Cristóbal Verapaz y toda Guatemala.",
} as const;

export function withDefault(
	value: string | null | undefined,
	fallback: string,
) {
	return value?.trim() ? value : fallback;
}

export type WebsiteCopy = { [Key in keyof typeof websiteDefaults]: string };

export function resolveWebsiteCopy(
	values: Partial<
		Record<keyof typeof websiteDefaults, string | null | undefined>
	>,
): WebsiteCopy {
	return Object.fromEntries(
		(Object.keys(websiteDefaults) as Array<keyof typeof websiteDefaults>).map(
			(key) => [key, withDefault(values[key], websiteDefaults[key])],
		),
	) as WebsiteCopy;
}
