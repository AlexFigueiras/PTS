export default function PatientsLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="bg-muted h-8 w-32 animate-pulse rounded-md" />
        <div className="bg-muted h-8 w-28 animate-pulse rounded-md" />
      </div>
      <div className="bg-muted h-10 w-full animate-pulse rounded-md" />
      <div className="rounded-lg border">
        <div className="divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="bg-muted h-4 flex-1 animate-pulse rounded" />
              <div className="bg-muted h-4 w-24 animate-pulse rounded" />
              <div className="bg-muted h-4 w-24 animate-pulse rounded" />
              <div className="bg-muted h-5 w-14 animate-pulse rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
