import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Calendar,
  FileText,
  Link2,
  MoreHorizontal,
  Shield,
  Trash2,
  Upload,
  Users,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const isPortfolioEmbed = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('source') === 'yukisf';
};


interface UserShare {
  id: string;
  title: string;
  type: 'note' | 'file';
  createdAt: string;
  customLink?: string;
}

export const HomePage = () => {
  const navigate = useNavigate();
  const [userShares, setUserShares] = useState<UserShare[]>([]);

  useEffect(() => {
    const shares = localStorage.getItem('userShares');

    if (shares) {
      try {
        setUserShares(JSON.parse(shares));
      } catch {
        setUserShares([]);
      }
    }
  }, []);

  const removeShare = (id: string) => {
    const updatedShares = userShares.filter((share) => share.id !== id);

    setUserShares(updatedShares);
    localStorage.setItem('userShares', JSON.stringify(updatedShares));
  };

  const openShare = (share: UserShare) => {
    window.open(`/${share.customLink || share.id}`, '_blank');
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* ---------------------------------------------------------
          HERO
      --------------------------------------------------------- */}
      <section className="border-b">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid min-h-[680px] items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20 lg:py-20">

            {/* Left */}
            <div className="max-w-2xl">
              <div className="mb-8 inline-flex items-center gap-2 border border-border bg-muted/40 px-3 py-1.5 text-sm font-medium">
                <span className="h-1.5 w-1.5 bg-primary" />
                NoteShare
              </div>

              <h1 className="text-5xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                Put a link
                <br />
                on your{' '}
                <span className="text-muted-foreground">stuff.</span>
              </h1>

              <p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                Share notes, files and small pieces of information without
                turning every share into another account, app or conversation.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => navigate('/create')}
                  className="group inline-flex h-12 items-center justify-center gap-2 bg-primary px-6 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
                >
                  Create a share
                  <ArrowUpRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </button>

                <button
                  onClick={() => window.open('/example-note', '_blank')}
                  className="inline-flex h-12 items-center justify-center gap-2 border border-border px-6 text-sm font-medium transition-colors hover:bg-muted"
                >
                  See an example
                </button>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5" />
                  No sign-up
                </span>

                <span className="h-3 w-px bg-border" />

                <span className="flex items-center gap-2">
                  <Link2 className="h-3.5 w-3.5" />
                  Custom links
                </span>

                <span className="h-3 w-px bg-border" />

                <span className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5" />
                  Expiring shares
                </span>
              </div>
            </div>

            {/* Right — product preview */}
            <div className="relative">
              <div className="absolute -inset-5 -z-10 bg-muted/50" />

              <div className="border border-border bg-background shadow-2xl shadow-black/[0.04]">
                {/* Fake browser/header */}
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                  </div>

                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </div>

                {/* Share preview */}
                <div className="p-6 sm:p-8">
                  <div className="mb-8 flex items-start justify-between gap-4">
                    <div>
                      <div className="mb-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Shared note
                      </div>

                      <h3 className="text-xl font-semibold tracking-tight">
                        Things worth remembering
                      </h3>
                    </div>

                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>

                  <div className="space-y-4 text-sm leading-6 text-muted-foreground">
                    <p>
                      A clean place for something you need to send to somebody
                      else.
                    </p>

                    <div className="border-l-2 border-primary pl-4 text-foreground">
                      No account. No unnecessary dashboard. Just a link.
                    </div>

                    <p>
                      Send the URL, let them read it, and move on.
                    </p>
                  </div>

                  <div className="mt-8 border-t pt-5">
                    <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      Share link
                    </div>

                    <div className="flex items-center justify-between gap-3 border bg-muted/30 px-3 py-2.5">
                      <span className="truncate text-sm">
                        {isPortfolioEmbed()
                          ? 'yukisf.me/note-share/my-note'
                          : window.location.hostname + '/my-note'}
                      </span>

                      <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Small floating detail */}
              <div className="absolute -bottom-5 -left-5 hidden border bg-background px-4 py-3 shadow-lg sm:block">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center bg-primary text-primary-foreground">
                    <Link2 className="h-4 w-4" />
                  </div>

                  <div>
                    <div className="text-xs font-medium">Ready to share</div>
                    <div className="text-[11px] text-muted-foreground">
                      Custom link created
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------
          SIMPLE INTRO
      --------------------------------------------------------- */}
      <section className="border-b">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
          <div className="grid gap-10 md:grid-cols-[0.7fr_1.3fr] md:items-start">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                What it does
              </p>
            </div>

            <div className="max-w-3xl">
              <p className="text-2xl font-medium leading-9 tracking-tight sm:text-3xl">
                NoteShare is deliberately simple. Create something, give it a
                useful URL, and send it to someone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------
          FEATURES
      --------------------------------------------------------- */}
      <section className="border-b">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
          <div className="mb-12 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Built for sharing
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Just enough control.
              </h2>
            </div>

            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              Useful controls when you need them, without turning a simple
              share into a complicated publishing workflow.
            </p>
          </div>

          <div className="grid border-l border-t sm:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon={FileText}
              title="Notes"
              description="Write something quickly and turn it into a clean, readable page."
            />

            <Feature
              icon={Upload}
              title="Files"
              description="Share documents and other files through a dedicated link."
            />

            <Feature
              icon={Link2}
              title="Custom URLs"
              description="Give your share a short, memorable path instead of a random ID."
            />

            <Feature
              icon={Calendar}
              title="Expiration"
              description="Let temporary content disappear when it is no longer useful."
            />

            <Feature
              icon={Users}
              title="No account for viewers"
              description="Recipients can open a share without creating another account."
            />

            <Feature
              icon={Shield}
              title="Private by default"
              description="Keep your shared content separate and under your control."
            />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------
          USER SHARES
      --------------------------------------------------------- */}
      {userShares.length > 0 && (
        <section className="border-b bg-muted/20">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
            <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Local history
                </p>

                <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                  Your shares
                </h2>
              </div>

              <button
                onClick={() => navigate('/create')}
                className="inline-flex h-10 items-center justify-center border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
              >
                Create another
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
              {userShares.map((share) => (
                <article
                  key={share.id}
                  className="group relative bg-background p-5 transition-colors hover:bg-muted/40"
                >
                  <div className="mb-8 flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center border">
                        {share.type === 'note' ? (
                          <FileText className="h-4 w-4" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-medium">
                          {share.title}
                        </h3>

                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {share.type === 'note' ? 'Note' : 'File'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => removeShare(share.id)}
                      aria-label={`Delete ${share.title}`}
                      className="shrink-0 p-1.5 text-muted-foreground opacity-60 transition-colors hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        Created
                      </p>

                      <p className="mt-1 text-xs">
                        {new Date(share.createdAt).toLocaleDateString(
                          undefined,
                          {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          }
                        )}
                      </p>
                    </div>

                    <button
                      onClick={() => openShare(share)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
                    >
                      Open
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------
          FINAL CTA
      --------------------------------------------------------- */}
      <section>
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Start small
              </p>

              <h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
                You probably just need a link.
              </h2>
            </div>

            <button
              onClick={() => navigate('/create')}
              className="group inline-flex h-12 items-center justify-center gap-2 bg-primary px-6 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              Create a share
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};

/* ---------------------------------------------------------
   FEATURE COMPONENT
--------------------------------------------------------- */

interface FeatureProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

const Feature = ({
  icon: Icon,
  title,
  description,
}: FeatureProps) => {
  return (
    <div className="group border-b border-r bg-background p-7 transition-colors hover:bg-muted/40">
      <div className="mb-12 flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center border">
          <Icon className="h-4 w-4" />
        </div>

        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" />
      </div>

      <h3 className="text-base font-semibold">{title}</h3>

      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
};
