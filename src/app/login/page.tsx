import {
	ArrowRight,
	BarChart3,
	FileText,
	Mail,
	ShieldCheck,
	Users,
} from "lucide-react";
import { loginAction } from "@/modules/auth/application/actions";
import { COMPANY_EMAIL_DOMAIN } from "@/modules/auth/domain/email-domain";
import { PasskeyLogin } from "@/modules/auth/ui/passkey-login";
import { PasswordInput } from "@/modules/auth/ui/password-input";
import { ThemeToggle } from "@/shared/components/theme-toggle";

type LoginPageProps = {
	searchParams: Promise<{
		error?: string;
	}>;
};

function errorMessage(error?: string) {
	// Deliberately one generic message regardless of cause (bad credentials,
	// inactive account, rate limit, or a transient DB error) - see
	// docs/security-audit.md M6 for why the causes are not distinguished here.
	if (error)
		return "No se pudo iniciar sesión. Verifica tus datos e inténtalo de nuevo.";
	return "";
}

// Recorta solo el glifo "HM" de public/brand/logo.png (521x479, marca en
// x:[78,446] y:[100,313]), sin el wordmark "CONSTRUCTORA" que trae debajo -
// se reusa en el panel oscuro y en la tarjeta en vez de duplicar un asset.
function HmMark({ height, className }: { height: number; className?: string }) {
	const scale = height / 213;
	return (
		<span
			className={className}
			style={{
				display: "block",
				height,
				overflow: "hidden",
				position: "relative",
				width: 368 * scale,
			}}
		>
			{/** biome-ignore lint/performance/noImgElement: recorte con offsets arbitrarios que next/image no puede expresar. */}
			<img
				alt="HM Constructora"
				src="/brand/logo.png"
				style={{
					height: 479 * scale,
					left: -78 * scale,
					maxWidth: "none",
					position: "absolute",
					top: -100 * scale,
					width: 521 * scale,
				}}
			/>
		</span>
	);
}

const FEATURES = [
	{
		description: "Seguimiento en tiempo real",
		icon: BarChart3,
		title: "Proyectos",
	},
	{
		description: "Todo en un solo lugar",
		icon: FileText,
		title: "Documentación",
	},
	{
		description: "Construyendo juntos",
		icon: Users,
		title: "Trabajo en equipo",
	},
];

