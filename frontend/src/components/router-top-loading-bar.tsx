import { useEffect, useRef } from "react";
import LoadingBar, {
  type LoadingBarRef,
} from "react-top-loading-bar";
import { useRouterState } from "@tanstack/react-router";

export function RouterTopLoadingBar() {
  const loadingBarRef = useRef<LoadingBarRef | null>(null);

  const isLoading = useRouterState({
    select: (state) => state.isLoading,
  });

  useEffect(() => {
    const bar = loadingBarRef.current;
    if (!bar) return;

    if (isLoading) {
      bar.continuousStart(30, 200);
    } else {
      bar.complete();
    }
  }, [isLoading]);

  return (
    <LoadingBar
      ref={loadingBarRef}
      height={2}
      color="var(--primary)"
      shadow={false}
      waitingTime={200}
      loaderSpeed={300}
      className="z-[9999]"
      containerClassName="fixed top-0 left-0 right-0"
    />
  );
}
