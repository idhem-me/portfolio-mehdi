import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  workers: 1,
  use: { baseURL: "http://localhost:3000", headless: true, locale: "fr-FR" },
  projects: [
    {
      name: "chromium",
      testIgnore: /iphone/,
      use: { browserName: "chromium" },
    },
    {
      name: "webkit-iphone",
      testMatch: /iphone/,
      use: { ...devices["iPhone 13"], browserName: "webkit" },
    },
  ],
  reporter: "list",
});
