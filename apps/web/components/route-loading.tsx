interface RouteLoadingProps {
  variant: "global" | "dashboard";
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`loading-skeleton ${className}`} aria-hidden="true" />;
}

export function RouteLoading({ variant }: RouteLoadingProps) {
  if (variant === "global") {
    return (
      <main
        className="global-route-loading"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="route-loading-bar" aria-hidden="true" />
        <div className="global-route-loading__mark" aria-hidden="true">
          <span />
        </div>
        <strong>Pila</strong>
        <p>Preparando sua experiência...</p>
        <span className="sr-only">Carregando página</span>
      </main>
    );
  }

  return (
    <div
      className="dashboard-page dashboard-route-loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="route-loading-bar" aria-hidden="true" />
      <span className="sr-only">Carregando conteúdo financeiro</span>

      <div className="dashboard-loading-header">
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      <div className="dashboard-loading-stats">
        {["balance", "expenses", "income", "transactions"].map((item) => (
          <div className="loading-card" key={item}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-5 h-8 w-36" />
            <Skeleton className="mt-3 h-3 w-28" />
          </div>
        ))}
      </div>

      <div className="dashboard-loading-content">
        <div className="loading-card loading-card--large">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="mt-8 h-48 w-full" />
        </div>
        <div className="loading-card loading-card--large">
          <Skeleton className="h-5 w-40" />
          <div className="mt-8 space-y-5">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
