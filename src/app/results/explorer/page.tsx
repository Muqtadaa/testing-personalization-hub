import { Suspense } from "react";
import ExplorerView from "@/components/results/ExplorerView";
import { PageSkeleton } from "@/components/results/atoms";

// useSearchParams (URL-synced filters) requires a Suspense boundary.
export default function ExplorerPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ExplorerView />
    </Suspense>
  );
}
