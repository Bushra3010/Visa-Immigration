import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No R2 incremental cache: keeps the deploy on the Workers free plan.
export default defineCloudflareConfig({});
