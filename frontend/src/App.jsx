import {
  ArrowRight,
  Layers3,
  LogIn,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router';

import { APPLICATION_IDENTITY } from '@/app/application-identity';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { Button } from '@/components/ui/button';

/**
 * Landing publique générique du Core.
 *
 * Cette surface fournit uniquement un point d'entrée professionnel et neutre
 * vers les parcours d'authentification du socle. Elle ne porte aucune promesse
 * métier afin de pouvoir être remplacée ou adaptée dans chaque SaaS dérivé
 * sans modifier les contrats Auth du Core.
 *
 * Les routes `/login` et `/register` restent les points d'entrée canoniques.
 * La sécurité et l'autorisation restent entièrement du ressort du backend et
 * des guards applicatifs ; les CTA de cette page ne sont qu'une navigation UX.
 */
function App() {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex min-h-svh w-full max-w-7xl flex-col px-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-border/70 py-6">
          <Link
            aria-label="Retour à l'accueil"
            className="flex items-center gap-3"
            to="/"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Layers3 aria-hidden="true" className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight">
                {APPLICATION_IDENTITY.shortName}
              </p>
              <p className="text-xs text-muted-foreground">
                {APPLICATION_IDENTITY.name}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild className="hidden sm:inline-flex" variant="ghost">
              <Link to="/login">Se connecter</Link>
            </Button>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
          <div className="max-w-3xl space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles aria-hidden="true" className="size-3.5 text-primary" />
              Base SaaS générique, sécurisée et extensible
            </div>

            <div className="space-y-5">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl lg:leading-[1.08]">
                Une base professionnelle pour construire votre application SaaS.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Authentification, espaces de travail, rôles, abonnements et
                administration sont déjà structurés dans le Core. Le métier de
                chaque application vient ensuite s'y intégrer sans casser ces
                fondations.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/register">
                  Créer un compte
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/login">
                  <LogIn aria-hidden="true" />
                  Se connecter
                </Link>
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Cette page est volontairement générique : elle pourra être
              remplacée par la vitrine propre à chaque SaaS dérivé.
            </p>
          </div>

          <aside className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck aria-hidden="true" className="size-6" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight">
                Des fondations prêtes à être spécialisées
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Le Core reste volontairement indépendant du secteur d'activité.
                Les fonctionnalités métier, la marque et le contenu commercial
                sont ajoutés après dérivation.
              </p>
            </div>

            <div className="mt-7 grid gap-3">
              {[
                'Authentification et gestion de session',
                'Workspaces, rôles et permissions',
                'Plans, abonnements et entitlements',
                'Administration Platform et audit',
              ].map((item) => (
                <div
                  className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm"
                  key={item}
                >
                  <span className="size-1.5 rounded-full bg-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

export default App;
