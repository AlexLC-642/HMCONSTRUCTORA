import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { getPublicWebsiteContent } from "@/modules/website/application/queries";
import { websiteDefaults, withDefault } from "@/modules/website/domain/defaults";

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getPublicWebsiteContent();
  return {
    title: {
      default: withDefault(settings?.seoTitle, websiteDefaults.seoTitle),
      template: "%s | HM Constructora"
    },
    description: withDefault(settings?.seoDescription, websiteDefaults.seoDescription)
  };
}

const navLinks: Array<{ href: Route; label: string }> = [
  { href: "/", label: "Inicio" },
  { href: "/servicios", label: "Servicios" },
  { href: "/proyectos", label: "Construcciones" },
  { href: "/contacto", label: "Contacto" }
];

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const { settings } = await getPublicWebsiteContent();
  const phonePrimary = withDefault(settings?.phonePrimary, websiteDefaults.phonePrimary);
  const phoneSecondary = withDefault(settings?.phoneSecondary, websiteDefaults.phoneSecondary);
  const email = withDefault(settings?.email, websiteDefaults.email);
  const address = withDefault(settings?.address, websiteDefaults.address);
  const hoursWeekdays = withDefault(settings?.hoursWeekdays, websiteDefaults.hoursWeekdays);
  const hoursSaturday = withDefault(settings?.hoursSaturday, websiteDefaults.hoursSaturday);
  const facebookUrl = withDefault(settings?.facebookUrl, websiteDefaults.facebookUrl);
  const instagramUrl = withDefault(settings?.instagramUrl, websiteDefaults.instagramUrl);

  return (
    <div className="public-site">
      <header className="public-nav">
        <div className="public-nav__inner">
          <Link className="public-nav__brand" href="/">
            <Image alt="HM Constructora" height={80} priority src="/brand/logo.png" width={87} />
          </Link>
          <nav aria-label="Navegación principal" className="public-nav__links">
            {navLinks.map((link) => (
              <Link href={link.href} key={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
          <Link className="public-nav__cta" href="/contacto">
            Solicitar cotización
          </Link>
        </div>
      </header>

      <main>{children}</main>

      <footer className="public-footer">
        <div className="public-footer__grid">
          <div className="public-footer__brand">
            <Image alt="HM Constructora" height={44} src="/brand/logo.png" width={44} />
            <p>
              Constructora H&amp;M — tu aliado estratégico en la materialización de proyectos
              arquitectónicos y de ingeniería.
            </p>
          </div>
          <div>
            <p className="public-footer__heading">Navegación</p>
            <ul>
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="public-footer__heading">Contacto</p>
            <ul>
              <li>
                <a href={`tel:${phonePrimary.replace(/[^+\d]/g, "")}`}>{phonePrimary}</a>
              </li>
              <li>
                <a href={`tel:${phoneSecondary.replace(/[^+\d]/g, "")}`}>{phoneSecondary}</a>
              </li>
              <li>
                <a href={`mailto:${email}`}>{email}</a>
              </li>
              <li>{address}</li>
            </ul>
          </div>
          <div>
            <p className="public-footer__heading">Horario</p>
            <ul>
              <li>{hoursWeekdays}</li>
              <li>{hoursSaturday}</li>
            </ul>
            <p className="public-footer__heading">Síguenos</p>
            <ul>
              <li>
                <a href="https://www.facebook.com/" rel="noreferrer" target="_blank">
                  Facebook — {facebookUrl}
                </a>
              </li>
              <li>
                <a href="https://www.instagram.com/" rel="noreferrer" target="_blank">
                  Instagram — {instagramUrl}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="public-footer__bottom">
          <span>© {new Date().getFullYear()} Constructora H&amp;M. Todos los derechos reservados.</span>
          <Link href={"/login" as Route}>Acceso interno</Link>
        </div>
      </footer>
    </div>
  );
}
