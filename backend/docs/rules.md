# 🚀 Hackathon Backend Rules: AI-First Development

> **Mission**: Build fast, debug easily, ship quickly with minimal bugs

---

## 🧾 1. Environment Variables (Simplified)

* **DO NOT hardcode** any credentials, URLs, or magic values.
* Use `process.env` to access variables.
* **Document all required variables** in `env.example`.
* **AI TIP**: Always include descriptive comments for env vars to help AI understand context.

```typescript
// ✅ GOOD: AI can understand this easily
const supabaseUrl = process.env.SUPABASE_URL; // Main Supabase project URL
const supabaseKey = process.env.SUPABASE_ANON_KEY; // Public anon key for client-side access
```

---

## 🧵 2. String Constants (AI-Optimized)

* Define **all hardcoded strings** in a **central `string-const.ts`** file with **descriptive names and comments**.
* Use **clear, self-documenting names** that AI can easily understand and suggest.
* **Include JSDoc comments** for complex constants.

```typescript
// helpers/string-const.ts
/**
 * Database table names - used with Drizzle ORM
 */
export enum TABLES {
  USERS = 'users',           // Main user accounts table
  TASKS = 'tasks',           // User tasks/todos table
  SKILLS = 'skills',         // User skills and competencies
}

/**
 * User-facing error messages - keep consistent across app
 */
export enum MESSAGES {
  USER_NOT_FOUND = 'User not found',
  TASK_NOT_FOUND = 'Task not found',
  INVALID_CREDENTIALS = 'Invalid email or password',
}

/**
 * Environment variable keys - helps prevent typos
 */
export enum ENV_KEYS {
  SUPABASE_URL = 'SUPABASE_URL',
  SUPABASE_ANON_KEY = 'SUPABASE_ANON_KEY',
  JWT_SECRET = 'JWT_SECRET',
}
```

**AI Benefits**: 
- AI can suggest correct constants based on context
- Autocomplete prevents typos
- Easy to refactor and maintain

---

## 📦 3. DTOs and Validation (Hackathon Speed)

* **Keep DTOs simple** but always validate inputs with `class-validator`.
* **Use descriptive property names** and **JSDoc comments** for AI assistance.
* **Standardize DTO naming**: `CreateXDto`, `UpdateXDto`, `XResponseDto`.

```typescript
export class CreateUserDto {
  /**
   * User's full name
   * @example "John Doe"
   */
  @IsString()
  @IsNotEmpty()
  name: string;

  /**
   * Valid email address
   * @example "john@example.com"
   */
  @IsEmail()
  email: string;

  /**
   * Strong password (min 8 chars)
   * @example "SecurePass123!"
   */
  @IsString()
  @MinLength(8)
  password: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
```

**Hackathon Benefits**:
- AI can auto-generate validation rules
- Clear examples help with testing
- Less debugging time with proper validation

---

## ♻️ 4. DRY Principle (AI-Friendly)

* **Extract reusable logic immediately** - don't wait for the third repetition.
* **Use descriptive function names** that explain what they do.
* **Add JSDoc comments** for complex helpers.

```typescript
/**
 * Extracts JWT token from Authorization header or cookies
 * @param request Express request object
 * @returns JWT token string or null if not found
 */
export function extractTokenFromRequest(request: Request): string | null {
  // Check Authorization header first
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Fallback to cookies
  return request.cookies?.jwt || null;
}

/**
 * Formats Supabase error for consistent API responses
 */
export function formatSupabaseError(error: any): { message: string; code?: string } {
  return {
    message: error.message || 'Database operation failed',
    code: error.code,
  };
}
```

**AI Advantages**:
- AI can suggest where to extract common patterns
- Self-documenting code reduces debugging time
- Easier to maintain and modify

---

## 🌐 5. Global App Configuration (Quick Setup)

**Copy-paste ready configuration** for `main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Quick hackathon setup - enable everything
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.use(cookieParser());
  
  // Global validation with helpful error messages
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,           // Strip unknown properties
    forbidNonWhitelisted: true, // Throw error for unknown properties
    transform: true,           // Auto-transform payloads to DTOs
  }));

  // Global error handling
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(3000);
  console.log('🚀 Server running at http://localhost:3000/api');
}
bootstrap();
```

**Hackathon Benefits**: One-time setup, works out of the box

---

## 🚨 6. Smart Error Handling (Debug-Friendly)

* **Always include context** in error messages for easier debugging.
* **Use structured error responses** with helpful details.
* **Log errors with enough context** for quick troubleshooting.

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    // Enhanced error context for debugging
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: exception.message,
      // Add helpful debugging info in development
      ...(process.env.NODE_ENV === 'development' && {
        stack: exception.stack,
        cause: exception.cause,
      }),
    };

    // Log error with context for easier debugging
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${exception.message}`,
      exception.stack
    );

    response.status(status).json(errorResponse);
  }
}
```

**Hackathon Benefits**: 
- Immediate error context
- Stack traces in development
- Easy debugging with structured logs

---

## 🛠 7. Smart Helper Functions (AI-Generated)

* **Let AI generate utility functions** - describe what you need, AI writes the code.
* **Use TypeScript generics** for reusable helpers.
* **Include usage examples** in JSDoc for AI context.

