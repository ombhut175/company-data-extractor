import { healthChecking } from "./health-checking";
import { users } from "./users";
import { scrapingJobs } from "./scraping-jobs";
import { scrapingItems } from "./scraping-items";

// Schema exports
export const schema = {
  healthChecking,
  users,
  scrapingJobs,
  scrapingItems,
};

// Export individual tables for convenience
export { healthChecking, users, scrapingJobs, scrapingItems };
