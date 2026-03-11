import { Switch, Route, Redirect, useSearch } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { Layout } from "@/components/layout";
import LandingPage from "@/pages/landing";
import AuthPage from "@/pages/auth";
import CheckInPage from "@/pages/check-in";
import FriendsPage from "@/pages/friends";
import MePage from "@/pages/me";
import NotFound from "@/pages/not-found";

function AuthVerifyRedirect() {
  const search = useSearch();
  return <Redirect to={`/auth${search ? `?${search}` : ''}`} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/auth/verify" component={AuthVerifyRedirect} />
      
      {/* App Routes wrapped in Layout */}
      <Route path="/check-in">
        <Layout><CheckInPage /></Layout>
      </Route>
      <Route path="/friends">
        <Layout><FriendsPage /></Layout>
      </Route>
      <Route path="/me">
        <Layout><MePage /></Layout>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