```typescript
/**
 * Generic function to find entity by ID or throw not found error
 * @example const user = await findOrThrow(userRepo.findById(id), 'User not found');
 */
export async function findOrThrow<T>(
  queryPromise: Promise<T | null | undefined>,
  errorMessage = 'Resource not found'
): Promise<T> {
  const result = await queryPromise;
  if (!result) {
    throw new NotFoundException(errorMessage);
  }
  return result;
}

/**
 * Extract Supabase token from Authorization header
 * @param request Express request object
 * @returns Bearer token string or null if not found
 */
export function extractTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

/**
 * Safe async wrapper that logs errors and returns null on failure
 * @example const result = await safeAsync(() => riskyOperation(), 'Operation failed');
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  logMessage?: string
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    if (logMessage) {
      console.error(`${logMessage}:`, error.message);
    }
    return null;
  }
}

/**
 * Generate correlation ID for request tracing
 */
export function generateCorrelationId(): string {
  return crypto.randomUUID();
}
```

**AI Advantages**:
- AI can generate complex utility functions quickly
- Type-safe generics prevent runtime errors
- Examples help AI understand usage patterns

---

## 📌 8. Authentication (Supabase Auth)

**Use Supabase Auth for all authentication - no manual JWT needed:**

```typescript
// auth.service.ts
@Injectable()
export class AuthService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Login user using Supabase Auth
   */
  async login(loginDto: LoginDto): Promise<{ user: any; session: any }> {
    this.logger.log('User login attempt', {
      operation: 'login',
      email: loginDto.email,
      timestamp: new Date().toISOString(),
    });

    const { data, error } = await this.supabaseService.getClient()
      .auth.signInWithPassword({
        email: loginDto.email,
        password: loginDto.password,
      });

    if (error) {
      this.logger.error('Login failed', {
        operation: 'login',
        email: loginDto.email,
        error: error.message,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log('Login successful', {
      operation: 'login',
      userId: data.user.id,
      email: data.user.email,
    });

    return { user: data.user, session: data.session };
  }

  /**
   * Register user using Supabase Auth
   */
  async signup(signupDto: SignupDto): Promise<{ user: any; session: any }> {
    this.logger.log('User signup attempt', {
      operation: 'signup',
      email: signupDto.email,
      timestamp: new Date().toISOString(),
    });

    const { data, error } = await this.supabaseService.getClient()
      .auth.signUp({
        email: signupDto.email,
        password: signupDto.password,
        options: {
          data: {
            name: signupDto.name,
          },
        },
      });

    if (error) {
      this.logger.error('Signup failed', {
        operation: 'signup',
        email: signupDto.email,
        error: error.message,
      });
      throw new BadRequestException(error.message);
    }

    this.logger.log('Signup successful', {
      operation: 'signup',
      userId: data.user?.id,
      email: data.user?.email,
      needsConfirmation: !data.session,
    });

    return { user: data.user, session: data.session };
  }

  /**
   * Get user from Supabase token
   */
  async getUserFromToken(token: string): Promise<any> {
    const { data, error } = await this.supabaseService.getClient()
      .auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException('Invalid token');
    }

    return data.user;
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    await this.supabaseService.getClient().auth.signOut();
  }
}
```

**Auth Guard for protecting routes:**
```typescript
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Extract token from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      this.logger.warn('No authorization header found');
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.substring(7);
    
    try {
      const user = await this.authService.getUserFromToken(token);
      request.user = user;
      
      this.logger.debug('User authenticated', {
        userId: user.id,
        email: user.email,
      });
      
      return true;
    } catch (error) {
      this.logger.error('Authentication failed', {
        error: error.message,
      });
      throw new UnauthorizedException('Invalid token');
    }
  }
}
```

**Hackathon Benefits**:
- No JWT setup needed - Supabase handles everything
- Built-in user management
- Email verification and password reset
- Session management included



## 📘 9. Auto-Generated API Documentation

* **Let AI write your Swagger docs** - provide examples and AI generates decorators.
* **Use OpenAPI examples** for better testing and client generation.

```typescript
@Controller('users')
@ApiTags('Users')
export class UsersController {

  @Post()
  @ApiOperation({ 
    summary: 'Create new user',
    description: 'Creates a new user account with email and password'
  })
  @ApiResponse({ 
    status: 201,
    description: 'User created successfully',
    example: {
      statusCode: 201,
      success: true,
      message: 'User created successfully',
      data: {
        id: 'uuid-here',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: '2024-01-01T00:00:00Z'
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Validation failed',
    example: {
      statusCode: 400,
      message: ['email must be a valid email'],
      timestamp: '2024-01-01T00:00:00Z',
      path: '/api/users'
    }
  })
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
}
```

**AI Tip**: Describe your endpoint to AI like "Create a POST endpoint for user registration that validates email and password, returns user data on success" - AI will generate the full controller with Swagger docs.



## 🚀 10. Consistent API Responses (Copy-Paste Ready)

