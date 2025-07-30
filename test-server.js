console.log("Testing basic Node.js functionality...");

try {
  console.log("Node.js version:", process.version);
  console.log("Current working directory:", process.cwd());
  console.log("Environment variables loaded:", !!process.env.DATABASE_URL);
  console.log("Test completed successfully!");
} catch (error) {
  console.error("Error during test:", error);
  process.exit(1);
}
