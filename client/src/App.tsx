import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import PropertyDetail from "@/pages/PropertyDetail";
import Publish from "@/pages/Publish";
import Admin from "@/pages/Admin";
import { Route, Router, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ScrollRevealObserver from "@/lib/ScrollRevealObserver";
import Home from "./pages/Home";

function useGithubPagesLocation(): ReturnType<typeof useHashLocation> {
  const [location, navigate] = useHashLocation();
  const cleanPath = window.location.pathname.replace(/\/+$/, "") || "/";
  const currentLocation = window.location.hash ? location : cleanPath;
  return [currentLocation.split("?")[0], navigate];
}

function AppRoutes() {
  return (
    <Router hook={useGithubPagesLocation} hrefs={(href) => `#${href}`}>
      <ScrollRevealObserver />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/propiedad/:slug" component={PropertyDetail} />
        <Route path="/publicar" component={Publish} />
        <Route path="/admin" component={Admin} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Router>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <AppRoutes />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