```typescript
// helpers/api-response.helper.ts

export interface ApiResponse<T = any> {
  statusCode: number;
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

/**
 * Standard success response wrapper
 */
export const successResponse = <T>(
  data: T, 
  message = 'Operation successful'
): ApiResponse<T> => ({
  statusCode: 200,
  success: true,
  message,
  data,
});

/**
 * Created response for POST endpoints
 */
export const createdResponse = <T>(
  data: T, 
  message = 'Resource created successfully'
): ApiResponse<T> => ({
  statusCode: 201,
  success: true,
  message,
  data,
});

/**
 * Paginated response helper
 */
export const paginatedResponse = <T>(
  data: T[], 
  total: number, 
  page: number, 
  limit: number,
  message = 'Data retrieved successfully'
): ApiResponse<T[]> => ({
  statusCode: 200,
  success: true,
  message,
  data,
  meta: { total, page, limit },
});

// Usage in controllers:
@Get()
async getAllUsers() {
  const users = await this.usersService.findAll();
  return successResponse(users, 'Users fetched successfully');
}
```

**Hackathon Benefits**: Consistent API responses across all endpoints

---

## ❌ 11. Keep Controllers Simple (AI-Friendly)

* **Thin controllers** - just route, validate, delegate, respond.
* **Use dependency injection** properly for testability.
* **Let AI generate boilerplate** controller code.

```typescript
@Controller('users')
@ApiTags('Users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll() {
    const users = await this.usersService.findAll();
    return successResponse(users, 'Users retrieved successfully');
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.findOne(id);
    return successResponse(user, 'User found');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return createdResponse(user, 'User created successfully');
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto
  ) {
    const user = await this.usersService.update(id, updateUserDto);
    return successResponse(user, 'User updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.remove(id);
  }
}
```

**AI Tip**: Tell AI "Generate a CRUD controller for User entity" and it will create the entire controller with proper validation and responses.

---

## 🧪 12. Smart Service Design (AI-Assisted)

* **Let AI generate service methods** based on business requirements.
* **Use descriptive method names** that explain business logic.
* **Include error handling** in all service methods.

```typescript
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly usersRepo: UsersRepository) {}

  /**
   * Get all users with optional filtering
   */
  async findAll(filters?: { role?: string; active?: boolean }): Promise<User[]> {
    this.logger.log('Fetching all users', { filters });
    
    try {
      return await this.usersRepo.findAll(filters);
    } catch (error) {
      this.logger.error('Failed to fetch users', error.stack);
      throw new InternalServerErrorException('Could not fetch users');
    }
  }

  /**
   * Get user by ID or throw not found error
   */
  async findOne(id: string): Promise<User> {
    this.logger.log(`Fetching user by ID: ${id}`);
    
    const user = await this.usersRepo.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return this.sanitizeUser(user);
  }

  /**
   * Create new user with validation
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    this.logger.log('Creating new user', { email: createUserDto.email });
    
    // Check if user already exists
    const existingUser = await this.usersRepo.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 12);
    
    const newUser = await this.usersRepo.create({
      ...createUserDto,
      password: hashedPassword,
    });
    
    return this.sanitizeUser(newUser);
  }

  /**
   * Remove sensitive data from user object
   */
  private sanitizeUser(user: User): User {
    const { password, ...sanitized } = user;
    return sanitized as User;
  }
}
```

**AI Benefits**: AI can generate comprehensive CRUD methods with proper error handling and logging.

---

## 🔁 13. Quick Repository Pattern (AI-Generated)

* **Use AI to generate repository methods** based on your database schema.
* **Keep repositories focused** on data access only.
* **Use generic base repository** for common operations.

```typescript
// Base repository with common CRUD operations
export abstract class BaseRepository<T> {
  constructor(protected readonly db: DrizzleService) {}

  /**
   * Find entity by ID with proper error handling
   */
  async findByIdOrThrow(id: string, tableName: string): Promise<T> {
    const result = await this.findById(id);
    if (!result) {
      throw new NotFoundException(`${tableName} with ID ${id} not found`);
    }
    return result;
  }

  abstract findById(id: string): Promise<T | null>;
  abstract create(data: Partial<T>): Promise<T>;
  abstract update(id: string, data: Partial<T>): Promise<T>;
  abstract delete(id: string): Promise<void>;
}

// Specific repository implementation
@Injectable()
export class UsersRepository extends BaseRepository<User> {
  
  async findById(id: string): Promise<User | null> {
    const [user] = await this.db.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);
    
    return user || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await this.db.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
    
    return user || null;
  }

  async create(userData: CreateUserData): Promise<User> {
    const [newUser] = await this.db.db
      .insert(usersTable)
      .values({
        id: crypto.randomUUID(),
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return newUser;
  }

  async update(id: string, userData: Partial<User>): Promise<User> {
    const [updatedUser] = await this.db.db
      .update(usersTable)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(usersTable.id, id))
      .returning();
    
    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return updatedUser;
  }

  async delete(id: string): Promise<void> {
    const result = await this.db.db
      .delete(usersTable)
      .where(eq(usersTable.id, id));
    
    if (result.changes === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }
}
```

**AI Tip**: Describe your data model to AI and it will generate complete repository methods with proper error handling.

---

## 🤖 15. AI-First Development Rules

### **Prompt Engineering for Code Generation**
* **Be specific** in your requests to AI
* **Include context** about your existing codebase
* **Ask for complete implementations** with error handling

```
❌ BAD: "Create a user service"

✅ GOOD: "Create a UserService class that uses UsersRepository for CRUD operations, includes password hashing with bcrypt, proper error handling with specific exceptions, logging with NestJS Logger, and follows our response format from api-response.helper.ts"
```

