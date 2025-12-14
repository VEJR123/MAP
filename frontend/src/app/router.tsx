import { createBrowserRouter } from "react-router-dom";
import { SwimmersPage } from "@/components/features/swimmers/SwimmersPage";
import { SwimmerDetailPage } from "@/components/features/swimmers/SwimmerDetailPage";
import { RelayOptimizerPage } from "@/components/features/relay-optimizer/RelayOptimizerPage";
import { LeagueBuilderPage } from "@/components/features/league-builder/LeagueBuilderPage";

export const router = createBrowserRouter([
  { path: "/", element: <SwimmersPage /> },
  { path: "/swimmers", element: <SwimmersPage /> },
  { path: "/swimmers/:id", element: <SwimmerDetailPage /> },
  { path: "/relay", element: <RelayOptimizerPage /> },
  { path: "/league", element: <LeagueBuilderPage /> },
]);


