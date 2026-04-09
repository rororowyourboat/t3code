import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import ChatView from "../components/ChatView";
import { selectEnvironmentState, selectThreadByRef, useStore } from "../store";
import { createThreadSelectorByRef } from "../storeSelectors";
import { resolveThreadRouteRef } from "../threadRoutes";

/**
 * Embed thread route.
 *
 * Renders a standalone conversation view for use inside iframes (e.g. the
 * `t3-canvas` desktop shell embeds T3 Code threads as tiles on an infinite
 * canvas). The route intentionally bypasses the app's sidebar layout — see
 * `__root.tsx` for the `/embed/` pathname guard that skips `AppSidebarLayout`.
 *
 * URL: /embed/thread/:environmentId/:threadId?minimal=1
 *
 * Query params:
 *   minimal=1  — reserved for a future pass that hides remaining chrome
 *                (BranchToolbar, PlanSidebar, ThreadTerminalDrawer). MVP
 *                just wires the param through to a data attribute so the
 *                host iframe can target it with scoped CSS if needed.
 */

export interface EmbedThreadSearch {
  minimal?: "1" | undefined;
}

function isMinimalValue(value: unknown): boolean {
  return value === "1" || value === 1 || value === true || value === "true";
}

function parseEmbedThreadSearch(search: Record<string, unknown>): EmbedThreadSearch {
  return isMinimalValue(search.minimal) ? { minimal: "1" } : {};
}

function EmbedThreadRouteView() {
  const threadRef = Route.useParams({
    select: (params) => resolveThreadRouteRef(params),
  });
  const search = Route.useSearch();

  const bootstrapComplete = useStore(
    (store) => selectEnvironmentState(store, threadRef?.environmentId ?? null).bootstrapComplete,
  );

  const threadSelector = useMemo(() => createThreadSelectorByRef(threadRef), [threadRef]);
  const serverThread = useStore(threadSelector);
  const threadExists = useStore((store) => selectThreadByRef(store, threadRef) !== undefined);

  if (!threadRef) {
    return (
      <EmbedError title="Invalid thread reference" detail="No environmentId/threadId in URL" />
    );
  }

  if (!bootstrapComplete) {
    return <EmbedMessage label="Loading thread…" />;
  }

  if (!threadExists || !serverThread) {
    return (
      <EmbedError
        title="Thread not found"
        detail={`No thread with id ${threadRef.threadId} in environment ${threadRef.environmentId}`}
      />
    );
  }

  return (
    <div
      data-t3-embed="thread"
      data-t3-embed-minimal={search.minimal === "1" ? "true" : "false"}
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--background, #fff)",
        color: "var(--foreground, #000)",
      }}
    >
      <ChatView
        environmentId={threadRef.environmentId}
        threadId={threadRef.threadId}
        routeKind="server"
      />
    </div>
  );
}

function EmbedMessage({ label }: { label: string }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--muted-foreground, #666)",
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
        fontSize: 14,
      }}
    >
      {label}
    </div>
  );
}

function EmbedError({ title, detail }: { title: string; detail: string }) {
  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: 24,
        background: "var(--background, #fff)",
        color: "var(--foreground, #000)",
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
      }}
    >
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{title}</h2>
      <p style={{ margin: 0, fontSize: 13, opacity: 0.7, textAlign: "center" }}>{detail}</p>
    </div>
  );
}

export const Route = createFileRoute("/embed/thread/$environmentId/$threadId")({
  validateSearch: (search) => parseEmbedThreadSearch(search),
  component: EmbedThreadRouteView,
});