### **AI Code Review Checklist**
Before using AI-generated code, verify:
- [ ] **Error handling** is included
- [ ] **Input validation** with DTOs
- [ ] **Logging** statements for debugging
- [ ] **Type safety** with proper TypeScript types
- [ ] **Consistent naming** with existing codebase
- [ ] **JSDoc comments** for complex logic

### **AI-Assisted Debugging**
* **Copy full error messages** to AI for analysis
* **Include surrounding context** (5-10 lines before/after error)
* **Ask AI to explain** the error and provide fixes
* **Use AI to generate** test cases for debugging

---

## 🐛 16. Easy Debugging Rules

### **Detailed Logging Strategy**
**Always log with rich context for easy debugging:**

```typescript
// ✅ GOOD: Detailed logging with objects and arrays
this.logger.log('User creation started', {
  email: createUserDto.email,
  userData: createUserDto, // Include full object for context
  timestamp: new Date().toISOString(),
  requestId: request.id,
});

this.logger.log('Processing user tasks', {
  userId: user.id,
  tasksCount: tasks.length,
  // For arrays, log first 2 objects for context without overwhelming logs
  tasksSample: tasks.slice(0, 2),
  operation: 'batch_update',
  requestId: request.id,
});

this.logger.error('User creation failed', {
  error: {
    message: error.message,
    code: error.code,
    stack: error.stack,
  },
  input: createUserDto, // Full input object for debugging
  context: {
    timestamp: new Date().toISOString(),
    requestId: request.id,
    userId: user?.id,
  },
});

// For database operations - log queries with parameters
this.logger.debug('Database query executed', {
  operation: 'findUsersByRole',
  parameters: { role: 'admin', active: true },
  resultCount: users.length,
  // For result arrays, show first 2 items
  resultsSample: users.slice(0, 2).map(u => ({ id: u.id, email: u.email })),
  executionTime: `${Date.now() - startTime}ms`,
});
```

### **Logging Rules for Objects and Arrays**

**For Objects:**
```typescript
// ✅ Always include full object context
this.logger.log('Processing payment', {
  paymentData: paymentDto, // Full object
  user: { id: user.id, email: user.email }, // User object
  metadata: request.metadata,
});
```

**For Arrays:**
```typescript
// ✅ Log array length + first 2 items for context
this.logger.log('Bulk operation completed', {
  operation: 'createUsers',
  totalItems: users.length,
  itemsSample: users.slice(0, 2), // First 2 items only
  processingTime: `${executionTime}ms`,
});

// For large datasets, log summary stats
this.logger.log('Processing large dataset', {
  operation: 'dataAnalysis',
  totalRecords: records.length,
  sampleData: records.slice(0, 2),
  summary: {
    averageValue: records.reduce((a, b) => a + b.value, 0) / records.length,
    minValue: Math.min(...records.map(r => r.value)),
    maxValue: Math.max(...records.map(r => r.value)),
  },
});
```

### **Error Context**
Always include enough context in errors:
```typescript
❌ BAD: throw new NotFoundException('Not found');

✅ GOOD: throw new NotFoundException(`User with email ${email} not found`);

✅ BETTER: throw new NotFoundException({
  message: `User with email ${email} not found`,
  context: { email, searchedAt: new Date(), requestId },
});
```

### **Logging Scenarios & Best Practices**

**1. API Request/Response Logging:**
```typescript
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  @Post()
  async create(@Body() createUserDto: CreateUserDto, @Req() request: Request) {
    const requestId = crypto.randomUUID();
    
    // Log incoming request with full context
    this.logger.log('API request received', {
      endpoint: 'POST /api/users',
      requestId,
      body: createUserDto,
      headers: {
        userAgent: request.headers['user-agent'],
        contentType: request.headers['content-type'],
      },
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await this.usersService.create(createUserDto);
      
      // Log successful response
      this.logger.log('API request completed successfully', {
        endpoint: 'POST /api/users',
        requestId,
        responseData: { id: result.id, email: result.email },
        statusCode: 201,
      });

      return createdResponse(result);
    } catch (error) {
      // Log error with full context
      this.logger.error('API request failed', {
        endpoint: 'POST /api/users',
        requestId,
        input: createUserDto,
        error: {
          message: error.message,
          stack: error.stack,
          statusCode: error.status || 500,
        },
      });
      
      throw error;
    }
  }
}
```

**2. Database Operations Logging:**
```typescript
@Injectable()
export class UsersRepository {
  private readonly logger = new Logger(UsersRepository.name);

  async findByFilters(filters: any): Promise<User[]> {
    this.logger.debug('Database query starting', {
      operation: 'findByFilters',
      table: 'users',
      filters,
      timestamp: new Date().toISOString(),
    });

    const startTime = Date.now();
    
    try {
      const query = this.db.db
        .select()
        .from(usersTable)
        .where(this.buildWhereClause(filters));

      const results = await query;
      
      this.logger.debug('Database query completed', {
        operation: 'findByFilters',
        table: 'users',
        filters,
        resultCount: results.length,
        // Log first 2 results
        resultsSample: results.slice(0, 2),
        executionTime: `${Date.now() - startTime}ms`,
      });

      return results;
    } catch (error) {
      this.logger.error('Database query failed', {
        operation: 'findByFilters',
        table: 'users',
        filters,
        error: {
          message: error.message,
          code: error.code,
        },
        executionTime: `${Date.now() - startTime}ms`,
      });
      
      throw error;
    }
  }
}
```

