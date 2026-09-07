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

export const websiteDefaultServices = [
	{
		id: "base-service-1",
		icon: "Compass",
		title: "Diseños arquitectónicos",
		description:
			"Creamos propuestas arquitectónicas innovadoras y personalizadas, adaptadas a tus necesidades y al entorno del proyecto.",
	},
	{
		id: "base-service-2",
		icon: "Map",
		title: "Elaboración de archivos Master Plan",
		description:
			"Desarrollamos planes detallados que integran el diseño urbano, distribución y crecimiento ordenado de proyectos.",
	},
	{
		id: "base-service-3",
		icon: "FileText",
		title: "Planificación y presupuestos",
		description:
			"Analizamos tiempos, recursos y costos para construir con una inversión clara y controlada.",
	},
	{
		id: "base-service-4",
		icon: "Building2",
		title: "Elaboración de planos",
		description:
			"Diseñamos planos constructivos listos para su uso en obra y trámites municipales.",
	},
	{
		id: "base-service-5",
		icon: "MonitorSmartphone",
		title: "Recorridos virtuales 3D y renders",
		description:
			"Presentamos visualizaciones realistas para explorar los espacios antes de construir.",
	},
	{
		id: "base-service-6",
		icon: "HardHat",
		title: "Ejecución de obras",
		description:
			"Construimos con materiales de calidad, personal capacitado y supervisión constante.",
	},
	{
		id: "base-service-7",
		icon: "Wrench",
		title: "Remodelaciones",
		description:
			"Transformamos espacios existentes en ambientes modernos, funcionales y atractivos.",
	},
	{
		id: "base-service-8",
		icon: "Eye",
		title: "Asesorías e inspección",
		description:
			"Acompañamiento técnico e inspecciones para asegurar el cumplimiento de normas.",
	},
	{
		id: "base-service-9",
		icon: "Lightbulb",
		title: "Instalaciones eléctricas",
		description:
			"Diseñamos e instalamos sistemas eléctricos para cada tipo de construcción o remodelación.",
	},
	{
		id: "base-service-10",
		icon: "Hammer",
		title: "Tablayeso y cielo falso",
		description:
			"Soluciones para muros, divisiones y cielos falsos con acabados modernos y funcionales.",
	},
] as const;

export const websiteDefaultPhotos = [
	{
		id: "base-photo-1",
		image: "/site/images/proyecto1.jpg",
		title: "Remodelación de cocina",
	},
	{
		id: "base-photo-2",
		image: "/site/images/proyecto2.jpg",
		title: "Levantamiento de muro perimetral",
	},
	{
		id: "base-photo-3",
		image: "/site/images/proyecto3.jpg",
		title: "Construcción de muro perimetral exterior",
	},
	{
		id: "base-photo-4",
		image: "/site/images/proyecto4.jpg",
		title: "Planos de fachadas y distribución",
	},
	{ id: "base-photo-5", image: "/site/images/Rd.png", title: "Construcción" },
	{ id: "base-photo-6", image: "/site/images/Rd1.png", title: "Diseño 3D" },
	{
		id: "base-photo-7",
		image: "/site/images/Rd3.jpg",
		title: "Movimiento de tierra",
	},
	{
		id: "base-photo-8",
		image: "/site/images/Rd4.jpg",
		title: "Movimiento de tierra",
	},
	{
		id: "base-photo-9",
		image: "/site/images/Rd5.jpg",
		title: "Remodelación de cielo falso",
	},
] as const;

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
