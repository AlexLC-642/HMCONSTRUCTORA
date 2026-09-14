import { Mail } from "lucide-react";
import Image from "next/image";
import { loginAction } from "@/modules/auth/application/actions";
import { COMPANY_EMAIL_DOMAIN } from "@/modules/auth/domain/email-domain";
import { PasskeyLogin } from "@/modules/auth/ui/passkey-login";
import { PasswordInput } from "@/modules/auth/ui/password-input";

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

export default async function LoginPage({ searchParams }: LoginPageProps) {
	const params = await searchParams;
	const message = errorMessage(params.error);

	return (
		<main className="login-stage relative min-h-screen overflow-hidden bg-[#f5f6f2] text-[#14191b]">
			<div className="login-beam" aria-hidden="true" />
			<div className="login-bottom-band" aria-hidden="true" />
			<div className="login-red-wash" aria-hidden="true" />

			<section className="relative grid min-h-screen grid-rows-[auto_1fr_auto] px-6 py-8 sm:px-10 lg:grid-cols-[1.02fr_0.98fr] lg:grid-rows-[auto_1fr_auto] lg:px-16">
				<header className="login-brand-mark flex items-center gap-4 lg:col-span-2">
					<div className="relative grid size-[74px] shrink-0 place-items-center rounded-lg border border-[#cfd3cf] bg-white shadow-[0_12px_32px_rgba(20,25,27,0.14)] sm:size-[86px]">
						<Image
							alt="Logo del sistema"
							className="object-contain p-2.5"
							fill
							priority
							sizes="86px"
							src="/brand/logo.png"
						/>
					</div>
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">
							Control de obra
						</h1>
					</div>
				</header>

				<section className="flex max-w-2xl flex-col justify-center py-14 lg:py-0">
					<p className="login-kicker text-sm font-bold uppercase tracking-[0.34em] text-[var(--brand-red)]">
						Control de obra
					</p>
					<h2 className="mt-6 max-w-[580px] text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.03em] sm:text-5xl lg:text-[58px]">
						Gestión interna de proyectos.
					</h2>

					<div className="login-scope-line mt-10 flex max-w-[520px] flex-wrap items-center gap-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#52605b]">
						<span>Proyectos</span>
						<span aria-hidden="true" />
						<span>Avances</span>
						<span aria-hidden="true" />
						<span>Documentos</span>
					</div>
				</section>

				<section className="flex items-center justify-center pb-16 lg:pb-0">
					<div className="login-card w-full max-w-[500px] rounded-xl p-8 sm:p-10">
						<div className="mb-8 flex items-center gap-5">
							<div className="relative grid size-[82px] shrink-0 place-items-center rounded-xl border border-[#d7d9d6] bg-white shadow-[0_14px_34px_rgba(20,25,27,0.15)]">
								<Image
									alt="Logo del sistema"
									className="object-contain p-2.5"
									fill
									priority
									sizes="82px"
									src="/brand/logo.png"
								/>
							</div>
							<div>
								<p className="text-xs font-bold uppercase tracking-[0.32em] text-[var(--brand-red)]">
									Acceso autorizado
								</p>
								<h3 className="mt-3 text-3xl font-semibold tracking-[-0.02em]">
									Iniciar sesion
								</h3>
							</div>
						</div>

						{message ? (
							<p className="mb-5 rounded-md border border-[#efb5b9] bg-[#fff2f3] px-3 py-2 text-sm text-[var(--danger)]">
								{message}
							</p>
						) : null}

						<form action={loginAction} className="space-y-5">
							<label className="block">
								<span className="mb-2 block text-sm font-medium">
									Usuario corporativo
								</span>
								<div className="login-input-row flex h-12 overflow-hidden rounded-md border border-[#cfd3cf] bg-white">
									<span className="grid w-12 place-items-center border-r border-[#dfe2df] bg-[#f7f6f1] text-[#68716d]">
										<Mail aria-hidden="true" size={18} />
									</span>
									<input
										className="min-w-0 flex-1 px-3 text-base outline-none placeholder:text-[#87918d]"
										name="email"
										autoComplete="username"
										placeholder="admin"
										required
									/>
									<span className="hidden border-l border-[#dfe2df] bg-[#f7f6f1] px-3 py-3 text-sm text-[#54605c] sm:block">
										@{COMPANY_EMAIL_DOMAIN}
									</span>
								</div>
							</label>

							<div className="block">
								<label
									className="mb-2 block text-sm font-medium"
									htmlFor="login-password"
								>
									Contraseña
								</label>
								<PasswordInput />
							</div>

							<button
								className="login-submit focus-ring h-14 w-full rounded-md bg-[var(--brand-red)] px-4 text-lg font-semibold text-white shadow-[0_18px_36px_rgba(200,32,47,0.24)]"
								type="submit"
							>
								Entrar al sistema
							</button>
						</form>
						<PasskeyLogin />
					</div>
				</section>

				<footer className="pb-4 text-xs uppercase tracking-[0.34em] text-[#5e6865] lg:col-span-2">
					Sistema interno
				</footer>
			</section>
		</main>
	);
}