**3. Business Logic Logging:**
```typescript
@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  async processOrder(orderData: CreateOrderDto, items: OrderItem[]): Promise<Order> {
    const correlationId = crypto.randomUUID();
    
    this.logger.log('Order processing started', {
      operation: 'processOrder',
      correlationId,
      orderData: orderData,
      itemsCount: items.length,
      // Show first 2 items for context
      itemsSample: items.slice(0, 2),
      totalAmount: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    });

    try {
      // Step 1: Validate inventory
      this.logger.debug('Validating inventory', {
        operation: 'validateInventory',
        correlationId,
        itemsToCheck: items.length,
      });

      await this.validateInventory(items);

      // Step 2: Calculate totals
      const totals = this.calculateTotals(items);
      this.logger.debug('Order totals calculated', {
        operation: 'calculateTotals',
        correlationId,
        totals,
      });

      // Step 3: Create order
      const order = await this.createOrder({
        ...orderData,
        items,
        totals,
      });

      this.logger.log('Order processed successfully', {
        operation: 'processOrder',
        correlationId,
        orderId: order.id,
        totalAmount: totals.total,
        itemsCount: items.length,
        processingTime: `${Date.now() - startTime}ms`,
      });

      return order;
    } catch (error) {
      this.logger.error('Order processing failed', {
        operation: 'processOrder',
        correlationId,
        orderData: orderData,
        itemsCount: items.length,
        error: {
          message: error.message,
          stack: error.stack,
        },
      });
      
      throw error;
    }
  }
}
```

### **Logging Checklist for AI Code Generation**
✅ **Always include operation name and timestamp**  
✅ **Use correlation/request IDs for tracing**  
✅ **Log full objects for complete context**  
✅ **For arrays: log count + first 2 items using `.slice(0, 2)`**  
✅ **Include execution time for performance monitoring**  
✅ **Log both success and failure scenarios**  
✅ **Use appropriate log levels (debug, log, warn, error)**

---

## 🚀 17. Productivity Boosters

### **Copy-Paste Templates**
Keep these templates ready for rapid development:

**Basic CRUD Controller Template:**
```typescript
@Controller('RESOURCE_NAME')
@ApiTags('RESOURCE_NAME')
export class RESOURCE_NAMEController {
  constructor(private readonly service: RESOURCE_NAMEService) {}

  @Get()
  async findAll() {
    const data = await this.service.findAll();
    return successResponse(data);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.service.findOne(id);
    return successResponse(data);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateRESOURCE_NAMEDto) {
    const data = await this.service.create(createDto);
    return createdResponse(data);
  }

  // Add PUT and DELETE as needed
}
```

**Enhanced Service Template with Detailed Logging:**
```typescript
@Injectable()
export class RESOURCE_NAMEService {
  private readonly logger = new Logger(RESOURCE_NAMEService.name);

  constructor(private readonly repo: RESOURCE_NAMERepository) {}

  async findAll(filters?: any): Promise<RESOURCE_TYPE[]> {
    this.logger.log('Fetching all RESOURCE_NAME', {
      operation: 'findAll',
      filters: filters || {},
      timestamp: new Date().toISOString(),
    });

    const startTime = Date.now();
    const results = await this.repo.findAll(filters);
    
    this.logger.log('FindAll operation completed', {
      operation: 'findAll',
      filters,
      resultCount: results.length,
      // Show first 2 results for context
      resultsSample: results.slice(0, 2),
      executionTime: `${Date.now() - startTime}ms`,
    });

    return results;
  }

  async findOne(id: string): Promise<RESOURCE_TYPE> {
    this.logger.log('Fetching RESOURCE_NAME by ID', {
      operation: 'findOne',
      id,
      timestamp: new Date().toISOString(),
    });

    const item = await this.repo.findById(id);
    if (!item) {
      this.logger.warn('RESOURCE_NAME not found', {
        operation: 'findOne',
        id,
        result: 'not_found',
      });
      throw new NotFoundException(`RESOURCE_NAME with ID ${id} not found`);
    }

    this.logger.log('RESOURCE_NAME found successfully', {
      operation: 'findOne',
      id,
      result: { id: item.id },
    });

    return item;
  }

  async create(createDto: CreateRESOURCE_NAMEDto): Promise<RESOURCE_TYPE> {
    this.logger.log('Creating new RESOURCE_NAME', {
      operation: 'create',
      input: createDto,
      timestamp: new Date().toISOString(),
    });

    try {
      const startTime = Date.now();
      const newItem = await this.repo.create(createDto);
      
      this.logger.log('RESOURCE_NAME created successfully', {
        operation: 'create',
        result: { id: newItem.id },
        input: createDto,
        executionTime: `${Date.now() - startTime}ms`,
      });

      return newItem;
    } catch (error) {
      this.logger.error('RESOURCE_NAME creation failed', {
        operation: 'create',
        input: createDto,
        error: {
          message: error.message,
          code: error.code,
          stack: error.stack,
        },
        timestamp: new Date().toISOString(),
      });
      
      throw error;
    }
  }

  async bulkCreate(items: CreateRESOURCE_NAMEDto[]): Promise<RESOURCE_TYPE[]> {
    this.logger.log('Starting bulk create operation', {
      operation: 'bulkCreate',
      itemCount: items.length,
      // Log first 2 items for context
      itemsSample: items.slice(0, 2),
      timestamp: new Date().toISOString(),
    });

    try {
      const startTime = Date.now();
      const results = await this.repo.bulkCreate(items);
      
      this.logger.log('Bulk create completed successfully', {
        operation: 'bulkCreate',
        inputCount: items.length,
        resultCount: results.length,
        resultsSample: results.slice(0, 2),
        executionTime: `${Date.now() - startTime}ms`,
      });

      return results;
    } catch (error) {
      this.logger.error('Bulk create operation failed', {
        operation: 'bulkCreate',
        inputCount: items.length,
        itemsSample: items.slice(0, 2),
        error: {
          message: error.message,
          stack: error.stack,
        },
      });
      
      throw error;
    }
  }
}
```

