import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, FileQuestion } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  const navigateWithQuery = (path: string) => {
    const params = new URLSearchParams(window.location.search);
    const query = params.toString();

    navigate(query ? path + "?" + query : path);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex min-h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <button
            onClick={() => navigateWithQuery("/")}
            className="text-sm font-semibold tracking-tight transition-colors hover:text-muted-foreground"
          >
            NoteShare
          </button>

          <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            404
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto flex min-h-[calc(100vh-57px)] w-full max-w-5xl items-center px-4 py-12 sm:px-6">
        <div className="w-full">
          <div className="grid gap-10 lg:grid-cols-[1fr_280px] lg:items-center">
            {/* Main message */}
            <section>
              <div className="mb-6 flex h-12 w-12 items-center justify-center border border-border bg-card">
                <FileQuestion className="h-5 w-5 text-muted-foreground" />
              </div>

              <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Nothing here
              </p>

              <h1 className="max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
                This page doesn't exist.
              </h1>

              <p className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">
                The link may be incorrect, expired, or the share you're
                looking for may no longer be available.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={() => navigateWithQuery("/")}
                  className="inline-flex h-11 items-center justify-center gap-2 bg-primary px-5 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to home
                </button>

                <button
                  onClick={() => window.history.back()}
                  className="inline-flex h-11 items-center justify-center border border-border px-5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Go back
                </button>
              </div>
            </section>

            {/* Route information */}
            <aside className="border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Requested path
                </p>
              </div>

              <div className="px-4 py-5">
                <code className="block break-all text-sm leading-6 text-foreground">
                  {location.pathname}
                </code>
              </div>

              <div className="border-t border-border px-4 py-4">
                <p className="text-xs leading-5 text-muted-foreground">
                  Check the URL and try again, or return to your shares.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
