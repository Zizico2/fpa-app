import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:3202';
const grpcPort = 50212;

export default defineConfig({
  testDir: './tests/production',
  outputDir: './build/e2e-production-results',
  forbidOnly: Boolean(process.env.CI),
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    trace: 'retain-on-failure',
  },
  reporter: 'list',
  webServer: [
    {
      command: 'node --import tsx tests/fixtures/grpc-server.ts',
      port: grpcPort,
      env: { FPA_FIXTURE_PORT: String(grpcPort) },
      reuseExistingServer: false,
    },
    {
      command: 'bun run build && bun run start --port 3202',
      url: baseURL,
      env: {
        FPA_GRPC_URL: `http://127.0.0.1:${grpcPort}`,
        FPA_RPC_BUDGET_MS: '3000',
        NEXT_DIST_DIR: 'build/e2e-production',
        FPA_E2E_INSTANT: '1',
      },
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
