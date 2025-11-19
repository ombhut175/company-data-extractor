// Environment Variables
export enum ENV {
  SUPABASE_URL = "SUPABASE_URL",
  SUPABASE_ANON_KEY = "SUPABASE_ANON_KEY",
  SUPABASE_SERVICE_ROLE_KEY = "SUPABASE_SERVICE_ROLE_KEY",
  NODE_ENV = "NODE_ENV",
  PORT = "PORT",
  SWAGGER_USER = "SWAGGER_USER",
  SWAGGER_PASSWORD = "SWAGGER_PASSWORD",
  SWAGGER_ENABLED = "SWAGGER_ENABLED",
  SWAGGER_UI_DEEP_LINKING = "SWAGGER_UI_DEEP_LINKING",
  SWAGGER_UI_DOC_EXPANSION = "SWAGGER_UI_DOC_EXPANSION",
  SWAGGER_UI_FILTER = "SWAGGER_UI_FILTER",
  FRONTEND_URL = "FRONTEND_URL",
  REDIRECT_TO_FRONTEND_URL = "REDIRECT_TO_FRONTEND_URL",
  COOKIE_DOMAIN = "COOKIE_DOMAIN",

  // Database Configuration
  DATABASE_URL = "DATABASE_URL",
  DATABASE_HOST = "DATABASE_HOST",
  DATABASE_PORT = "DATABASE_PORT",
  DATABASE_NAME = "DATABASE_NAME",
  DATABASE_USER = "DATABASE_USER",
  DATABASE_PASSWORD = "DATABASE_PASSWORD",
}

// Common Messages
export enum MESSAGES {
  // Generic
  SUCCESS = "Success",
  CREATED = "Created",
  UPDATED = "Updated",
  DELETED = "Deleted",

  // Errors
  UNEXPECTED_ERROR = "Unexpected error occurred",
  VALIDATION_ERROR = "Validation error",
  NOT_FOUND = "Resource not found",
  UNAUTHORIZED = "Unauthorized",
  FORBIDDEN = "Forbidden",

  // Auth
  INVALID_TOKEN = "Invalid token",
  TOKEN_EXPIRED = "Token expired",
  USER_NOT_FOUND = "User not found",
  TASK_NOT_FOUND = "Task not found",
  LOGIN_SUCCESSFUL = "Login successful",
  SIGNUP_SUCCESSFUL = "Account created successfully",
  PASSWORD_RESET_SENT = "Password reset email sent",
  INVALID_CREDENTIALS = "Invalid email or password",
  EMAIL_ALREADY_EXISTS = "Email already exists",
  WEAK_PASSWORD = "Password is too weak",
  INVALID_EMAIL = "Invalid email format",

  // Supabase
  SUPABASE_CONNECTION_ERROR = "Failed to connect to database",
  SUPABASE_QUERY_ERROR = "Database query failed",
}

// API Response Messages
export enum API_MESSAGES {
  USERS_FETCHED = "Users fetched successfully",
  USER_CREATED = "User created successfully",
  USER_UPDATED = "User updated successfully",
  USER_DELETED = "User deleted successfully",
}

// Table Names (for future use)
export enum TABLES {
  USERS = "users",
  TASKS = "tasks",
  PROFILES = "profiles",
}

// Queue Names (for future BullMQ usage)
export enum QUEUES {
  JOBS = "jobs",
  EMAILS = "emails",
  NOTIFICATIONS = "notifications",
}

// Cookie Keys
export enum COOKIES {
  AUTH_TOKEN = "auth_token",
}
