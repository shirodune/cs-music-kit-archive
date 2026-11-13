import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against the built site served by Wrangler, which uses the same
// static-asset handling as Cloudflare (trailing slashes, nearest 404.html).
// Run `pnpm build` first.
const port = 8787;

export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
  },
  // Desktop only; PROD-1 tests set a phone-sized viewport themselves (D-021).
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `wrangler dev --port ${port} --ip 127.0.0.1`,
    url: `http://127.0.0.1:${port}/en/`,
    reuseExistingServer: !process.env.CI,
    env: { WRANGLER_SEND_METRICS: "false" },
    timeout: 60_000,
  },
});
