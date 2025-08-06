import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import ManagementPage from "@/pages/management";
import TimeAnalysisPage from "@/pages/time-analysis";
import NotFound from "@/pages/not-found";
import { usePomodoroAutoCompletion } from "@/hooks/use-pomodoro-auto-completion";
import { useTheme } from "@/hooks/use-theme";
import { useEffect } from "react";

// Apply DOM fix patch to prevent removeChild errors
import "./lib/dom-fix-patch";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/management" component={ManagementPage} />
      <Route path="/time-analysis" component={TimeAnalysisPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Component that initializes services inside QueryClientProvider
function AppServices() {
  const { theme, designPattern, getThemeClasses } = useTheme();

  // Apply theme classes to body and html
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    // Apply to HTML element (most important)
    html.setAttribute('data-theme', theme);
    html.className = `pattern-${designPattern}`;

    // Apply to body as well for extra specificity
    body.className = `theme-${theme} pattern-${designPattern} bg-theme-primary text-theme-primary`;

    // Force CSS variables update
    html.style.setProperty('--current-theme', theme);
    html.style.setProperty('--current-pattern', designPattern);

    console.log(`🎨 App: Tema aplicado - ${theme}, Padrão: ${designPattern}`);
  }, [theme, designPattern, getThemeClasses]);

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
