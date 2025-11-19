import { healthChecking } from "./health-checking";
import { users } from "./users";

// Schema exports
export const schema = {
  healthChecking,
  users,
};

// Export individual tables for convenience
export { healthChecking, users };
