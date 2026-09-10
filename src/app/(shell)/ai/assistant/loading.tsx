export default function AIAssistantLoading() {
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col p-6">
      <div className="mb-4 space-y-2">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex-1 animate-pulse rounded-lg border bg-muted/20" />
    </div>
  );
}
