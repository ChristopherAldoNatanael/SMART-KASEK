export default function TeachersLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-10 w-28 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="rounded-lg border">
        <div className="border-b p-4">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border-b p-4">
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
