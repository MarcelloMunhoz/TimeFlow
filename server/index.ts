import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";

console.log('🚀 SERVIDOR INICIANDO COM CÓDIGO ATUALIZADO - VERSÃO NOVA!');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});


(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Run timer fields migration on startup
  try {
    await storage.migrateTimerFields();
  } catch (error) {
    console.error("Failed to run timer migration on startup:", error);
  }

  // Run recurring fields migration on startup
  try {
    const { addRecurringFields } = await import('./migrations/add-recurring-fields.js');
    await addRecurringFields();
  } catch (error) {
    console.error("Failed to run recurring fields migration on startup:", error);
  }

  // Run phases tables migration on startup
  try {
    const { runPhasesMigration } = await import('./migrations/add-phases-tables.js');
    await runPhasesMigration();
  } catch (error) {
    console.error("Failed to run phases migration on startup:", error);
  }

  // Run BI project management migration on startup
  try {
    await storage.migrateBiProjectManagement();
  } catch (error) {
    console.error("Failed to run BI project management migration on startup:", error);
  }

  // Run subphases migration on startup
  try {
    await storage.migrateSubphases();
  } catch (error) {
    console.error("Failed to run subphases migration on startup:", error);
  }

  // Seed subphases on startup
  try {
    await storage.seedSubphases();
  } catch (error) {
    console.error("Failed to seed subphases on startup:", error);
  }

  // Seed BI methodology data on startup
  try {
    await storage.seedBiMethodology();
  } catch (error) {
    console.error("Failed to seed BI methodology data on startup:", error);
  }

  // Run progress calculation migration on startup
  try {
    await storage.migrateProgressCalculation();
  } catch (error) {
    console.error("Failed to run progress calculation migration on startup:", error);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "localhost",
  }, () => {
    log(`serving on port ${port}`);
  });
})();
