import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UnauthorizedException,
  Res,
  Req,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import {
  LoginDto,
  SignupDto,
  ForgotPasswordDto,
  StandardApiResponseDto,
  LoginResponseDataDto,
  SignupResponseDataDto,
  ForgotPasswordResponseDataDto,
  LogoutResponseDataDto,
  UserInfoDto,
  ErrorResponseDto,
  IsLoggedInResponseDataDto,
} from "./dto";
import { successResponse } from "../../common/helpers/api-response.helper";
import { COOKIES, ENV } from "../../common/constants/string-const";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  //#region ==================== AUTHENTICATION ENDPOINTS ====================

  @ApiOperation({
    summary: "User Login",
    description:
      "Authenticate user with email and password. Returns access tokens, user information, and verification status. Creates or updates user record in public.users table.",
  })
  @ApiBody({
    type: LoginDto,
    description: "User login credentials",
  })
  @ApiResponse({
    status: 200,
    description:
      "Login successful. Returns access tokens, user information, verification status, and public user record.",
    type: StandardApiResponseDto<LoginResponseDataDto>,
    schema: {
      example: {
        statusCode: 200,
        success: true,
        message: "Login successful",
        data: {
          tokens: {
            access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            refresh_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            token_type: "bearer",
            expires_in: 3600,
          },
          user: {
            id: "123e4567-e89b-12d3-a456-426614174000",
            email: "john.doe@example.com",
            email_confirmed_at: "2023-12-01T10:00:00.000Z",
            isEmailVerified: true,
            created_at: "2023-11-01T10:00:00.000Z",
            updated_at: "2023-12-01T10:00:00.000Z",
          },
          publicUser: {
            id: "123e4567-e89b-12d3-a456-426614174000",
            email: "john.doe@example.com",
            isEmailVerified: true,
            createdAt: "2023-11-01T10:00:00.000Z",
            updatedAt: "2023-12-01T10:00:00.000Z",
          },
          isEmailVerified: true,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: "Invalid input data or validation errors",
    type: ErrorResponseDto,
    schema: {
      example: {
        statusCode: 400,
        message: "Invalid email or password format",
        timestamp: "2023-12-01T10:00:00.000Z",
        path: "/api/auth/login",
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: "Invalid credentials provided",
    type: ErrorResponseDto,
    schema: {
      example: {
        statusCode: 401,
        message: "Invalid email or password",
        timestamp: "2023-12-01T10:00:00.000Z",
        path: "/api/auth/login",
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: "Internal server error during authentication",
    type: ErrorResponseDto,
  })
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.logger.log(`Login attempt for email: ${loginDto.email}`);

    try {
      const result = await this.authService.login(loginDto);

      this.logger.log(`Login successful for email: ${loginDto.email}`);

      // Set never-expiring cookie with the access token
      if (result.session?.access_token) {
        const cookieOptions: any = {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
          // No maxAge or expires means the cookie never expires (session cookie that persists)
        };

        // Set domain for production if COOKIE_DOMAIN is provided
        if (
          process.env.NODE_ENV === "production" &&
          process.env[ENV.COOKIE_DOMAIN]
        ) {
          cookieOptions.domain = process.env[ENV.COOKIE_DOMAIN];
        }

        response.cookie(
          COOKIES.AUTH_TOKEN,
          result.session.access_token,
          cookieOptions,
        );

        this.logger.log(
          `Auth cookie set for user: ${loginDto.email} with options:`,
          cookieOptions,
        );
      }

      // Format response to match expected DTO structure
      const responseData = {
        tokens: {
          access_token: result.session?.access_token || "",
          refresh_token: result.session?.refresh_token || "",
          token_type: result.session?.token_type || "bearer",
          expires_in: result.session?.expires_in || 3600,
        },
        user: {
          id: result.user?.id || "",
          email: result.user?.email || "",
          email_confirmed_at: result.user?.email_confirmed_at || null,
          isEmailVerified: result.isEmailVerified || false,
          created_at: result.user?.created_at || "",
          updated_at: result.user?.updated_at || "",
        },
        publicUser: result.publicUser
          ? {
              id: result.publicUser.id,
              email: result.publicUser.email,
              isEmailVerified: result.publicUser.isEmailVerified,
              createdAt: result.publicUser.createdAt.toISOString(),
              updatedAt: result.publicUser.updatedAt.toISOString(),
            }
          : null,
        isEmailVerified: result.isEmailVerified || false,
      };

      return successResponse(responseData, "Login successful");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.stack : "Unknown error";
      this.logger.error(
        `Login controller error for email: ${loginDto.email}`,
        errorMessage,
      );
      throw error;
    }
  }

  @ApiOperation({
    summary: "User Registration",
    description:
      "Create a new user account with email and password. Creates user record in public.users table with verified status as false. Sends email confirmation.",
  })
  @ApiBody({
    type: SignupDto,
    description: "User registration details",
  })
  @ApiResponse({
    status: 201,
    description:
      "Account created successfully. User record created in public.users table with verification status false. Email confirmation sent.",
    type: StandardApiResponseDto<SignupResponseDataDto>,
    schema: {
      example: {
        statusCode: 201,
        success: true,
        message: "Account created successfully",
        data: {
          user: {
            id: "123e4567-e89b-12d3-a456-426614174000",
            email: "jane.smith@example.com",
            email_confirmed_at: null,
            isEmailVerified: false,
            created_at: "2023-12-01T10:00:00.000Z",
            updated_at: "2023-12-01T10:00:00.000Z",
          },
          publicUser: {
            id: "123e4567-e89b-12d3-a456-426614174000",
            email: "jane.smith@example.com",
            isEmailVerified: false,
            createdAt: "2023-12-01T10:00:00.000Z",
            updatedAt: "2023-12-01T10:00:00.000Z",
          },
          message: "Please check your email for confirmation instructions",
          emailConfirmationRequired: true,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      "Invalid input data, validation errors, or email already exists",
    type: ErrorResponseDto,
    schema: {
      example: {
        statusCode: 400,
        message: "Email already registered or password too weak",
        timestamp: "2023-12-01T10:00:00.000Z",
        path: "/api/auth/signup",
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: "Internal server error during account creation",
    type: ErrorResponseDto,
  })
  @Post("signup")
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() signupDto: SignupDto) {
    this.logger.log(`Signup attempt for email: ${signupDto.email}`);

    try {
      const result = await this.authService.signup(signupDto);

      this.logger.log(`Signup successful for email: ${signupDto.email}`);

      // Format response to match expected DTO structure
      const responseData = {
        user: {
          id: result.user?.id || "",
          email: result.user?.email || "",
          email_confirmed_at: result.user?.email_confirmed_at || null,
          isEmailVerified: false, // Always false on signup
          created_at: result.user?.created_at || "",
          updated_at: result.user?.updated_at || "",
        },
        publicUser: result.publicUser
          ? {
              id: result.publicUser.id,
              email: result.publicUser.email,
              isEmailVerified: result.publicUser.isEmailVerified,
              createdAt: result.publicUser.createdAt.toISOString(),
              updatedAt: result.publicUser.updatedAt.toISOString(),
            }
          : null,
        message: "Please check your email for confirmation instructions",
        emailConfirmationRequired: result.emailConfirmationRequired || true,
      };

      return successResponse(responseData, "Account created successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.stack : "Unknown error";
      this.logger.error(
        `Signup controller error for email: ${signupDto.email}`,
        errorMessage,
      );
      throw error;
    }
  }

  @ApiOperation({
    summary: "Forgot Password",
    description: "Send password reset instructions to user email address.",
  })
  @ApiBody({
    type: ForgotPasswordDto,
    description: "Email address for password reset",
  })
  @ApiResponse({
    status: 200,
    description: "Password reset email sent successfully",
    type: StandardApiResponseDto<ForgotPasswordResponseDataDto>,
    schema: {
      example: {
        statusCode: 200,
        success: true,
        message: "Password reset email sent",
        data: {
          message: "Password reset instructions have been sent to your email",
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: "Invalid email format or validation errors",
    type: ErrorResponseDto,
    schema: {
      example: {
        statusCode: 400,
        message: "Please provide a valid email address",
        timestamp: "2023-12-01T10:00:00.000Z",
        path: "/api/auth/forgot-password",
      },
    },
  })
  @ApiNotFoundResponse({
    description: "Email address not found in system",
    type: ErrorResponseDto,
    schema: {
      example: {
        statusCode: 404,
        message: "No account found with this email address",
        timestamp: "2023-12-01T10:00:00.000Z",
        path: "/api/auth/forgot-password",
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: "Internal server error during password reset",
    type: ErrorResponseDto,
  })
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    this.logger.log(
      `Forgot password request for email: ${forgotPasswordDto.email}`,
    );

    try {
      const result = await this.authService.forgotPassword(forgotPasswordDto);
      this.logger.log(
        `Password reset email sent to: ${forgotPasswordDto.email}`,
      );
      return successResponse(result, "Password reset email sent");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.stack : "Unknown error";
      this.logger.error(
        `Forgot password controller error for email: ${forgotPasswordDto.email}`,
        errorMessage,
      );
      throw error;
    }
  }

  @ApiOperation({
    summary: "User Logout",
    description:
      "Log out the current authenticated user and invalidate their session. Uses authentication cookie instead of Authorization header.",
  })
  @ApiResponse({
    status: 200,
    description: "User logged out successfully",
    type: StandardApiResponseDto<LogoutResponseDataDto>,
    schema: {
      example: {
        statusCode: 200,
        success: true,
        message: "Logged out successfully",
        data: {
          message: "Successfully logged out",
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: "Invalid or missing authentication cookie",
    type: ErrorResponseDto,
    schema: {
      example: {
        statusCode: 401,
        message: "Authorization token required",
        timestamp: "2023-12-01T10:00:00.000Z",
        path: "/api/auth/logout",
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: "Internal server error during logout",
    type: ErrorResponseDto,
  })
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.logger.log("Logout request received");

    const token = request.cookies[COOKIES.AUTH_TOKEN];

    if (!token) {
      this.logger.warn("Logout attempt without valid token");
      throw new UnauthorizedException("Authorization token required");
    }

    try {
      const user = await this.authService.getCurrentUser(token);

      this.logger.log(
        `Logout request for user: ${user.email} (ID: ${user.id})`,
      );

      // Clear the authentication cookie
      const clearCookieOptions: any = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      };

      // Set domain for production if COOKIE_DOMAIN is provided
      if (
        process.env.NODE_ENV === "production" &&
        process.env[ENV.COOKIE_DOMAIN]
      ) {
        clearCookieOptions.domain = process.env[ENV.COOKIE_DOMAIN];
      }

      response.clearCookie(COOKIES.AUTH_TOKEN, clearCookieOptions);

      const result = await this.authService.logout(user.id);
      this.logger.log(`User logged out successfully: ${user.email}`);
      return successResponse(result, "Logged out successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.stack : "Unknown error";
      this.logger.error("Logout controller error", errorMessage);
      throw error;
    }
  }

  @ApiOperation({
    summary: "Check If User Is Logged In",
    description:
      "Check whether the user has a valid authentication session. Returns true if authenticated, false otherwise.",
  })
  @ApiResponse({
    status: 200,
    description: "Login status checked successfully",
    type: StandardApiResponseDto<IsLoggedInResponseDataDto>,
    schema: {
      example: {
        statusCode: 200,
        success: true,
        message: "Login status checked successfully",
        data: {
          isLoggedIn: true,
        },
      },
    },
  })
  @Get("isLoggedIn")
  @HttpCode(HttpStatus.OK)
  async isLoggedIn(@Req() request: Request) {
    this.logger.log("Check isLoggedIn request received");

    const token = request.cookies[COOKIES.AUTH_TOKEN];

    if (!token) {
      this.logger.log("No auth token found - user not logged in");
      return successResponse(
        { isLoggedIn: false },
        "Login status checked successfully",
      );
    }

    try {
      await this.authService.getCurrentUser(token);
      this.logger.log("Valid auth token found - user is logged in");
      return successResponse(
        { isLoggedIn: true },
        "Login status checked successfully",
      );
    } catch {
      this.logger.log("Invalid auth token - user not logged in");
      return successResponse(
        { isLoggedIn: false },
        "Login status checked successfully",
      );
    }
  }

  @ApiOperation({
    summary: "Get Current User",
    description:
      "Retrieve information about the currently authenticated user. Uses authentication cookie instead of Authorization header.",
  })
  @ApiResponse({
    status: 200,
    description: "User information retrieved successfully",
    type: StandardApiResponseDto<UserInfoDto>,
    schema: {
      example: {
        statusCode: 200,
        success: true,
        message: "User information retrieved successfully",
        data: {
          id: "123e4567-e89b-12d3-a456-426614174000",
          email: "john.doe@example.com",
          email_confirmed_at: "2023-12-01T10:00:00.000Z",
          isEmailVerified: true,
          created_at: "2023-11-01T10:00:00.000Z",
          updated_at: "2023-12-01T10:00:00.000Z",
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: "Invalid or missing authentication cookie",
    type: ErrorResponseDto,
    schema: {
      example: {
        statusCode: 401,
        message: "Authorization token required",
        timestamp: "2023-12-01T10:00:00.000Z",
        path: "/api/auth/me",
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: "Internal server error while retrieving user information",
    type: ErrorResponseDto,
  })
  @Get("me")
  async getCurrentUser(@Req() request: Request) {
    this.logger.log("Get current user request received");

    const token = request.cookies[COOKIES.AUTH_TOKEN];

    if (!token) {
      this.logger.warn("Get current user attempt without valid token");
      throw new UnauthorizedException("Authorization token required");
    }

    try {
      const user = await this.authService.getCurrentUser(token);

      this.logger.log(`Getting user info for: ${user.email} (ID: ${user.id})`);

      // Get public user record to check verification status
      const authService = this.authService as any;
      let isEmailVerified = false;
      let publicUser = null;

      try {
        if (authService.usersRepository) {
          publicUser = await authService.usersRepository.findById(user.id);
          isEmailVerified = publicUser?.isEmailVerified || false;
          this.logger.log(
            `User verification status for ${user.email}: ${isEmailVerified}`,
          );
        }
      } catch (error) {
        // If public user lookup fails, continue without verification status
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        this.logger.warn(
          `Failed to get verification status for user ${user.email}`,
          errorMessage,
        );
      }

      return successResponse(
        {
          id: user.id,
          email: user.email,
          email_confirmed_at: user.email_confirmed_at,
          isEmailVerified,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
        "User information retrieved successfully",
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.stack : "Unknown error";
      this.logger.error("Get current user controller error", errorMessage);
      throw error;
    }
  }

  //#endregion
}
