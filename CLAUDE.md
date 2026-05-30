# **AI Coding Rules and Project Guidelines**

Use this document as mandatory instructions for any AI assistant or developer working on this project.

## **Core Coding Principles**

### **1. Follow DRY Concept**

- Do not repeat logic, code blocks, constants, validation rules, or response structures.
- Extract reusable logic into services, helpers, utilities, traits, middleware, or shared modules.
- Avoid duplicate API logic across controllers.
- If the same logic is needed in multiple places, create a common reusable function or layer.

### **2. Follow SOLID Principles**

- **Single Responsibility Principle:** Each class, function, controller, service, and module must have one clear responsibility.
- **Open/Closed Principle:** Code should be open for extension but closed for direct modification.
- **Liskov Substitution Principle:** Child classes or implementations must work correctly wherever the parent/interface is expected.
- **Interface Segregation Principle:** Do not create large interfaces with unused methods. Keep contracts focused.
- **Dependency Inversion Principle:** High-level modules should not directly depend on low-level implementations. Use abstractions, interfaces, dependency injection, or service contracts.

### **3. Loose Coupling Required**

- Keep controllers thin and move business logic into services.
- Avoid direct dependency between unrelated modules.
- Use dependency injection wherever possible.
- Avoid hardcoded values, static dependencies, and tightly coupled logic.
- Make modules reusable and independently testable.

### **4. Dynamic Code, Not Static Code**

- Avoid hardcoded IDs, statuses, roles, permissions, URLs, messages, and configuration values.
- Use configuration files, environment variables, constants, enums, database-driven settings, or reusable mappings.
- Code should support future changes without requiring major rewrites.

## **Architecture Rules**

### **5. Follow Current Project Architecture**

- Before adding or changing code, inspect the current project structure and follow the same architecture.
- Do not introduce a new architecture style unless explicitly required.
- Follow existing folder structure, naming conventions, design patterns, API style, service layer patterns, validation flow, middleware usage, and response format.
- New APIs, services, repositories, validators, middleware, and helpers must match the current project standards.

### **6. Do Not Break Existing Code**

- Before changing shared code, check where it is used.
- Do not modify common helpers, services, middleware, models, database schemas, or response handlers without checking impact.
- Avoid changes that affect existing APIs, frontend flows, cron jobs, queues, workers, or third-party integrations.
- Preserve backward compatibility unless a breaking change is explicitly approved.

### **7. Use Standard Best Practices**

- Follow the framework’s recommended standards.
- Use clean naming, proper folder structure, meaningful function names, and readable code.
- Avoid unnecessary complexity.
- Keep code simple, maintainable, scalable, and testable.
- Use comments only where they add real value.

## **Database and Transaction Rules**

### **8. Follow ACID for Database Flow**

All database operations must follow ACID principles:

- **Atomicity:** Related database operations must succeed or fail together.
- **Consistency:** Data must remain valid before and after the operation.
- **Isolation:** Parallel operations must not corrupt or conflict with each other.
- **Durability:** Once data is committed, it must be safely persisted.

### **9. Use Transactions Where Required**

- Use database transactions for create/update/delete flows involving multiple tables.
- Roll back transactions on failure.
- Do not partially save related data.
- Handle race conditions, duplicate submissions, and concurrency issues.
- Validate data before database writes.

### **10. Database Best Practices**

- Do not write unsafe raw queries unless necessary.
- Use ORM/query builder standards already followed in the project.
- Add indexes where needed for performance.
- Avoid N+1 queries.
- Use pagination for large lists.
- Never delete important records permanently unless the project already follows that pattern. Prefer soft delete if supported.

## **API Rules**

### **11. Keep Success and Error Responses Consistent**

- Success and error response format must match existing APIs.
- Do not introduce a new response structure.
- Use the same keys, status codes, message format, error format, pagination structure, and validation error structure already used in the project.
- Every API must return predictable responses.

Example response rules:

- Success response should follow the existing project success format.
- Error response should follow the existing project error format.
- Validation errors should follow the existing validation response format.
- Unauthorized, forbidden, not found, conflict, and server error responses must be standardized.

### **12. Suggest Missing APIs Required for Future Flow**

When implementing or reviewing any module, check whether future APIs may be required. If any required API is missing, suggest it clearly.

Examples:

- List API
- Detail API
- Create API
- Update API
- Delete API
- Status change API
- Bulk action API
- Search/filter API
- Export/import API
- Permission/role API
- Audit/history API
- Notification API
- File upload/delete API
- Restore API, if soft delete exists

Do not implement extra APIs without approval, but always recommend them when they are logically required.

### **13. API Validation Rules**

