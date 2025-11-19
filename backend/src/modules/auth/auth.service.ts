import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { SupabaseService } from "../../core/supabase/supabase.service";
import { UsersRepository } from "../../core/database/repositories";
import { MESSAGES, ENV } from "../../common/constants/string-const";
import { LoginDto, SignupDto, ForgotPasswordDto } from "./dto";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly usersRepository: UsersRepository,
  ) {}

  async login(loginDto: LoginDto) {
    try {
      const supabase = this.supabaseService.getClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginDto.email,
        password: loginDto.password,
      });

      if (error) {
        this.logger.error(
          `Login failed for ${loginDto.email}: ${error.message}`,
        );

        // Handle specific Supabase auth errors
        if (error.message.includes("Invalid login credentials")) {
          throw new UnauthorizedException(MESSAGES.INVALID_CREDENTIALS);
        }
        if (error.message.includes("Email not confirmed")) {
          throw new UnauthorizedException(
            "Please confirm your email before logging in",
          );
        }

        throw new UnauthorizedException(error.message);
      }

      // Check if user exists in public.users table and verify status
      let publicUser = null;
      if (data.user) {
        try {
          publicUser = await this.usersRepository.findById(data.user.id);

          if (!publicUser) {
            // Create public user record if it doesn't exist (for existing Supabase users)
            publicUser = await this.usersRepository.create({
              id: data.user.id, // Use Supabase user ID as the UUID id
              email: loginDto.email,
              isEmailVerified: !!data.user.email_confirmed_at,
            });
            this.logger.log(
              `Created missing public user record for ${loginDto.email}`,
            );
          } else {
            // Update verification status based on Supabase auth status
            if (data.user.email_confirmed_at && !publicUser.isEmailVerified) {
              publicUser = await this.usersRepository.update(publicUser.id, {
                isEmailVerified: true,
              });
              this.logger.log(
                `Updated email verification status for ${loginDto.email}`,
              );
            }
          }
        } catch (dbError) {
          const errorMessage =
            dbError instanceof Error ? dbError.message : "Unknown error";
          this.logger.error(
            `Database error during login for ${loginDto.email}: ${errorMessage}`,
          );
          // Continue with login even if public user operations fail
        }
      }

      this.logger.log(`User ${loginDto.email} logged in successfully`);
      return {
        message: MESSAGES.LOGIN_SUCCESSFUL,
        user: data.user,
        session: data.session,
        publicUser,
        isEmailVerified: publicUser?.isEmailVerified || false,
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Unexpected login error: ${errorMessage}`);
      throw new BadRequestException(MESSAGES.UNEXPECTED_ERROR);
    }
  }

  async signup(signupDto: SignupDto) {
    try {
      const supabase = this.supabaseService.getClient();

      const { data, error } = await supabase.auth.signUp({
        email: signupDto.email,
        password: signupDto.password,
        options: {
          emailRedirectTo:
            process.env[ENV.REDIRECT_TO_FRONTEND_URL] ||
            `${process.env[ENV.FRONTEND_URL]}/login`,
        },
      });

      if (error) {
        this.logger.error(
          `Signup failed for ${signupDto.email}: ${error.message}`,
        );

        // Handle specific Supabase auth errors
        if (error.message.includes("User already registered")) {
          throw new BadRequestException(MESSAGES.EMAIL_ALREADY_EXISTS);
        }
        if (error.message.includes("Password should be at least")) {
          throw new BadRequestException(MESSAGES.WEAK_PASSWORD);
        }
        if (error.message.includes("Unable to validate email address")) {
          throw new BadRequestException(MESSAGES.INVALID_EMAIL);
        }

        throw new BadRequestException(error.message);
      }

      // Create user record in public.users table
      let publicUser = null;
      if (data.user) {
        try {
          publicUser = await this.usersRepository.create({
            id: data.user.id, // Use Supabase user ID as the UUID id
            email: signupDto.email,
            isEmailVerified: false, // Set as false initially
          });
          this.logger.log(`Public user record created for ${signupDto.email}`);
        } catch (dbError) {
          const errorMessage =
            dbError instanceof Error ? dbError.message : "Unknown error";
          this.logger.error(
            `Failed to create public user record for ${signupDto.email}: ${errorMessage}`,
          );
          // Note: We don't fail the signup if public user creation fails
          // The Supabase auth user still exists and can be recovered
        }
      }

      this.logger.log(`User ${signupDto.email} signed up successfully`);

      return {
        message: MESSAGES.SIGNUP_SUCCESSFUL,
        user: data.user,
        session: data.session,
        publicUser,
        emailConfirmationRequired: !data.session, // If no session, email confirmation is required
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Unexpected signup error: ${errorMessage}`);
      throw new BadRequestException(MESSAGES.UNEXPECTED_ERROR);
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    try {
      const supabase = this.supabaseService.getClient();

      const { error } = await supabase.auth.resetPasswordForEmail(
        forgotPasswordDto.email,
        {
          redirectTo: `${process.env[ENV.FRONTEND_URL] || "http://localhost:3000"}/auth/reset-password`,
        },
      );

      if (error) {
        this.logger.error(
          `Password reset failed for ${forgotPasswordDto.email}: ${error.message}`,
        );

        // For security reasons, we don't want to reveal if the email exists or not
        // So we return success even if the email doesn't exist
        if (error.message.includes("User not found")) {
          this.logger.warn(
            `Password reset attempted for non-existent email: ${forgotPasswordDto.email}`,
          );
          return { message: MESSAGES.PASSWORD_RESET_SENT };
        }

        throw new BadRequestException(error.message);
      }

      this.logger.log(
        `Password reset email sent to ${forgotPasswordDto.email}`,
      );
      return { message: MESSAGES.PASSWORD_RESET_SENT };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Unexpected forgot password error: ${errorMessage}`);
      throw new BadRequestException(MESSAGES.UNEXPECTED_ERROR);
    }
  }

  async logout(userId: string) {
    try {
      const supabase = this.supabaseService.getClient();

      const { error } = await supabase.auth.signOut();

      if (error) {
        this.logger.error(`Logout failed for user ${userId}: ${error.message}`);
        throw new BadRequestException("Logout failed");
      }

      this.logger.log(`User ${userId} logged out successfully`);
      return { message: "Logged out successfully" };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Unexpected logout error: ${errorMessage}`);
      throw new BadRequestException(MESSAGES.UNEXPECTED_ERROR);
    }
  }

  async getCurrentUser(token: string) {
    try {
      const supabase = this.supabaseService.getClient();

      const { data, error } = await supabase.auth.getUser(token);

      if (error) {
        this.logger.error(`Failed to get current user: ${error.message}`);
        throw new UnauthorizedException(MESSAGES.INVALID_TOKEN);
      }

      return data.user;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Unexpected getCurrentUser error: ${errorMessage}`);
      throw new BadRequestException(MESSAGES.UNEXPECTED_ERROR);
    }
  }
}
