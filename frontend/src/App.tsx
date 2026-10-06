import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AuthProvider, RequireAuth } from "./auth/AuthProvider";
import { CallListProvider } from "./campaign/callList";
import { CampaignResultProvider } from "./campaign/campaignResult";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppShell } from "./components/layout/AppShell";
import { ToastProvider } from "./components/ui/Toast";
import { CallList } from "./pages/CallList";
import { CampaignFile } from "./pages/CampaignFile";
import { Dashboard } from "./pages/Dashboard";
import { HowItWorks } from "./pages/HowItWorks";
import { ModelInsights } from "./pages/ModelInsights";
import { NotFound } from "./pages/NotFound";
import { Predict } from "./pages/Predict";
import { SignIn } from "./pages/SignIn";
import { SignUp } from "./pages/SignUp";

function Desk() {
  return (
    <CallListProvider>
      <CampaignResultProvider>
        <AppShell />
      </CampaignResultProvider>
    </CallListProvider>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/sign-in" element={<SignIn />} />
              <Route path="/sign-up" element={<SignUp />} />
              <Route element={<RequireAuth />}>
                <Route element={<Desk />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/predict" element={<Predict />} />
                  <Route path="/campaign-file" element={<CampaignFile />} />
                  <Route path="/call-list" element={<CallList />} />
                  <Route path="/how-it-works" element={<HowItWorks />} />
                  <Route path="/model" element={<ModelInsights />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
