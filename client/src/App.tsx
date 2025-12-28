import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Analytics from "./pages/Analytics";
import Admin from "./pages/Admin";
import Operations from "./pages/Operations";
import EntityMap from "./pages/EntityMap";
import Landing from "./pages/Landing";
import ComparativeAnalysis from "./pages/ComparativeAnalysis";
import CaseLaw from "./pages/CaseLaw";
import ComplaintRegistry from "./pages/ComplaintRegistry";

function ProtectedRouter() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/analytics"} component={Analytics} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/operations"} component={Operations} />
      <Route path={"/entity-map"} component={EntityMap} />
      <Route path="/comparative-analysis" component={ComparativeAnalysis} />
            <Route path="/case-law" component={CaseLaw} />
      <Route path="/complaint-registry" component={ComplaintRegistry} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function AccessGate() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  
  useEffect(() => {
    // Check if user has access from session storage
    const access = sessionStorage.getItem("ruzn_access");
    setHasAccess(access === "granted");
  }, []);
  
  const handleAccessGranted = () => {
    setHasAccess(true);
  };
  
  // Loading state
  if (hasAccess === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary text-2xl font-bold">رُزن</div>
      </div>
    );
  }
  
  // Show landing page if no access
  if (!hasAccess) {
    return <Landing onAccessGranted={handleAccessGranted} />;
  }
  
  // Show protected routes if access granted
  return <ProtectedRouter />;
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <AccessGate />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
