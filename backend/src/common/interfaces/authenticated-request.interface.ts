import { Request } from "express";

/**
 * Extended Request interface that includes authenticated user information
 * Used by AuthGuard to attach user data to requests
 */
export interface AuthenticatedRequest extends Request {
  user: {
    /**
     * Supabase user ID (UUID)
     * @example "123e4567-e89b-12d3-a456-426614174000"
     */
    id: string;

    /**
     * User's email address
     * @example "user@example.com"
     */
    email: string;

    /**
     * Full Supabase user object for advanced use cases
     * Contains all user metadata, auth info, etc.
     */
    supabaseUser: any;
  };
}

/**
 * Type guard to check if request has authenticated user
 */
export function isAuthenticatedRequest(
  request: Request,
): request is AuthenticatedRequest {
  return !!(request as any).user?.id && !!(request as any).user?.email;
}