### **VS Code Snippets**
Create custom snippets for common patterns:
```json
{
  "NestJS Controller": {
    "prefix": "nest-controller",
    "body": [
      "@Controller('$1')",
      "@ApiTags('$1')",
      "export class $2Controller {",
      "  constructor(private readonly $3Service: $2Service) {}",
      "",
      "  @Get()",
      "  async findAll() {",
      "    const data = await this.$3Service.findAll();",
      "    return successResponse(data);",
      "  }",
      "}"
    ]
  }
}
```

---

## 🏗️ 16. Repository Architecture & Database Access

* **NEVER create monolithic repositories** that handle multiple domains in a single class.
* **Use Domain-Driven Repository Pattern** with separate repositories for each domain entity.
* **Structure repositories as follows**:

```
src/core/database/
├── repositories/
│   ├── base.repository.ts          # Common CRUD operations & DrizzleService access
│   ├── users.repository.ts         # User-specific operations only
│   ├── tickets.repository.ts       # Ticket-specific operations only
│   ├── skills.repository.ts        # Skills-specific operations only
│   └── index.ts                    # Export all repositories
├── database.module.ts              # Configure and export all repositories
└── database.repository.ts          # Remove or keep as facade only if needed
```

* **Benefits of this approach**:
  * **Single Responsibility Principle**: Each repository handles one domain
  * **Easier Testing**: Test individual repositories in isolation
  * **Better Maintainability**: Smaller, focused files
  * **Team Collaboration**: Different developers can work on different repositories
  * **Code Reusability**: Common operations in base repository
  * **Easier Debugging**: Issues isolated to specific domains

* **Implementation Rules**:
  * Each repository **must extend** `BaseRepository` for common database access
  * Services **should inject** specific repositories directly (e.g., `UsersRepository`, `TicketsRepository`)
  * **Avoid** injecting the monolithic `DatabaseRepository` facade in new services
  * Use **composition over inheritance** for complex database operations
  * Keep repositories **focused on data access** - business logic belongs in services

* **Example Usage**:

```ts
// ✅ GOOD: Direct repository injection
@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly skillsRepo: SkillsRepository,
  ) {}

  async createUser(userData: NewUser) {
    return this.usersRepo.createUser(userData);
  }
}

// ❌ BAD: Monolithic repository injection
@Injectable()
export class UsersService {
  constructor(private readonly dbRepo: DatabaseRepository) {}
  
  async createUser(userData: NewUser) {
    return this.dbRepo.createUser(userData); // Violates SRP
  }
}
```

---

## 🧹📁 14. Hackathon Folder Structure (AI-Optimized)

```
/src
  /modules              # Feature modules (AI can generate entire modules)
    /auth
      auth.controller.ts
      auth.service.ts
      auth.module.ts
      /dto
        login.dto.ts
        signup.dto.ts
    /users
    /tasks
    ...
  /common               # Shared utilities (AI-generated helpers)
    /constants
      string-const.ts   # All constants with AI-friendly names
    /filters
      http-exception.filter.ts
    /guards
      jwt-auth.guard.ts
    /helpers
      api-response.helper.ts
      validation.helper.ts
    /decorators
      current-user.decorator.ts
  /core                 # System-level services
    /database
      database.module.ts
      /repositories
        base.repository.ts
        users.repository.ts
    /config
      env.validation.ts
  main.ts               # Bootstrap with all global setup
  app.module.ts         # Root module configuration
```

**Hackathon Benefits**:
- **AI can generate entire modules** at once
- **Clear separation** makes debugging easier
- **Consistent naming** helps AI understand context
- **Modular structure** allows parallel development

**AI Development Tips**:
1. Tell AI: "Generate a complete Users module with CRUD operations"
2. AI will create controller, service, DTOs, and tests
3. Copy-paste into the right folders
4. Minimal configuration needed

---

## 🛡️ 18. Guards, Interceptors, Pipes

* Use built-in mechanisms:

  * Guards → Authorization (`RolesGuard`)
  * Interceptors → Transform/Logging
  * Pipes → Validation & Transformation

* Always abstract reusable ones in `common/`.

---

## 🧾 19. Logging Best Practices

* Use `Logger` class for debug/log instead of `console.log`.

```ts
import { Logger } from '@nestjs/common';
private readonly logger = new Logger(UserService.name);
this.logger.log('Fetching all users');
```

---

## 🌐 20. HTTP Module for External Calls

* Use NestJS `HttpModule` for calling external APIs.
* Wrap it with retry strategy and response/error transformation.

---

## ⚙️ 21. Use ConfigModule Properly

