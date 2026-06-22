import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  RouterProvider,
  useRouterState,
} from "@tanstack/react-router";

import "./styles.css";
import { inTauri } from "./ipc/api";
import { Library } from "./routes/Library";
import { Presets } from "./routes/Presets";
import { SongWorkspace } from "./routes/SongWorkspace";
import { Skills } from "./routes/Skills";
import { Builder } from "./routes/Builder";
import { SettingsPage } from "./routes/Settings";
import { ChatRoute } from "./routes/TerminalRoute";

function Shell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const is = (p: string) => (p === "/" ? path === "/" : path.startsWith(p));
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          SONGSMITH STUDIO
          <small>co-write with claude</small>
        </div>
        <nav className="nav">
          <Link to="/" className={is("/") ? "active" : ""}>Library</Link>
          <Link to="/presets" className={is("/presets") ? "active" : ""}>Style presets</Link>
          <Link to="/builder" className={is("/builder") ? "active" : ""}>Builder</Link>
          <Link to="/skills" className={is("/skills") ? "active" : ""}>Skills</Link>
          <Link to="/chat" className={is("/chat") ? "active" : ""}>Chat</Link>
          <Link to="/settings" className={is("/settings") ? "active" : ""}>Settings</Link>
        </nav>
        <div className="spacer" />
        <div className="foot">
          {inTauri ? "tauri • claude engine" : "browser • mock data"}
          <br />
          v0.1.0 · GPL-3.0
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

const rootRoute = createRootRoute({ component: Shell });
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: Library });
const presetsRoute = createRoute({ getParentRoute: () => rootRoute, path: "/presets", component: Presets });
const songRoute = createRoute({ getParentRoute: () => rootRoute, path: "/song/$id", component: SongWorkspace });
const skillsRoute = createRoute({ getParentRoute: () => rootRoute, path: "/skills", component: Skills });
const builderRoute = createRoute({ getParentRoute: () => rootRoute, path: "/builder", component: Builder });
const chatRoute = createRoute({ getParentRoute: () => rootRoute, path: "/chat", component: ChatRoute });
const settingsRoute = createRoute({ getParentRoute: () => rootRoute, path: "/settings", component: SettingsPage });

const routeTree = rootRoute.addChildren([indexRoute, presetsRoute, songRoute, skillsRoute, builderRoute, chatRoute, settingsRoute]);
const router = createRouter({ routeTree });
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);
