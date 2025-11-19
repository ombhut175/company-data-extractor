# Authentication Module API Documentation

## Overview

The Authentication module provides comprehensive user authentication functionality including user registration, login, logout, password reset, and user profile retrieval. All endpoints follow RESTful conventions and return standardized JSON responses.

**Base URL**: `/api/auth`

**Authentication**: Bearer token required for protected endpoints (`/logout`, `/me`)

---

## 📋 Standardized Response Format

All API responses follow this consistent format:

### Success Response
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "statusCode": 400,
  "message": "Error description",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "path": "/api/auth/endpoint"
}
```

---

## 🔐 Authentication Endpoints

### POST /api/auth/login

**Description**: Authenticate user with email and password. Returns access tokens and user information.

**Authentication Required**: No

**Request Body**:
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!"
}
```

**Request Body Schema**:
- `email` (string, required) - Valid email address (max 255 characters)
- `password` (string, required) - User password (max 100 characters)

**Response Codes**:
- `200 OK` - Login successful
- `400 Bad Request` - Invalid input data or validation errors
- `401 Unauthorized` - Invalid credentials provided
- `500 Internal Server Error` - Internal server error during authentication

**Success Response Example** (200 OK):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Login successful",
  "data": {
    "tokens": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "token_type": "bearer",
      "expires_in": 3600
    },
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "john.doe@example.com",
      "email_confirmed_at": "2023-12-01T10:00:00.000Z",
      "created_at": "2023-11-01T10:00:00.000Z",
      "updated_at": "2023-12-01T10:00:00.000Z"
    }
  }
}
```

**Error Response Examples**:

*Invalid Credentials (401 Unauthorized)*:
```json
{
  "statusCode": 401,
  "message": "Invalid email or password",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "path": "/api/auth/login"
}
```

*Validation Error (400 Bad Request)*:
```json
{
  "statusCode": 400,
  "message": "Please provide a valid email address",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "path": "/api/auth/login"
}
```

---

### POST /api/auth/signup

**Description**: Create a new user account with email and password. Sends email confirmation.

**Authentication Required**: No

**Request Body**:
```json
{
  "email": "jane.smith@example.com",
  "password": "MySecurePassword123!"
}
```

**Request Body Schema**:
- `email` (string, required) - Valid email address (max 255 characters)
- `password` (string, required) - User password (min 8 characters, max 100 characters)

**Response Codes**:
- `201 Created` - Account created successfully
- `400 Bad Request` - Invalid input data, validation errors, or email already exists
- `500 Internal Server Error` - Internal server error during account creation

**Success Response Example** (201 Created):
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "jane.smith@example.com",
      "email_confirmed_at": null,
      "created_at": "2023-12-01T10:00:00.000Z",
      "updated_at": "2023-12-01T10:00:00.000Z"
    },
    "message": "Please check your email for confirmation instructions"
  }
}
```

**Error Response Examples**:

*Email Already Exists (400 Bad Request)*:
```json
{
  "statusCode": 400,
  "message": "Email already registered",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "path": "/api/auth/signup"
}
```

*Password Too Weak (400 Bad Request)*:
```json
{
  "statusCode": 400,
  "message": "Password must be at least 8 characters long",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "path": "/api/auth/signup"
}
```

---

### POST /api/auth/forgot-password

**Description**: Send password reset instructions to user email address.

**Authentication Required**: No

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Request Body Schema**:
- `email` (string, required) - Valid email address (max 255 characters)

**Response Codes**:
- `200 OK` - Password reset email sent successfully
- `400 Bad Request` - Invalid email format or validation errors
- `404 Not Found` - Email address not found in system
- `500 Internal Server Error` - Internal server error during password reset

