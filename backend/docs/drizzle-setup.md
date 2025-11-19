# Drizzle ORM Configuration

This document describes the Drizzle ORM setup in the NestJS backend project.

## Overview

Drizzle ORM is configured as the primary database access layer for all `public` schema operations, following the **Database Access Strategy** rule: **Drizzle First, Supabase CLI Last**.

## Architecture

### Repository Pattern
- **BaseRepository**: Abstract class providing common CRUD operations
- **Domain Repositories**: Specific repositories for each entity (Users, Tasks, Profiles)
- **Single Responsibility**: Each repository handles one domain only
- **Composition over Inheritance**: Repositories extend BaseRepository for common functionality

### Module Structure
```
src/core/database/
├── database.module.ts          # Main database module
├── drizzle.service.ts          # Database connection service
├── repositories/
│   ├── base.repository.ts      # Common CRUD operations
│   ├── users.repository.ts     # User-specific operations
│   ├── tasks.repository.ts     # Task-specific operations
│   ├── profiles.repository.ts  # Profile-specific operations
│   └── index.ts               # Export all repositories
└── schema/
    ├── users.schema.ts         # Users table definition
    ├── tasks.schema.ts         # Tasks table definition
    ├── profiles.schema.ts      # Profiles table definition
    └── index.ts               # Export all schemas
```

## Configuration

### Environment Variables
```bash
# Required: Either DATABASE_URL or all individual parameters
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# Alternative: Individual connection parameters
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=database_name
DATABASE_USER=username
DATABASE_PASSWORD=password
```

### Drizzle Config
```typescript
// drizzle.config.ts
export default defineConfig({
  schema: './src/core/database/schema/*.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
  verbose: true,
  strict: true,
});
```

## Database Schema

### Users Table
```typescript
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  password: text('password').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  emailVerified: boolean('email_verified').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

### Tasks Table
```typescript
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  completed: boolean('completed').notNull().default(false),
  userId: uuid('user_id').notNull().references(() => users.id),
  dueDate: timestamp('due_date'),
  priority: text('priority').notNull().default('medium'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

### Profiles Table
```typescript
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique().references(() => users.id),
  bio: text('bio'),
  avatar: text('avatar'),
  location: text('location'),
  website: text('website'),
  company: text('company'),
  jobTitle: text('job_title'),
  skills: text('skills').array(),
  socialLinks: text('social_links').array(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

## Usage Examples

### Service Injection
```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly tasksRepo: TasksRepository,
  ) {}

  async createUser(userData: NewUser) {
    return this.usersRepo.createUser(userData);
  }
}
```

### Repository Operations
```typescript
// Find by ID with error handling
const user = await this.usersRepository.findUserById(userId);

// Find with conditions
const user = await this.usersRepository.findUserByEmail(email);

// Find all with pagination and filters
const users = await this.usersRepository.findAllUsers({
  limit: 10,
  offset: 0,
  search: 'john',
  isActive: true,
});

// Update with automatic timestamp
const updatedUser = await this.usersRepository.updateUser(id, { name: 'New Name' });

// Count records
const userCount = await this.usersRepository.getUserCount();
```

## Database Operations

### Available Scripts
```bash
# Generate migrations
npm run db:generate

# Apply migrations
npm run db:migrate

# Push schema changes (development)
npm run db:push

# Open Drizzle Studio
npm run db:studio
```

### Migration Workflow
1. **Development**: Use `npm run db:push` for quick schema updates
2. **Production**: Use `npm run db:generate` + `npm run db:migrate` for controlled deployments
3. **Schema Changes**: Modify schema files, then generate/apply migrations

## Testing

### Test Endpoints
- `GET /api/test/database-status` - Check database connection
- `POST /api/test/create-test-data` - Create sample data
- `GET /api/test/users` - Test user pagination
- `GET /api/test/tasks/search` - Test task search
- `GET /api/test/profiles/skills` - Test profile skills search

### Test Service
The `TestService` demonstrates repository usage patterns:
- Database connection testing
- CRUD operations
- Complex queries with filters
- Pagination and search

## Best Practices

### Repository Rules
1. **Extend BaseRepository** for common functionality
2. **Single Domain Focus** - one repository per entity
3. **Business Logic in Services** - repositories handle data access only
4. **Use TypeScript Types** - leverage Drizzle's inferred types

### Query Patterns
1. **Use Drizzle Query Builder** for type-safe queries
2. **Leverage BaseRepository Methods** for common operations
3. **Implement Proper Error Handling** with custom exceptions
4. **Use Transactions** for complex operations

### Performance
1. **Index Important Columns** (email, userId, createdAt)
2. **Limit Result Sets** with pagination
3. **Use Efficient Joins** when querying related data
4. **Monitor Query Performance** in development

## Error Handling

### Common Exceptions
- `NotFoundException` - Resource not found
- `BadRequestException` - Invalid input data
- `InternalServerErrorException` - Database connection issues

### Error Messages
All error messages are centralized in `src/common/constants/string-const.ts`:
```typescript
export enum MESSAGES {
  USER_NOT_FOUND = 'User not found',
  TASK_NOT_FOUND = 'Task not found',
  NOT_FOUND = 'Resource not found',
  // ... more messages
}
```

## Integration with Supabase

### When to Use Each
- **Drizzle ORM**: All `public` schema operations (users, tasks, profiles)
- **Supabase CLI**: `auth`, `storage`, `realtime` schemas only

### Example
```typescript
// ✅ Use Drizzle for public schema
const users = await this.usersRepository.findAllUsers();

// ✅ Use Supabase for auth schema
const { data: { user } } = await supabase.auth.getUser(token);
```

## Troubleshooting

### Common Issues
1. **Connection Failed**: Check DATABASE_URL and network connectivity
2. **Migration Errors**: Verify schema files and database permissions
3. **Type Errors**: Ensure Drizzle types are properly imported
4. **Performance Issues**: Check indexes and query optimization

### Debug Commands
```bash
# Check database connection
npm run test:env

# Generate fresh migrations
npm run db:generate

# Reset database (development only)
npm run db:push --force
```

## Future Enhancements

### Planned Features
- [ ] Connection pooling optimization
- [ ] Query performance monitoring
- [ ] Automated backup strategies
- [ ] Multi-database support
- [ ] Advanced caching layer

### Scalability Considerations
- **Read Replicas**: Implement for high-read workloads
- **Sharding**: Plan for multi-tenant scenarios
- **Caching**: Redis integration for frequently accessed data
- **Monitoring**: Database performance metrics and alerting