export default async function LoginPage({ searchParams }: LoginPageProps) {
	const params = await searchParams;
	const message = errorMessage(params.error);

	return (
		<main className="login-page relative min-h-screen text-[var(--foreground)]">
			<div className="login-visual__photo" aria-hidden="true" />
			<div className="login-visual__scrim" aria-hidden="true" />

			<div className="absolute right-4 top-3 z-20 sm:right-6 sm:top-5 lg:right-8 lg:top-6">
				<ThemeToggle />
			</div>

			<div className="relative z-[2] grid min-h-screen lg:grid-cols-[1.12fr_1fr]">
				<section className="relative hidden flex-col justify-between px-12 py-9 text-white lg:flex xl:px-16 xl:py-11">
					<div className="relative z-[2] flex flex-col items-start gap-2">
						<HmMark height={30} />
						<span className="text-[13px] font-extrabold tracking-[0.2em]">
							CONSTRUCTORA
						</span>
					</div>

					<div className="relative z-[2] max-w-md">
						<span
							aria-hidden="true"
							className="mb-4 block h-[3px] w-12 rounded-full bg-[var(--brand-red)]"
						/>
						<p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/70">
							Construimos ideas en realidad
						</p>
						<h2 className="mt-4 text-[32px] font-extrabold leading-[1.1] tracking-tight xl:text-[36px]">
							<span className="block">Gestión interna</span>
							<span className="block text-[var(--brand-red)]">
								de proyectos
							</span>
						</h2>

						<div className="mt-5 flex flex-wrap items-center gap-2.5 text-[13px] font-bold uppercase tracking-[0.16em] text-white/70">
							<span>Planificación</span>
							<span aria-hidden="true" className="h-3 w-px bg-white/25" />
							<span>Control</span>
							<span aria-hidden="true" className="h-3 w-px bg-white/25" />
							<span>Resultados</span>
						</div>

						<ul className="mt-7 space-y-4">
							{FEATURES.map(({ icon: Icon, title, description }) => (
								<li className="flex items-center gap-3" key={title}>
									<span className="login-feature-icon">
										<Icon aria-hidden="true" size={17} />
									</span>
									<div>
										<strong className="block text-sm font-bold text-white">
											{title}
										</strong>
										<span className="block text-xs text-white/60">
											{description}
										</span>
									</div>
								</li>
							))}
						</ul>
					</div>

					<div className="relative z-[2] flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-[0.28em] text-white/55">
						<span
							aria-hidden="true"
							className="h-px w-8 bg-[var(--brand-red)]"
						/>
						Obras que generan confianza
					</div>
				</section>

				<section className="relative flex items-center justify-center px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-6 xl:px-14">
					<div className="login-form-card w-full max-w-[430px] rounded-[22px] p-6 sm:p-7">
						<div className="flex items-center gap-3">
							<HmMark height={28} />
							<span
								aria-hidden="true"
								className="h-9 w-px bg-[var(--border)]"
							/>
							<div className="min-w-0">
								<p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[var(--foreground)]">
									Acceso autorizado
								</p>
								<h1 className="text-[21px] font-extrabold tracking-tight text-[var(--foreground)] sm:text-[22px]">
									Iniciar sesión
								</h1>
							</div>
						</div>
						<p className="mt-1.5 text-[13px] text-[var(--muted)]">
							Ingresa tus credenciales para continuar
						</p>

						{message ? (
							<p className="mt-4 rounded-lg border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,var(--surface))] px-3 py-2 text-[13px] text-[var(--danger)]">
								{message}
							</p>
						) : null}

						<form action={loginAction} className="mt-5 space-y-3.5">
							<label className="block">
								<span className="mb-1.5 block text-[13px] font-semibold">
									Usuario corporativo
								</span>
								<div className="login-field flex h-11 items-center rounded-lg pl-3.5 pr-1.5">
									<Mail
										aria-hidden="true"
										className="shrink-0 text-[var(--muted)]"
										size={16}
									/>
									<input
										autoComplete="username"
										className="min-w-0 flex-1 bg-transparent px-2.5 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
										name="email"
										placeholder="usuario"
										required
									/>
									<span className="hidden shrink-0 whitespace-nowrap pr-2.5 text-xs font-medium text-[var(--muted)] sm:block">
										@{COMPANY_EMAIL_DOMAIN}
									</span>
								</div>
								<p className="mt-1 text-[11px] text-[var(--muted)]">
									Solo escribe tu usuario, el dominio ya está incluido.
								</p>
							</label>

							<div className="block">
								<label
									className="mb-1.5 block text-[13px] font-semibold"
									htmlFor="login-password"
								>
									Contraseña
								</label>
								<PasswordInput />
							</div>

							<button
								className="login-submit focus-ring flex h-11 w-full items-center justify-center gap-2.5 rounded-lg bg-[var(--brand-red)] text-sm font-bold text-white"
								type="submit"
							>
								<span className="grid size-6 place-items-center rounded-md bg-white/15">
									<ArrowRight aria-hidden="true" size={14} />
								</span>
								Entrar al sistema
							</button>
						</form>

						<div className="login-divider my-4">
							<span aria-hidden="true" />
							<span>o</span>
							<span aria-hidden="true" />
						</div>

						<PasskeyLogin />

						<div className="mt-4 flex items-start gap-2 border-t border-[var(--border)] pt-4 text-[var(--muted)]">
							<ShieldCheck
								aria-hidden="true"
								className="mt-0.5 shrink-0 text-[var(--brand-red)]"
								size={14}
							/>
							<p className="text-[11px] leading-relaxed">
								<span className="block font-bold text-[var(--foreground)]">
									Sistema seguro | HM Constructora
								</span>
								Uso exclusivo para personal autorizado.
							</p>
						</div>
					</div>
				</section>
			</div>
		</main>
	);
}