**Success Response Example** (200 OK):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Password reset email sent",
  "data": {
    "message": "Password reset instructions have been sent to your email"
  }
}
```

**Error Response Examples**:

*Email Not Found (404 Not Found)*:
```json
{
  "statusCode": 404,
  "message": "No account found with this email address",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "path": "/api/auth/forgot-password"
}
```

*Invalid Email Format (400 Bad Request)*:
```json
{
  "statusCode": 400,
  "message": "Please provide a valid email address",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "path": "/api/auth/forgot-password"
}
```

---

### POST /api/auth/logout

**Description**: Log out the current authenticated user and invalidate their session.

**Authentication Required**: Yes (Bearer Token)

**Headers**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body**: None

**Response Codes**:
- `200 OK` - User logged out successfully
- `401 Unauthorized` - Invalid or missing authorization token
- `500 Internal Server Error` - Internal server error during logout

**Success Response Example** (200 OK):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Logged out successfully",
  "data": {
    "message": "Successfully logged out"
  }
}
```

**Error Response Examples**:

*Missing Token (401 Unauthorized)*:
```json
{
  "statusCode": 401,
  "message": "Authorization token required",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "path": "/api/auth/logout"
}
```

*Invalid Token (401 Unauthorized)*:
```json
{
  "statusCode": 401,
  "message": "Invalid or expired token",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "path": "/api/auth/logout"
}
```

---

### GET /api/auth/me

**Description**: Retrieve information about the currently authenticated user.

**Authentication Required**: Yes (Bearer Token)

**Headers**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Query Parameters**: None

**Response Codes**:
- `200 OK` - User information retrieved successfully
- `401 Unauthorized` - Invalid or missing authorization token
- `500 Internal Server Error` - Internal server error while retrieving user information

**Success Response Example** (200 OK):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "User information retrieved successfully",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "john.doe@example.com",
    "email_confirmed_at": "2023-12-01T10:00:00.000Z",
    "created_at": "2023-11-01T10:00:00.000Z",
    "updated_at": "2023-12-01T10:00:00.000Z"
  }
}
```

**Error Response Examples**:

*Missing Token (401 Unauthorized)*:
```json
{
  "statusCode": 401,
  "message": "Authorization token required",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "path": "/api/auth/me"
}
```

*Invalid Token (401 Unauthorized)*:
```json
{
  "statusCode": 401,
  "message": "Invalid or expired token",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "path": "/api/auth/me"
}
```

---

## 🔒 Security & Rate Limiting

### Authentication Flow
1. **Registration**: User creates account via `/signup` → receives email confirmation
2. **Login**: User authenticates via `/login` → receives access and refresh tokens
3. **Protected Access**: Include `Authorization: Bearer <token>` header for protected endpoints
4. **Logout**: User ends session via `/logout` → tokens invalidated

### Token Information
- **Token Type**: Bearer (JWT)
- **Token Location**: Authorization header
- **Token Format**: `Authorization: Bearer <access_token>`
- **Token Expiration**: 3600 seconds (1 hour)
- **Refresh Token**: Available for token renewal

### Security Features
- Password minimum length: 8 characters
- Email validation and confirmation
- Token-based authentication
- Session invalidation on logout
- CORS enabled with credentials support

---

## 📝 Data Models

### User Object
```typescript
{
  id: string;                    // UUID format
  email: string;                 // Valid email address
  email_confirmed_at?: string;   // ISO 8601 date-time or null
  created_at: string;            // ISO 8601 date-time
  updated_at: string;            // ISO 8601 date-time
}
```

### Tokens Object
```typescript
{
  access_token: string;     // JWT access token
  refresh_token: string;    // JWT refresh token
  token_type: string;       // "bearer"
  expires_in: number;       // Expiration time in seconds
}
```

---

## 🚀 Getting Started

### Development Environment
1. Start the development server: `npm run start:dev`
2. Access Swagger UI: `http://localhost:3000/api`
3. Test endpoints using the interactive documentation

### Testing with cURL

**Login Example**:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Get Current User Example**:
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 🔍 Troubleshooting

### Common Issues

1. **401 Unauthorized on protected endpoints**
   - Ensure Authorization header is included
   - Verify token format: `Bearer <token>`
   - Check if token has expired

2. **400 Bad Request on signup**
   - Verify email format is valid
   - Ensure password meets minimum length requirement
   - Check if email is already registered

3. **404 Not Found on forgot password**
   - Verify email exists in the system
   - Check email spelling

### Support
For additional support, refer to the project documentation or contact the development team.