* Centralize configs like JWT secret, DB URLs using `@nestjs/config`.
* Use schema validation (`Joi`) to ensure all `.env` variables are present and valid.



---

## 📝 22. Module Documentation Requirements

* **Update documentation** in `/docs` whenever adding or modifying a module.
* For each module or API endpoint, documentation **must include**:
  * Complete endpoint path (`/api/users/:id`)
  * HTTP method(s) (`GET`, `POST`, `PUT`, `DELETE`)
  * Request parameters, query params, and body schema with types
  * Response format and status codes with examples
  * Authentication requirements
  * Rate limits (if applicable)
  
* Format example:

```md
## Users Module

### GET /api/users/:id
- **Description**: Retrieves a user by their ID
- **Auth Required**: Yes, Bearer Token
- **Parameters**:
  - `id` (path) - string - User UUID
- **Response**: 
  - 200 OK
    ```json
    {
      "statusCode": 200,
      "success": true,
      "message": "User fetched successfully",
      "data": {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "createdAt": "2023-01-01T00:00:00Z"
      }
    }
    ```
  - 404 Not Found
    ```json
    {
      "statusCode": 404,
      "message": "User not found",
      "timestamp": "2023-01-01T00:00:00Z",
      "path": "/api/users/123"
    }
    ```
```

---

## 📋 23. Use Regions for Better Code Organization

* **Use `#region` and `#endregion` comments** to organize large controllers, services, and other files.
* Group related functionality together with **descriptive region names**.
* Use **consistent formatting** with clear separators for visual distinction.

### ✅ Controller Example:

```ts
@Controller('profiles')
export class ProfilesController {
  
  //#region ==================== LEARNER PROFILE ENDPOINTS ====================

  @Post('learner')
  async createLearnerProfile() { /* ... */ }

  @Put('learner')
  async updateLearnerProfile() { /* ... */ }

  @Get('learner')
  async getLearnerProfile() { /* ... */ }

  //#endregion

  //#region ==================== TRAINER PROFILE ENDPOINTS ====================

  @Post('trainer')
  async createTrainerProfile() { /* ... */ }

  @Put('trainer/:id')
  async updateTrainerProfile() { /* ... */ }

  //#endregion

  //#region ==================== ADMIN PROFILE ENDPOINTS ====================

  @Post('admin')
  async createAdminProfile() { /* ... */ }

  //#endregion
}
```

### ✅ Service Example:

```ts
@Injectable()
export class UserService {

  //#region ==================== CRUD OPERATIONS ====================

  async create() { /* ... */ }
  async findAll() { /* ... */ }
  async findOne() { /* ... */ }
  async update() { /* ... */ }
  async delete() { /* ... */ }

  //#endregion

  //#region ==================== VALIDATION HELPERS ====================

  private validateEmail() { /* ... */ }
  private validatePassword() { /* ... */ }

  //#endregion

  //#region ==================== BUSINESS LOGIC ====================

  async assignRole() { /* ... */ }
  async sendNotification() { /* ... */ }

  //#endregion
}
```

### 🎯 Benefits:
* **Better navigation** in IDEs with collapsible regions
* **Logical grouping** of related methods
* **Improved readability** for large files
* **Easier maintenance** and code reviews

### 📝 Region Naming Guidelines:
* Use **UPPERCASE** for region descriptions
* Include **equal signs (=)** for visual separation
* Be **descriptive** but **concise**
* Group by **functionality**, not implementation details

---

## 🧵 24. Queues with BullMQ (Best Practices)

- **Configuration**
  - **Do not hardcode** Redis credentials. Use `@nestjs/config` and `Joi` schema in `src/config/env.validation.ts`.
  - Centralize queue names in `common/constants/string-const.ts` under `QUEUES` enum. Example: `QUEUES.JOBS = 'jobs'`.
  - Connection options must be loaded from `configuration.ts` (`redis.host`, `redis.port`, `redis.password`).

- **Module Structure**
  - Keep HTTP-facing test endpoints under `src/modules/bullmq`.
  - Processors should extend `WorkerHost` and live alongside their module or be promoted to `core/queue` when the number grows.
  - Register queues via `BullModule.registerQueue({ name: QUEUES.X })`.

- **Enqueue Rules**
  - Enqueue from services (not controllers) to keep controllers thin.
  - Always set job options explicitly: `{ attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: true }` unless a different policy is required.
  - Payloads must be serializable; avoid large blobs. Store only identifiers and fetch data in the processor when needed.
  - Make processors idempotent: handle re-delivery safely.

- **Processor Rules**
  - Implement `@OnWorkerEvent('completed'|'failed')` for observability.
  - Use `Logger` instead of `console.log`.
  - Catch and throw meaningful `Error` messages; avoid swallowing errors.
  - Long-running or external API tasks must run in processors, not in HTTP request lifecycle.

- **DTOs & Swagger**
  - All enqueue endpoints must validate inputs with DTOs and be annotated with Swagger decorators.

- **Observability & Ops**
  - Expose a lightweight health endpoint for queues (e.g., `/queues/health`) for smoke checks.
  - Prefer per-queue backoff policies; monitor failure rates.
  - Plan a separate worker process for production scale. For now, processors run in-app; when splitting, reuse the same `BullModule.forRootAsync` config.

- **Testing**
  - Unit-test enqueue services (assert queue `.add` is called with expected name/options).
  - Integration-test processors with a disposable Redis and fake providers.

