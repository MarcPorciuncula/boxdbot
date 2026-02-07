# Dependency Injection Pattern

This project uses a functional Dependency Injection (DI) pattern. While the functions are named using the `useXXX` convention (similar to React Hooks), they are **not** React Hooks and do not follow React's rules (like call order or top-level only).

## Core Principles

1.  **Pure Dependency Injection:** Functions should not instantiate their own dependencies. Instead, they should receive all required dependencies as arguments.
2.  **Object-Based Parameters:** Dependencies must always be passed as a single object (the "context" or "deps" object). This makes it easier to add or remove dependencies without breaking positional arguments.
3.  **Explicit Resolution:** The caller (usually the Worker entry point or a top-level handler) is responsible for resolving all dependencies. This includes awaiting any asynchronous initialization (like database table provisioning).
4.  **Separation of Concerns:** Repositories handle data access and schema provisioning (`ensureTable`), while Services handle business logic by orchestrating repositories.

## Example Pattern

### Repository (Async Initialization)
```typescript
export type UserRepository = Awaited<ReturnType<typeof useUserRepository>>;

export async function useUserRepository({ db }: { db: D1Database }) {
  await ensureTable(db, 'users', { ... });
  
  return {
    async findById(id: string) { ... }
  };
}
```

### Service (Synchronous Factory)
```typescript
export function useUserService({ repository }: { repository: UserRepository }) {
  return {
    async register(data: any) {
      return repository.save(data);
    }
  };
}
```

### Composition (The Worker)
```typescript
const userRepo = await useUserRepository({ db: env.DB });
const userService = useUserService({ repository: userRepo });
```
