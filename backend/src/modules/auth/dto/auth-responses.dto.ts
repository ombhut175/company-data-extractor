import { ApiProperty } from "@nestjs/swagger";

export class AuthTokensDto {
  @ApiProperty({
    description: "JWT access token for authenticated requests",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  access_token!: string;

  @ApiProperty({
    description: "JWT refresh token for token renewal",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  refresh_token!: string;

  @ApiProperty({
    description: 'Token type, typically "bearer"',
    example: "bearer",
  })
  token_type!: string;

  @ApiProperty({
    description: "Token expiration time in seconds",
    example: 3600,
  })
  expires_in!: number;
}

export class PublicUserInfoDto {
  @ApiProperty({
    description: "Public user record UUID",
    example: "123e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  id!: string;

  @ApiProperty({
    description: "User email address",
    example: "john.doe@example.com",
    format: "email",
  })
  email!: string;

  @ApiProperty({
    description: "Whether the user email is verified in our system",
    example: true,
  })
  isEmailVerified!: boolean;

  @ApiProperty({
    description: "Account creation timestamp",
    example: "2023-11-01T10:00:00.000Z",
    format: "date-time",
  })
  createdAt!: string;

  @ApiProperty({
    description: "Last account update timestamp",
    example: "2023-12-01T10:00:00.000Z",
    format: "date-time",
  })
  updatedAt!: string;
}

export class UserInfoDto {
  @ApiProperty({
    description: "Unique user identifier",
    example: "123e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  id!: string;

  @ApiProperty({
    description: "User email address",
    example: "john.doe@example.com",
    format: "email",
  })
  email!: string;

  @ApiProperty({
    description: "Email confirmation timestamp",
    example: "2023-12-01T10:00:00.000Z",
    format: "date-time",
    nullable: true,
  })
  email_confirmed_at?: string;

  @ApiProperty({
    description: "Whether the user email is verified in our system",
    example: true,
  })
  isEmailVerified!: boolean;

  @ApiProperty({
    description: "Account creation timestamp",
    example: "2023-11-01T10:00:00.000Z",
    format: "date-time",
  })
  created_at!: string;

  @ApiProperty({
    description: "Last account update timestamp",
    example: "2023-12-01T10:00:00.000Z",
    format: "date-time",
  })
  updated_at!: string;
}

export class LoginResponseDataDto {
  @ApiProperty({
    description: "Authentication tokens",
    type: AuthTokensDto,
  })
  tokens!: AuthTokensDto;

  @ApiProperty({
    description: "Supabase user information",
    type: UserInfoDto,
  })
  user!: UserInfoDto;

  @ApiProperty({
    description: "Public user record information",
    type: PublicUserInfoDto,
    nullable: true,
  })
  publicUser?: PublicUserInfoDto;

  @ApiProperty({
    description: "Whether the user email is verified",
    example: true,
  })
  isEmailVerified!: boolean;
}

export class SignupResponseDataDto {
  @ApiProperty({
    description: "Supabase user information for newly created account",
    type: UserInfoDto,
  })
  user!: UserInfoDto;

  @ApiProperty({
    description: "Public user record information",
    type: PublicUserInfoDto,
    nullable: true,
  })
  publicUser?: PublicUserInfoDto;

  @ApiProperty({
    description: "Message about email confirmation",
    example: "Please check your email for confirmation instructions",
  })
  message!: string;

  @ApiProperty({
    description: "Whether email confirmation is required",
    example: true,
  })
  emailConfirmationRequired!: boolean;
}

export class ForgotPasswordResponseDataDto {
  @ApiProperty({
    description: "Message confirming password reset email was sent",
    example: "Password reset instructions have been sent to your email",
  })
  message!: string;
}

export class LogoutResponseDataDto {
  @ApiProperty({
    description: "Logout confirmation message",
    example: "Successfully logged out",
  })
  message!: string;
}

export class IsLoggedInResponseDataDto {
  @ApiProperty({
    description: "Whether the user is currently logged in",
    example: true,
  })
  isLoggedIn!: boolean;
}

export class StandardApiResponseDto<T = any> {
  @ApiProperty({
    description: "HTTP status code",
    example: 200,
  })
  statusCode!: number;

  @ApiProperty({
    description: "Indicates if the request was successful",
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: "Human-readable message describing the result",
    example: "Operation completed successfully",
  })
  message!: string;

  @ApiProperty({
    description: "Response data payload",
  })
  data!: T;
}

export class ErrorResponseDto {
  @ApiProperty({
    description: "HTTP status code",
    example: 400,
  })
  statusCode!: number;

  @ApiProperty({
    description: "Error message describing what went wrong",
    example: "Invalid email or password",
  })
  message!: string;

  @ApiProperty({
    description: "Timestamp when the error occurred",
    example: "2023-12-01T10:00:00.000Z",
    format: "date-time",
  })
  timestamp!: string;

  @ApiProperty({
    description: "API endpoint where the error occurred",
    example: "/api/auth/login",
  })
  path!: string;
}
