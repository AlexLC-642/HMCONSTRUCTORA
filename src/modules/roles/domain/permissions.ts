export const permissionKeys = [
	"proyectos.ver",
	"proyectos.crear",
	"proyectos.editar",
	"presupuesto.ver",
	"presupuesto.editar",
	"presupuesto.aprobar",
	"cronograma.ver",
	"cronograma.editar",
	"avance.crear",
	"avance.revisar",
	"avance.aprobar",
	"avance.publicar",
	"inventario.mover",
	"requerimiento.aprobar",
	"compras.ver",
	"compras.gestionar",
	"finanzas.ver",
	"finanzas.registrar",
	"documentos.compartir",
	"portal.gestionar",
	"usuarios.gestionar",
	"usuarios.administradores",
	"sitio.editar",
] as const;

export type PermissionKey = (typeof permissionKeys)[number];

export const initialPermissions = permissionKeys.map((key) => ({
	key,
	name: key,
	description: `Permite ${key}`,
}));

export const initialRoles = [
	{
		key: "superadministrador",
		name: "Superadministrador",
		description: "Acceso total al sistema",
	},
	{
		key: "administrador",
		name: "Administrador",
		description: "Gestion operativa general",
	},
	{
		key: "gerente_proyecto",
		name: "Gerente de proyecto",
		description: "Gestion de proyectos asignados",
	},
	{
		key: "supervisor_obra",
		name: "Supervisor o encargado de obra",
		description: "Registro y seguimiento de avances",
	},
	{
		key: "contabilidad",
		name: "Finanzas y contabilidad",
		description:
			"Control de presupuesto, gastos, pagos y documentos financieros",
	},
	{
		key: "compras",
		name: "Compras",
		description: "Gestion de requerimientos y compras",
	},
	{
		key: "bodega",
		name: "Bodega",
		description: "Gestion de inventario",
	},
	{
		key: "contratista_interno",
		name: "Contratista o subcontratista interno",
		description: "Acceso limitado a actividades asignadas",
	},
	{
		key: "usuario_consulta",
		name: "Usuario de consulta",
		description: "Acceso de solo lectura segun permisos",
	},
] as const;

export type SystemRoleKey = (typeof initialRoles)[number]["key"];

export const rolePermissionPresets: Record<
	SystemRoleKey,
	readonly PermissionKey[]
> = {
	superadministrador: permissionKeys,
	administrador: permissionKeys.filter(
		(key) => key !== "usuarios.administradores",
	),
	gerente_proyecto: [
		"proyectos.ver",
		"proyectos.crear",
		"proyectos.editar",
		"presupuesto.ver",
		"presupuesto.editar",
		"presupuesto.aprobar",
		"cronograma.ver",
		"cronograma.editar",
		"avance.crear",
		"avance.revisar",
		"avance.aprobar",
		"avance.publicar",
		"inventario.mover",
		"requerimiento.aprobar",
		"compras.ver",
		"finanzas.ver",
		"documentos.compartir",
		"portal.gestionar",
	],
	supervisor_obra: [
		"proyectos.ver",
		"presupuesto.ver",
		"cronograma.ver",
		"avance.crear",
		"avance.revisar",
		"inventario.mover",
	],
	contabilidad: [
		"proyectos.ver",
		"presupuesto.ver",
		"finanzas.ver",
		"finanzas.registrar",
		"compras.ver",
		"documentos.compartir",
	],
	compras: [
		"proyectos.ver",
		"presupuesto.ver",
		"inventario.mover",
		"requerimiento.aprobar",
		"compras.ver",
		"compras.gestionar",
		"finanzas.ver",
		"finanzas.registrar",
		"documentos.compartir",
	],
	bodega: ["inventario.mover", "requerimiento.aprobar", "compras.ver"],
	contratista_interno: ["proyectos.ver", "cronograma.ver", "avance.crear"],
	usuario_consulta: [
		"proyectos.ver",
		"presupuesto.ver",
		"cronograma.ver",
		"finanzas.ver",
	],
};