- Validate all request data before processing.
- Use existing validation style from the project.
- Do not trust frontend data.
- Validate required fields, data types, limits, enum values, relationships, ownership, permissions, and file types.
- Return validation errors in the same format as existing APIs.

### **14. API Security Rules**

- Check authentication and authorization for every protected API.
- Validate user ownership before reading, updating, or deleting records.
- Never expose sensitive data in API responses.
- Protect against SQL injection, XSS, CSRF, insecure file uploads, mass assignment, and IDOR issues.
- Use rate limiting where required.

## **Middleware Rules**

### **15. Check Middleware Functionality**

- Before creating new middleware, check existing middleware.
- Use existing middleware for authentication, authorization, validation, logging, localization, tenant checks, role checks, or API guards if available.
- Ensure routes are protected with the correct middleware.
- Do not duplicate middleware logic in controllers.
- Confirm middleware order does not break existing flow.

## **Error Handling and Logging**

### **16. Standard Error Handling**

- Use the project’s existing error handling pattern.
- Do not expose stack traces, database errors, or internal details to users.
- Handle known exceptions gracefully.
- Use meaningful error messages.
- Use correct HTTP status codes.

### **17. Logging Rules**

- Log important failures, unexpected exceptions, payment issues, queue failures, third-party failures, and security-related events.
- Do not log passwords, tokens, OTPs, secrets, private keys, or sensitive personal data.
- Follow the existing logging pattern.

## **Testing and Quality Rules**

### **18. Testing Recommendations**

- Add or suggest tests for important business logic.
- Test success cases, validation failures, unauthorized access, forbidden access, not found cases, transaction rollback, and edge cases.
- Ensure changes do not break existing tests.
- If tests are not present in the project, recommend adding them.

### **19. Code Review Checklist**

Before finalizing code, verify:

- DRY principle is followed.
- SOLID principles are followed.
- Code is loosely coupled.
- Current architecture is followed.
- No static/hardcoded logic is added unnecessarily.
- ACID principles are followed for DB operations.
- Transactions are used where required.
- Success/error responses match existing APIs.
- Middleware is used correctly.
- Existing shared code is not broken.
- Validation is complete.
- Authorization and ownership checks are complete.
- Error handling is standardized.
- Logs are safe and useful.
- Performance is acceptable.
- Missing future APIs are suggested.

## **Performance Rules**

### **20. Performance Best Practices**

- Avoid unnecessary database queries.
- Use eager loading or joins where appropriate.
- Use pagination for large data sets.
- Avoid loading unnecessary columns.
- Cache only when useful and safe.
- Avoid heavy operations inside request-response flow if they can be queued.

## **Third-Party Integration Rules**

### **21. External Service Handling**

- Keep third-party logic in separate service classes/modules.
- Do not call third-party APIs directly from controllers.
- Handle timeout, retry, failure, and fallback cases.
- Store credentials only in environment/config files.
- Log failures safely without exposing secrets.

## **File Upload Rules**

### **22. File Handling Standards**

- Validate file type, size, extension, and MIME type.
- Store files using the project’s existing storage pattern.
- Do not expose direct private file paths.
- Delete or replace old files safely when updating records.
- Use unique file names to avoid conflicts.

## **AI Assistant Working Instructions**

When working on this project, the AI assistant must:

1. First inspect the existing project structure and follow it.
2. Understand existing API response formats before creating or modifying APIs.
3. Check existing middleware before adding new middleware.
4. Check existing services, helpers, repositories, models, and validators before creating new ones.
5. Avoid duplicate code and follow DRY.
6. Follow SOLID and loose coupling.
7. Avoid hardcoded/static logic.
8. Follow ACID and use transactions for related DB changes.
9. Avoid changing shared code without checking usage impact.
10. Maintain backward compatibility.
11. Use standard best practices of the current framework.
12. Suggest missing APIs that may be required in the future.
13. Mention risks, assumptions, and required confirmations before making major changes.
14. Provide clean, production-ready code.
15. Explain any important architectural decision briefly.

## **Final Output Expectations from AI**

Whenever AI provides code or review, it should include:

- What was changed or suggested.
- Why the change is needed.
- Which files are affected.
- Any possible impact on existing functionality.
- Whether database transaction is required.
- Whether middleware is required or already exists.
- Whether response format follows existing APIs.
- Any missing APIs recommended for future use.
- Any testing recommendations.

## **Strict Rules**

- Do not create tightly coupled code.
- Do not add hardcoded values when dynamic/configurable values are possible.
- Do not change existing shared code without checking impact.
- Do not create a new response format.
- Do not skip validation.
- Do not skip authorization checks.
- Do not ignore database transaction requirements.
- Do not duplicate existing project functionality.
- Do not introduce a new architecture pattern without approval.
- Do not expose sensitive information in responses or logs.

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
| ------ | ---------- |
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
