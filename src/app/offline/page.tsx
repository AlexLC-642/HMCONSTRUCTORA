import { ShieldCheck } from "lucide-react";
import { ConnectionLoader } from "@/shared/offline/connection-loader";
import { OfflineActions } from "@/shared/offline/offline-actions";

export default function OfflinePage() {
	return (
		<main className="system-state-page">
			<style>{criticalOfflineStyles}</style>
			<section className="system-state-card" aria-labelledby="offline-title">
				<div className="system-state-accent" aria-hidden="true" />
				<div className="system-state-brand">
					{/* biome-ignore lint/performance/noImgElement: the cached offline document must not depend on Next image optimization */}
					<img
						alt="HM Constructora"
						height="44"
						src="/brand/logo.png"
						width="44"
					/>
					<div>
						<strong>Control de obra</strong>
						<span>HM Constructora</span>
					</div>
				</div>

				<ConnectionLoader />
				<h1 id="offline-title">Conexión interrumpida</h1>
				<p className="system-state-description">
					Estamos esperando que el servidor o internet vuelvan a estar
					disponibles.
				</p>
				<div className="system-state-assurance">
					<ShieldCheck aria-hidden="true" size={17} />
					<span>Tus datos guardados permanecen protegidos.</span>
				</div>
				<OfflineActions />
				<p className="system-state-footnote">
					La comprobación también se realiza automáticamente.
				</p>
			</section>
		</main>
	);
}

const criticalOfflineStyles = `
.system-state-page{box-sizing:border-box;display:grid;min-height:100vh;place-items:center;padding:24px;background:radial-gradient(circle at 12% 8%,rgba(31,122,91,.12),transparent 32rem),radial-gradient(circle at 92% 12%,rgba(200,32,47,.1),transparent 30rem),#eef0ec;color:#111719;font-family:Aptos,"Segoe UI",sans-serif}.system-state-card{position:relative;width:min(100%,540px);overflow:hidden;border-radius:16px;background:#fff;padding:32px 36px;box-shadow:0 28px 75px rgba(17,29,26,.18);text-align:center}.system-state-accent{position:absolute;inset:0 0 auto;height:6px;background:linear-gradient(90deg,#1f7a5b 0 50%,#c8202f 50%)}.system-state-brand{display:flex;align-items:center;gap:12px;text-align:left}.system-state-brand img{border:1px solid #d7ddd7;border-radius:10px;object-fit:contain}.system-state-brand strong,.system-state-brand span{display:block}.system-state-brand span{margin-top:2px;color:#5a6661;font-size:12px}.system-state-card h1{margin:0;font-size:30px;letter-spacing:-.03em}.system-state-description{max-width:44ch;margin:10px auto 0;color:#4f5a55;line-height:1.6}.system-state-assurance{display:flex;width:max-content;max-width:100%;align-items:center;gap:8px;margin:18px auto;color:#176c4b;font-size:13px;font-weight:600}.system-state-primary-action{display:inline-flex;min-height:46px;align-items:center;justify-content:center;gap:9px;border:0;border-radius:11px;background:#c8202f;padding:0 20px;color:#fff;font-size:14px;font-weight:700;box-shadow:0 14px 30px rgba(200,32,47,.25);cursor:pointer}.system-state-primary-action:disabled{cursor:wait;opacity:.72}.system-state-footnote,.system-state-retry-message{margin:14px auto 0;color:#65706b;font-size:12px;line-height:1.55}.connection-loader{display:grid;margin:26px auto 12px;place-items:center}.connection-loader__graphic{width:76px;height:76px}.connection-loader__ring{animation:connectionRingA 2s linear infinite;stroke:#c8202f}.connection-loader__ring--b{animation-name:connectionRingB;stroke:#f2a900}.connection-loader__ring--c{animation-name:connectionRingC;stroke:#23835f}.connection-loader__ring--d{animation-name:connectionRingD;stroke:#354247}@keyframes connectionRingA{from,4%{stroke-dasharray:0 660;stroke-width:20;stroke-dashoffset:-330}12%{stroke-dasharray:60 600;stroke-width:30;stroke-dashoffset:-335}32%{stroke-dasharray:60 600;stroke-width:30;stroke-dashoffset:-595}40%,54%{stroke-dasharray:0 660;stroke-width:20;stroke-dashoffset:-660}62%{stroke-dasharray:60 600;stroke-width:30;stroke-dashoffset:-665}82%{stroke-dasharray:60 600;stroke-width:30;stroke-dashoffset:-925}90%,to{stroke-dasharray:0 660;stroke-width:20;stroke-dashoffset:-990}}@keyframes connectionRingB{from,12%{stroke-dasharray:0 220;stroke-width:20;stroke-dashoffset:-110}20%{stroke-dasharray:20 200;stroke-width:30;stroke-dashoffset:-115}40%{stroke-dasharray:20 200;stroke-width:30;stroke-dashoffset:-195}48%,62%{stroke-dasharray:0 220;stroke-width:20;stroke-dashoffset:-220}70%{stroke-dasharray:20 200;stroke-width:30;stroke-dashoffset:-225}90%{stroke-dasharray:20 200;stroke-width:30;stroke-dashoffset:-305}98%,to{stroke-dasharray:0 220;stroke-width:20;stroke-dashoffset:-330}}@keyframes connectionRingC{from{stroke-dasharray:0 440;stroke-width:20;stroke-dashoffset:0}8%{stroke-dasharray:40 400;stroke-width:30;stroke-dashoffset:-5}28%{stroke-dasharray:40 400;stroke-width:30;stroke-dashoffset:-175}36%,58%{stroke-dasharray:0 440;stroke-width:20;stroke-dashoffset:-220}66%{stroke-dasharray:40 400;stroke-width:30;stroke-dashoffset:-225}86%{stroke-dasharray:40 400;stroke-width:30;stroke-dashoffset:-395}94%,to{stroke-dasharray:0 440;stroke-width:20;stroke-dashoffset:-440}}@keyframes connectionRingD{from,8%{stroke-dasharray:0 440;stroke-width:20;stroke-dashoffset:0}16%{stroke-dasharray:40 400;stroke-width:30;stroke-dashoffset:-5}36%{stroke-dasharray:40 400;stroke-width:30;stroke-dashoffset:-175}44%,50%{stroke-dasharray:0 440;stroke-width:20;stroke-dashoffset:-220}58%{stroke-dasharray:40 400;stroke-width:30;stroke-dashoffset:-225}78%{stroke-dasharray:40 400;stroke-width:30;stroke-dashoffset:-395}86%,to{stroke-dasharray:0 440;stroke-width:20;stroke-dashoffset:-440}}@media(max-width:560px){.system-state-page{padding:14px}.system-state-card{padding:26px 20px}.system-state-card h1{font-size:25px}}@media(prefers-reduced-motion:reduce){.connection-loader__ring{animation:none;stroke-dasharray:40 440;stroke-width:24}}
`;
