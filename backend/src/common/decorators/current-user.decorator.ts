import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthenticatedRequest } from "../interfaces/authenticated-request.interface";

/**
 * Decorator to extract current authenticated user from request
 * Must be used with AuthGuard to ensure user is available
 *
 * @example
 * @Controller('users')
 * export class UsersController {
 *   @Get('profile')
 *   @UseGuards(AuthGuard)
 *   async getProfile(@CurrentUser() user: any) {
 *     return { id: user.id, email: user.email };
 *   }
 *
 *   @Get('profile/id')
 *   @UseGuards(AuthGuard)
 *   async getProfileId(@CurrentUser('id') userId: string) {
 *     return { userId };
 *   }
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new Error(
        "CurrentUser decorator used without AuthGuard. Apply @UseGuards(AuthGuard) to the route.",
      );
    }

    // Return specific property if requested
    if (data) {
      return user[data as keyof typeof user];
    }

    // Return full user object
    return user;
  },
);
