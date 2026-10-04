# Contributor Logging Guidelines (#924)

## High-Cardinality & Sensitive Data Protection

To avoid ballooning log ingestion costs, degrading query performance, and leaking sensitive user information, all logging in **Prompt Hash Stellar** must follow these strict rules:

### 1. Never Log Raw User Inputs or Secrets
- **Forbidden Fields:** Passwords, JWT/OAuth tokens, Stellar secret keys (`S...`), private keys, raw prompt text payloads, user emails.
- Use `logger` from `@/utils/logger`. The logger automatically redacts sensitive keys and replaces them with `[REDACTED, hash_xxxx]`.

### 2. Use Safe Correlation IDs for Debuggability
- Instead of logging high-cardinality user identifiers (such as full raw prompt strings or email addresses), generate or use a safe correlation ID:
  ```typescript
  import { generateCorrelationId, hashValue } from '@/utils/logger';

  const correlationId = generateCorrelationId('prompt_pub');
  const safePromptHash = hashValue(rawPromptText);

  logger.info(`Processing prompt publishing transaction`, { correlationId, promptHash: safePromptHash });
  ```

### 3. Automatic Truncation & Classification
- Long user strings (>120 characters) are automatically truncated with length metadata and deterministic SHA hashes.
- Debug logs (`logger.debug`) are only printed in `development` and `test` environments.

### 4. Verification & Testing
- Run `npm test` or `npx vitest run src/utils/__tests__/logger.test.ts` to verify log sanitization and correlation ID security.