---

## 🗄️ 25. Database Access Strategy: Drizzle First, Supabase CLI Last

- **Primary Rule**: Use **Drizzle ORM** for **all database operations** including CRUD, queries, migrations, and schema management.
- **Drizzle Usage**: 
  - All table operations (SELECT, INSERT, UPDATE, DELETE)
  - Complex queries and joins
  - Database migrations and schema changes
  - Raw SQL when needed via `sql` template literals
  - Connection pooling and transaction management

- **Supabase CLI Usage**: **ONLY** when accessing schemas other than `public`:
  - `auth` schema (user management, sessions)
  - `storage` schema (file buckets, storage policies)
  - `realtime` schema (subscriptions)
  - `graphql_public` schema (if using GraphQL)
  - Custom schemas created outside the application

- **Implementation Guidelines**:
  - **Never use Supabase CLI** for `public` schema operations
  - **Always use Drizzle** for application data tables
  - Use Supabase CLI only for administrative tasks or cross-schema operations
  - Keep Supabase CLI usage minimal and well-documented

- **Example**:
  ```ts
  // ✅ GOOD: Use Drizzle for public schema
  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  
  // ✅ GOOD: Use Supabase CLI only for auth schema
  const { data: { user } } = await supabase.auth.getUser(token);
  
  // ❌ BAD: Don't use Supabase CLI for public schema
  const { data } = await supabase.from('users').select('*').eq('id', userId);
  ```

---

## 🧵 26. Scalable BullMQ Architecture & Patterns

- **Centralized Configuration**
  - Define BullMQ connection and defaults in one place (e.g., `src/modules/bullmq/bull.config.ts`).
  - Use `@nestjs/config` for Redis options; do not hardcode.
  - Set sensible `defaultJobOptions` (attempts, backoff, removeOnComplete) centrally.

- **Dynamic Feature Registration**
  - Create a `BullmqFeatureModule.forFeature([{ name, processor, producer }])` to register queues declaratively.
  - Add new queues by adding a folder and one line in `forFeature`—no scattered `registerQueue` calls.

- **Queue-per-Feature Structure**
  - Each queue has its own folder under `src/modules/bullmq/queues/<feature>/` containing:
    - `*.types.ts` (Job names enum and payload interfaces)
    - `*.queue.ts` (producer service; the only public injection point)
    - `*.processor.ts` (extends `WorkerHost`; orchestrates and delegates)
  - Keep business logic in domain services; processors should delegate, not contain heavy logic.

- **Injection Rule**
  - Do not inject `@InjectQueue` in feature modules/services. Inject the queue's Producer service instead.

- **Separation of Concerns (API vs Workers)**
  - Support running workers in a separate Nest process for scale; share the same BullMQ root config.
  - Keep lightweight test/health endpoints under `src/modules/bullmq` when running in-app.

- **Types & Idempotency**
  - Strongly type job names/data per queue.
  - Use idempotent processors and consider setting `jobId` to a business key to deduplicate.

- **Observability & Ops**
  - Use `Logger`, `@OnWorkerEvent('completed'|'failed')`, and expose queue health endpoints.
  - Optional: integrate dashboards (e.g., bull-board) and metrics for queue depth/latency.

- **Example Layout**
  ```
  src/modules/bullmq/
    bullmq.module.ts
    bull.config.ts
    bullmq.feature.module.ts
    queues/
      normalize/
        normalize.types.ts
        normalize.queue.ts
        normalize.processor.ts
  ```

- **Controller & Service Guidance**
  - Controllers remain thin; enqueue from services using Producer services.
  - Validate DTOs and document enqueue endpoints with Swagger.

---

## 🔧 20. Environment Configuration (Copy-Paste Ready)

```env
# Database
DATABASE_URL="your-database-url"

# Supabase Configuration (handles all auth)
SUPABASE_URL="your-supabase-url"
SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Development
NODE_ENV=development
LOG_LEVEL=debug
PORT=3000

# CORS (for frontend)
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

---

## 🚨 18. Quick Error Resolution

### **Debug Checklist**
When something breaks:
1. **Check the logs** - errors usually have clear messages
2. **Verify environment variables** - missing vars cause mysterious errors
3. **Test API endpoints** - use Swagger docs or Postman
4. **Check database connection** - verify your DATABASE_URL
5. **Ask AI** - paste the error message and get instant help

---

## ⚡ 19. Development Workflow

1. **Describe feature to AI** → Get complete implementation
2. **Copy-paste code** → Into appropriate files  
3. **Test endpoint** → Using Swagger docs
4. **Debug if needed** → Check logs and ask AI to fix errors
5. **Move to next feature** → Repeat process

**Result**: Build complete backend in hours, not days! 🚀

---

## 🎯 Summary: Essential Rules for AI

### **Core Principles**
- **Use Supabase Auth** for authentication (no manual JWT setup needed)
- **Use Drizzle ORM** for all database operations
- **Log everything** with full objects and arrays (first 2 items)
- **Include execution time** in all operations
- **Use correlation IDs** for request tracing
- **Always validate inputs** with DTOs
- **Consistent API responses** with success/error format

### **AI Code Generation Focus**
- Generate complete CRUD operations
- Use Supabase Auth for user management
- Include proper error handling and logging
- Follow consistent naming patterns
- Use TypeScript types throughout
- Apply validation decorators on DTOs