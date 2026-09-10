export default function EarlyWarningLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-10 w-40 animate-pulse rounded-md bg-muted" />
      <div className="h-64 animate-pulse rounded-lg border bg-muted" />
    </div>
  );
}
