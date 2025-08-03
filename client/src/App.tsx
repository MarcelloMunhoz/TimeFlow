import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import ManagementPage from "@/pages/management";
import NotFound from "@/pages/not-found";
import { usePomodoroAutoCompletion } from "@/hooks/use-pomodoro-auto-completion";

// Apply DOM fix patch to prevent removeChild errors
import "./lib/dom-fix-patch";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/management" component={ManagementPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Component that initializes services inside QueryClientProvider
function AppServices() {
  // Pomodoro auto-completion service is now disabled - Pomodoros are created only on user request
  // usePomodoroAutoCompletion({
  //   enabled: false, // Disabled - Pomodoros are now optional via confirmation dialog
  //   checkIntervalMinutes: 5,
  //   showToastNotifications: false,
  //   onTasksCompleted: (result) => {
  //     console.log(`🍅 App: ${result.autoCompletedTasks.length} Pomodoro tasks auto-completed`);
  //   }
  // });

  return <Router />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppServices />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
