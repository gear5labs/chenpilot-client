#!/usr/bin/env node

import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const owner = 'gear5labs';
const repository = 'chenpilot-client';
const batchMarker = '<!-- chenpilot-client-issue-batch-80-v1 -->';
const apiBase = `https://api.github.com/repos/${owner}/${repository}`;

const draft = (title, proposal, criteria, files, label = 'enhancement') => ({
  title,
  labels: [label],
  body: [
    '## Proposal',
    proposal,
    '',
    '## Acceptance criteria',
    `- ${criteria}`,
    '- Add focused tests for the changed behavior.',
    '- Update the relevant documentation or API contract if behavior or backend requirements change.',
    '',
    '## Relevant code',
    files.map((file) => '- `' + file + '`').join('\n'),
    '',
    batchMarker,
  ].join('\n'),
});

const drafts = [
  draft('Generate a QR code for a saved contact address', 'The contact card QR action in `src/app/contacts/page.tsx` is currently a placeholder. Generate a QR code for the complete address and let users inspect it before sharing.', 'The QR encodes the untruncated address, has an accessible name, and handles generation or clipboard failures without losing the address.', ['src/app/contacts/page.tsx', 'src/components/ui']),
  draft('Detect duplicate contact addresses before saving', 'Contacts can represent the same wallet address with different casing or whitespace. Normalize the address for comparison and explain the conflict before creating another entry.', 'Duplicate detection follows the supported address format and does not silently overwrite an existing contact.', ['src/app/contacts/page.tsx', 'src/services/api.ts']),
  draft('Preview contact imports before applying changes', 'The contact import utility parses a file, but users should be able to review valid rows and rejected rows before the import mutates their contact list.', 'The preview shows per-row validation results and only commits after an explicit confirmation.', ['src/utils/contactsImport.ts', 'src/app/contacts/page.tsx']),
  draft('Allow users to cancel a contact import in progress', 'Large contact imports need a clear cancellation path so a user can stop before partially applying a batch.', 'Cancel leaves the saved contact list unchanged and clears transient preview state.', ['src/utils/contactsImport.ts', 'src/app/contacts/page.tsx']),
  draft('Export saved contacts in a portable vCard format', 'Provide a standard vCard export so users can move their contact names and public wallet addresses to another address book.', 'The export contains only explicitly selected public contact fields and produces a valid downloadable vCard file.', ['src/app/contacts/page.tsx', 'src/utils']),
  draft('Add sorting options to the contacts list', 'The contacts view should let users sort by name or recently added rather than relying on the order returned by the service.', 'Sorting is deterministic, can be changed without a network request, and keeps the selected order while filtering.', ['src/app/contacts/page.tsx']),
  draft('Validate contact addresses against the selected network', 'Contact creation should make network compatibility visible before users later select an address in a payment flow.', 'Validation distinguishes malformed addresses from valid addresses on an unsupported network and explains the result.', ['src/app/contacts/page.tsx', 'src/utils/validation.ts']),
  draft('Support selecting multiple contacts for removal', 'Removing a set of obsolete contacts currently requires repeating the same interaction for each row.', 'Bulk removal requires confirmation, reports partial failures, and never removes contacts that were not selected.', ['src/app/contacts/page.tsx']),
  draft('Add a contact search field for large address books', 'The contacts page needs a fast way to find an entry by its display name or full address as the list grows.', 'Search is case-insensitive, matches the full stored address, and has a useful empty-result state.', ['src/app/contacts/page.tsx']),
  draft('Pin frequently used contacts to the top of the list', 'Users who send repeatedly to a small set of recipients should be able to keep those contacts easy to reach.', 'Pinned state is persisted using the existing client persistence conventions and is scoped to the current account.', ['src/app/contacts/page.tsx', 'src/store']),

  draft('Trim pasted recipient input without altering valid addresses', 'Pasted addresses sometimes contain surrounding whitespace or invisible characters. Normalize only safe surrounding characters before validation and show the final recipient clearly.', 'The form never changes a valid address internally and rejects embedded control characters.', ['src/components/payment/SendPaymentForm.tsx', 'src/utils/validation.ts']),
  draft('Prevent duplicate payment submissions while a request is pending', 'A slow payment request can be submitted more than once if the form remains actionable during the pending state.', 'The submit action is disabled while pending and duplicate clicks cannot trigger multiple payment requests.', ['src/components/payment/SendPaymentForm.tsx']),
  draft('Keep payment input intact after a recoverable submission failure', 'Users should not have to re-enter recipient, amount, asset, or memo after a timeout or temporary backend failure.', 'Recoverable failures preserve all form values and provide a safe retry action.', ['src/components/payment/SendPaymentForm.tsx', 'src/services/api.ts']),
  draft('Make payment review show the selected network and fee source', 'The final payment review should make clear which network will receive the payment and whether a fee is estimated or authoritative.', 'Review details distinguish estimated and confirmed fees and block submission when required fee data is unavailable.', ['src/components/payment/SendPaymentForm.tsx', 'CONTRIBUTING.md']),
  draft('Search transaction history by recipient address or memo', 'The history page should let users find a payment by its recipient or memo when they do not have the transaction hash.', 'Search is exact enough to avoid confusing partial address matches, combines predictably with existing filters, and has a clear no-results state.', ['src/app/transactions/page.tsx', 'src/components/dashboard/TransactionTable.tsx']),
  /*

*** Update File: /Users/user/Documents/projects/chenpilot-client/scripts/publish-issue-batch.mjs
@@ draft('Refresh the visible account balance after payment confirmation'
-  draft('Refresh the visible account balance after payment confirmation', 'After a successful send, the balance should be refreshed from the authoritative account service rather than waiting for a later page visit.', 'A confirmed payment triggers a balance refresh and clearly handles a refresh failure separately from payment failure.', ['src/components/payment/SendPaymentForm.tsx', 'src/store']),
+  draft('Warn before a payment would leave the Stellar account below its reserve', 'A payment review should make the network minimum-balance reserve visible when the account could fall below it after the transfer and fees.', 'The estimate uses the active network and authoritative balance data, and the warning is not presented as a guarantee of transaction success.', ['src/components/payment/SendPaymentForm.tsx', 'docs/API_CONTRACT.md']),

*** Update File: /Users/user/Documents/projects/chenpilot-client/scripts/publish-issue-batch.mjs
@@ draft('Display transaction timestamps in the user-selected locale'
-  draft('Display transaction timestamps in the user-selected locale', 'Wallet history should use consistent locale-aware date and number formatting while preserving exact decimal amounts.', 'Dates and labels follow the selected locale without converting financial values through floating-point arithmetic.', ['src/app/transactions/page.tsx', 'src/components/dashboard/TransactionTable.tsx']),
+  draft('Group transaction history by calendar day', 'A long transaction list is easier to scan when adjacent rows share a date heading while retaining their exact timestamps.', 'Grouping uses a documented timezone rule, preserves chronological ordering, and does not change the underlying timestamps.', ['src/app/transactions/page.tsx', 'src/components/dashboard/TransactionTable.tsx']),

*** Update File: /Users/user/Documents/projects/chenpilot-client/scripts/publish-issue-batch.mjs
@@ draft('Announce new incoming messages to assistive technology'
-  draft('Announce new incoming messages to assistive technology', 'Live chat updates should be discoverable without forcing screen-reader users to move focus from the composer.', 'A polite live region announces new message summaries without repeatedly reading the entire transcript.', ['src/components/chat']),
+  draft('Allow users to mute notifications for an individual conversation', 'Global notification preferences do not cover a noisy conversation; users should be able to mute one conversation without disabling notifications elsewhere.', 'Mute state is clearly visible, scoped to the current account and conversation, and does not change message delivery.', ['src/components/chat', 'src/store/slices/chatSlice.ts']),

*** Update File: /Users/user/Documents/projects/chenpilot-client/scripts/publish-issue-batch.mjs
@@ draft('Add explicit unauthorized and forbidden states to admin routes'
-  draft('Add explicit unauthorized and forbidden states to admin routes', 'The audit route should distinguish an unauthenticated user from a signed-in user without permission, without exposing audit data.', 'Both states avoid rendering protected records and provide an appropriate safe navigation action.', ['src/app/admin/audit/layout.tsx', 'src/app/admin/audit/page.tsx']),
+  draft('Filter audit history by actor and event category', 'Administrators need focused audit queries that combine an actor identity with a category of event.', 'Filters compose with the existing result state, can be reset independently, and do not expose fields the current user cannot access.', ['src/app/admin/audit/page.tsx']),

*** Update File: /Users/user/Documents/projects/chenpilot-client/scripts/publish-issue-batch.mjs
@@ draft('Add a reusable accessible status announcement component'
-  draft('Add a reusable accessible status announcement component', 'Loading, success, and error messages are implemented across independent flows; a shared primitive can keep announcement behavior consistent.', 'The primitive supports polite and assertive announcements, has no visual layout assumptions, and is covered by accessibility tests.', ['src/components/ui', 'src/test/accessibility.test.tsx'], 'task'),
+  draft('Add a skip-to-main-content link to authenticated layouts', 'Keyboard users should be able to bypass repeated navigation and move directly to the primary content on authenticated routes.', 'The link is the first focusable control, becomes visible on focus, and targets a stable main landmark.', ['src/components/layout/ChatLayout.tsx', 'src/app/dashboard/layout.tsx'], 'task'),

*** Update File: /Users/user/Documents/projects/chenpilot-client/scripts/publish-issue-batch.mjs
@@ draft('Document and test socket event version compatibility'
-  draft('Document and test socket event version compatibility', 'The client needs an explicit compatibility policy for socket payload changes so older clients fail safely rather than corrupting state.', 'The supported event versions and unknown-version behavior are documented and exercised in contract tests.', ['src/services/socketManager.ts', 'docs/SOCKET_CONNECTION_STATE.md', 'docs/API_CONTRACT.md'], 'documentation'),
+  draft('Test ordering of buffered socket messages after reconnect', 'A reconnect can deliver buffered events close to newly arriving events; verify that the chat state preserves the server-defined message order.', 'Tests cover duplicate, delayed, and out-of-order events without reordering already acknowledged messages.', ['src/services/socketManager.ts', 'src/hooks/useMessageOrdering.ts'], 'task'),

*** Update File: /Users/user/Documents/projects/chenpilot-client/scripts/publish-issue-batch.mjs
@@ draft('Expose socket reconnect attempt count in connection diagnostics'
-  draft('Expose socket reconnect attempt count in connection diagnostics', 'When a real-time session is degraded, users and support need to distinguish a first retry from a prolonged outage.', 'Retry diagnostics are bounded, do not reveal tokens, and reset after a successful connection.', ['src/components/status', 'src/services/socketManager.ts']),
+  draft('Show when the chat connection last synchronized successfully', 'A connected indicator alone can hide a stream that has not delivered updates recently; show the time of the last successful synchronization.', 'The timestamp updates only after a confirmed sync event and is distinguishable from the current socket connection time.', ['src/components/status', 'src/components/providers/SocketProvider.tsx']),

*** Update File: /Users/user/Documents/projects/chenpilot-client/scripts/publish-issue-batch.mjs
@@ draft('Test socket listener cleanup when providers unmount'
-  draft('Test socket listener cleanup when providers unmount', 'The socket manager has listener cleanup behavior that should be verified at the provider boundary to prevent events after navigation.', 'Unmounting removes registered handlers and repeated mount/unmount cycles do not multiply callbacks.', ['src/components/providers/SocketProvider.tsx', 'src/services/__tests__/socketManager.test.ts'], 'task'),
+  draft('Ignore socket events associated with a previous authenticated account', 'An event already in flight during sign-out or account switching must not update the next account session.', 'Account identity is checked before state updates and tests cover a delayed event arriving after a user change.', ['src/components/providers/SocketProvider.tsx', 'src/store/slices/authSlice.ts'], 'task'),

*** Update File: /Users/user/Documents/projects/chenpilot-client/scripts/publish-issue-batch.mjs
@@ draft('Document backend error codes consumed by wallet screens'
-  draft('Document backend error codes consumed by wallet screens', 'Wallet behavior depends on service errors, but contributors need one reference for error codes, retryability, and user-facing treatment.', 'The contract lists the consumed codes and each entry has a corresponding service or UI test.', ['docs/API_CONTRACT.md', 'src/services/api.ts'], 'documentation'),
+  draft('Document request correlation IDs for support reports', 'When the backend returns a request identifier, define how the client surfaces it so support can trace a failure without collecting private payloads.', 'The contract names the accepted header or field, redaction rules, and user-visible reporting behavior.', ['docs/API_CONTRACT.md', 'src/utils/logger.ts'], 'documentation'),

*** Update File: /Users/user/Documents/projects/chenpilot-client/scripts/publish-issue-batch.mjs
@@ draft('Make API service tests assert retry behavior for rate limits'
-  draft('Make API service tests assert retry behavior for rate limits', 'Rate-limit responses need deterministic retry policy coverage so wallet and agent operations do not retry unsafe requests.', 'Tests verify eligible methods, retry limits, backoff bounds, and preservation of non-retryable operations.', ['src/services/api.ts', 'src/services/__tests__/apiContracts.test.ts'], 'task'),
+  draft('Add contract tests for account funding statistics responses', 'Funding statistics are represented by service methods; response shapes and malformed values should be verified against a stable client contract.', 'Tests cover valid, empty, malformed, unauthorized, and unavailable responses without live network access.', ['src/services/api.ts', 'src/services/__tests__/apiContracts.test.ts'], 'task'),

*** Update File: /Users/user/Documents/projects/chenpilot-client/scripts/publish-issue-batch.mjs
@@ draft('Show queued offline messages and their delivery state'
-  draft('Show queued offline messages and their delivery state', 'Users need to distinguish a locally queued message from one acknowledged by the server.', 'Queued, sending, delivered, and failed states are visible and do not imply server delivery before acknowledgment.', ['src/hooks/useOfflineQueue.ts', 'src/components/chat']),
+  draft('Restore unsent chat composer drafts after route navigation', 'Navigating between conversations should not discard text that has not been submitted.', 'Drafts are isolated by conversation, restored only in the same authenticated account, and cleared after confirmed send or explicit deletion.', ['src/components/chat', 'src/store/slices/chatSlice.ts']),

*** Update File: /Users/user/Documents/projects/chenpilot-client/scripts/publish-issue-batch.mjs
@@ draft('Let users remove a single unsent item from the offline queue'
-  draft('Let users remove a single unsent item from the offline queue', 'Users should be able to discard one queued message without clearing unrelated queued work.', 'Removal is scoped to the selected item, updates persisted queue state, and is confirmed when discarding non-empty text.', ['src/hooks/useOfflineQueue.ts', 'src/components/chat']),
+  draft('Let users delete a locally saved voice message', 'Users should be able to remove one saved voice clip without clearing unrelated chat history or offline work.', 'Deletion is scoped to the selected clip, updates browser storage safely, and clearly distinguishes local deletion from server deletion.', ['src/components/chat/VoiceMessagePlayer.tsx', 'docs/PWA_OFFLINE_STRATEGY.md']),

*** Update File: /Users/user/Documents/projects/chenpilot-client/scripts/publish-issue-batch.mjs
@@ draft('Prevent stale offline queue entries from crossing account changes'
-  draft('Prevent stale offline queue entries from crossing account changes', 'Persisted queued work must not be replayed under a different authenticated account after sign-out or account switching.', 'Queue ownership is checked before replay and mismatched entries are quarantined or removed with a clear notice.', ['src/hooks/useOfflineQueue.ts', 'src/hooks/useAuth.ts', 'docs/PWA_OFFLINE_STRATEGY.md']),
+  draft('Clear account-owned browser data when switching authenticated users', 'A shared browser session must not expose one account\'s cached preferences or conversation metadata to the next signed-in account.', 'Only documented account-owned keys are cleared or namespaced, and public app preferences remain intact.', ['src/hooks/useAuth.ts', 'src/services/__tests__/storageInventory.test.ts', 'docs/PWA_OFFLINE_STRATEGY.md'], 'task'),

*** Update File: /Users/user/Documents/projects/chenpilot-client/scripts/publish-issue-batch.mjs
@@ draft('Resolve duplicate offline message replay after reconnect'
-  draft('Resolve duplicate offline message replay after reconnect', 'A lost acknowledgment can make replay uncertain; define how the client avoids sending the same queued message twice.', 'Replay uses a stable idempotency key when supported, otherwise exposes the backend contract limitation and avoids silent duplication.', ['src/hooks/useOfflineQueue.ts', 'docs/API_CONTRACT.md']),
+  draft('Handle chat acknowledgment timeouts without losing optimistic messages', 'A message that was sent but not acknowledged should remain inspectable while the client determines whether it can be retried.', 'The UI distinguishes unknown delivery from confirmed failure and does not resubmit automatically without an idempotency contract.', ['src/components/chat/ChatEngine.tsx', 'src/store/slices/chatSlice.ts', 'docs/API_CONTRACT.md']),

*** Update File: /Users/user/Documents/projects/chenpilot-client/scripts/publish-issue-batch.mjs
@@ draft('Report offline storage usage and quota failures accessibly'
-  draft('Report offline storage usage and quota failures accessibly', 'When persisted chat or queue data cannot be saved, users should know what was retained and what was not.', 'Quota failures are announced, stale-data cleanup is described accurately, and no private message content is included in diagnostics.', ['src/hooks/useOfflineQueue.ts', 'docs/PWA_OFFLINE_STRATEGY.md']),
+  draft('Let users clear locally stored voice history without clearing conversations', 'Users need a specific control for freeing space used by voice clips while keeping text messages and account data.', 'The action estimates affected local content, confirms before deletion, and does not send a server-side delete request.', ['src/components/chat', 'docs/PWA_OFFLINE_STRATEGY.md']),

*** Update File: /Users/user/Documents/projects/chenpilot-client/scripts/publish-issue-batch.mjs
@@ draft('Prompt users when a new service worker update is ready'
-  draft('Prompt users when a new service worker update is ready', 'A newly deployed client should provide a deliberate refresh action instead of leaving users on a stale cached bundle indefinitely.', 'The update prompt does not interrupt an active wallet transaction and reloads only after user confirmation.', ['src/app/layout.tsx', 'public/service-worker.js']),
+  draft('Validate web app manifest icons and metadata in CI', 'The install manifest should be checked automatically so missing icon assets or invalid display metadata are caught before deployment.', 'CI verifies referenced files, required icon sizes, and valid manifest fields without contacting external services.', ['public/manifest.webmanifest', '.github/workflows'], 'task'),

*** Update File: /Users/user/Documents/projects/chenpilot-client/scripts/publish-issue-batch.mjs
@@ draft('Add offline route guidance for unsupported protected pages'
-  draft('Add offline route guidance for unsupported protected pages', 'When navigation is offline, explain which public shell resources are available and avoid implying authenticated data is cached.', 'The offline state matches the cache allowlist and provides a safe retry action when connectivity returns.', ['src/app/offline', 'public/service-worker.js', 'docs/PWA_OFFLINE_STRATEGY.md']),
+  draft('Explain PWA installation availability in supported browsers', 'Users should be able to tell when the current browser supports app installation and what to do when it does not.', 'The UI checks browser capability safely, does not repeatedly prompt after dismissal, and provides a browser-appropriate fallback.', ['src/app/layout.tsx', 'public/manifest.webmanifest']),

*** Update File: /Users/user/Documents/projects/chenpilot-client/scripts/publish-issue-batch.mjs
@@ draft('Test service-worker upgrade and cache cleanup across releases'
-  draft('Test service-worker upgrade and cache cleanup across releases', 'Cache version changes should remove obsolete application assets without deleting unrelated origin storage.', 'Tests cover a version upgrade, allowlisted resource retention, and cleanup of only ChenPilot-owned cache names.', ['public/service-worker.js', 'src/app/offlineCachePolicy.test.ts'], 'task'),
+  draft('Test account data export with binary and malformed response headers', 'The data export fallback should handle valid binary downloads and safely reject malformed or misleading content headers.', 'Tests cover binary success, empty files, malformed filenames, and non-binary error responses without live network calls.', ['src/services/api.ts', 'src/services/__tests__/apiContracts.test.ts'], 'task'),

*** Update File: /Users/user/Documents/projects/chenpilot-client/scripts/publish-issue-batch.mjs
@@ draft('Add an explicit cancel action for an active agent response'
-  draft('Add an explicit cancel action for an active agent response', 'Users should be able to stop a long-running response and see whether the backend actually stopped execution.', 'Cancellation updates the response state, closes client resources, and distinguishes local stream closure from confirmed backend cancellation.', ['src/components/chat/ChatEngine.tsx', 'src/services/agentStream.ts', 'docs/API_CONTRACT.md']),
+  draft('Show an actionable timeout state for a stalled agent response', 'If an agent stream stops making progress, users need a clear distinction between a slow response and a failed connection.', 'The timeout policy is bounded, preserves partial output, and offers a retry without implying that backend execution was cancelled.', ['src/components/chat/ChatEngine.tsx', 'src/services/agentStream.ts']),

*** Update File: /Users/user/Documents/projects/chenpilot-client/scripts/publish-issue-batch.mjs
@@ draft('Add accessibility checks for chat and agent status views'
-  draft('Add accessibility checks for chat and agent status views', 'Automated accessibility coverage currently emphasizes auth, dialogs, contacts, and send; chat needs representative checks too.', 'Tests cover chat composer labels, live updates, message actions, and agent status without requiring a live backend.', ['src/test/accessibility.test.tsx', 'src/components/chat'], 'task'),
+  draft('Add keyboard navigation coverage for agent execution traces', 'Agent execution traces contain nested and expandable information that should be usable without a pointer.', 'Tests cover focus order, expand/collapse controls, and return focus without requiring a live backend.', ['src/components/agent', 'src/test/accessibility.test.tsx'], 'task'),
  -  draft('Add accessibility checks for chat and agent status views', 'Automated accessibility coverage currently emphasizes auth, dialogs, contacts, and send; chat needs representative checks too.', 'Tests cover chat composer labels, live updates, message actions, and agent status without requiring a live backend.', ['src/test/accessibility.test.tsx', 'src/components/chat'], 'task'),
  +  draft('Add keyboard navigation coverage for agent execution traces', 'Agent execution traces contain nested and expandable information that should be usable without a pointer.', 'Tests cover focus order, expand/collapse controls, and return focus without requiring a live backend.', ['src/components/agent', 'src/test/accessibility.test.tsx'], 'task'),
    */
  draft('Open transaction explorer links using the active network', 'Users should be able to verify a transaction on the correct explorer without manually copying its hash.', 'Explorer URLs are selected from configured network metadata and external links use safe rel attributes.', ['src/app/transactions/page.tsx', 'src/config/stellarNetwork.ts']),
  draft('Explain memo requirements before submitting a payment', 'Some destinations require a memo, but the send flow should distinguish an optional note from a destination-required memo.', 'The UI explains memo type and requirement, validates the selected format, and includes it in the final review.', ['src/components/payment/SendPaymentForm.tsx', 'docs/API_CONTRACT.md']),
  draft('Refresh the visible account balance after payment confirmation', 'After a successful send, the balance should be refreshed from the authoritative account service rather than waiting for a later page visit.', 'A confirmed payment triggers a balance refresh and clearly handles a refresh failure separately from payment failure.', ['src/components/payment/SendPaymentForm.tsx', 'src/store']),
  draft('Show a clear recovery action for failed transaction records', 'A failed transaction row should help users understand whether the payment can be retried or only inspected.', 'The UI differentiates retryable from terminal failures and never resubmits without user confirmation.', ['src/components/dashboard/TransactionTable.tsx', 'src/app/transactions/page.tsx']),
  draft('Display transaction timestamps in the user-selected locale', 'Wallet history should use consistent locale-aware date and number formatting while preserving exact decimal amounts.', 'Dates and labels follow the selected locale without converting financial values through floating-point arithmetic.', ['src/app/transactions/page.tsx', 'src/components/dashboard/TransactionTable.tsx']),
  draft('Make token issuer identity inspectable in asset selectors', 'Assets with the same symbol can have different issuers; users need a way to distinguish the exact asset before sending.', 'The picker exposes issuer details accessibly and carries the selected issuer through payment review.', ['src/components/payment/SendPaymentForm.tsx', 'src/components/dashboard/TransactionTable.tsx']),
  draft('Let users hide assets they do not want in wallet summaries', 'A user with many assets needs a way to reduce visual noise without deleting trustlines or changing account balances.', 'Hidden assets remain available in explicit asset management and are not represented as deleted.', ['src/app/dashboard/page.tsx', 'src/store']),
  draft('Add a confirmation summary before removing a trustline', 'Trustline removal can affect future receipt of an asset and should make the selected issuer and consequences clear before submission.', 'The confirmation names the exact asset and issuer and reports transaction outcomes without implying success before confirmation.', ['src/TrustlinesPanel.tsx', 'src/services/api.ts']),

  draft('Synchronize sign-out across open browser tabs', 'Signing out in one tab should not leave another tab displaying authenticated account data.', 'A sign-out event clears protected state in other tabs and does not broadcast credentials or tokens.', ['src/hooks/useAuth.ts', 'src/store/slices/authSlice.ts']),
  draft('Preserve the intended destination after session reauthentication', 'When a protected route requires a fresh login, successful reauthentication should return the user to the original safe destination.', 'Only same-origin application paths are restored, and failed reauthentication retains the current form state.', ['src/components/auth/ReauthDialog.tsx', 'src/hooks/useAuth.ts']),
  draft('Make login error messages actionable without exposing account existence', 'Login failures should help users recover while keeping responses uniform for unknown accounts and incorrect passwords.', 'The same public message is used for account-enumeration-sensitive failures and field-level errors remain accessible.', ['src/components/auth', 'src/services/auth.service.ts']),
  draft('Handle OAuth callback failures with a recoverable sign-in state', 'Users need a clear way back to authentication when an OAuth provider denies consent or returns an invalid callback.', 'Callback failure clears transient OAuth state, provides a retry route, and does not expose provider tokens in the UI.', ['src/app/auth', 'src/components/auth/GoogleSignIn.tsx']),
  draft('Validate OAuth callback state before accepting authentication', 'The client callback should reject missing, mismatched, or expired state values before treating a provider response as a completed sign-in.', 'State validation is covered for success, mismatch, expiry, and replay cases; backend contract assumptions are documented.', ['src/app/auth', 'src/services/auth.service.ts', 'docs/API_CONTRACT.md'], 'task'),
  draft('Add a visible password-manager-friendly autocomplete contract', 'Authentication inputs should expose stable autocomplete values so browsers and password managers can fill credentials safely.', 'Login, registration, and password-change fields use the correct autocomplete tokens and retain accessible labels.', ['src/components/auth', 'src/app/auth']),
  draft('Clear abandoned registration secrets when leaving the flow', 'Sensitive password fields and pending registration data should not remain in transient state after the user abandons registration.', 'Navigation away clears transient registration state without clearing unrelated account preferences.', ['src/components/auth/(register)/registerForm.tsx']),
  draft('Improve expired-session handling for protected route transitions', 'An expired session should send users to authentication with a clear explanation instead of leaving a partially rendered protected page.', 'Protected routes consistently handle expiry, retain a safe return path, and avoid rendering stale private data.', ['src/hooks/useAuth.ts', 'src/app/dashboard']),
  draft('Add session expiration coverage for backgrounded browser tabs', 'A suspended browser tab can resume after the server-side session expires and needs a deterministic recovery path.', 'Resume behavior refreshes or revalidates the session before protected actions and is covered with fake timers.', ['src/services/sessionService.ts', 'src/hooks/useAuth.ts'], 'task'),
  draft('Require an explicit final review before account data deletion', 'The irreversible account deletion flow should restate which account is affected and require a deliberate final action.', 'The final confirmation is keyboard accessible, cannot be triggered by an accidental Enter key, and handles server rejection safely.', ['src/components/settings/DangerZone.tsx']),
  draft('Show progress and cancellation boundaries during account export', 'Data export may take time; users need progress feedback and a clear statement about whether the operation can still be cancelled.', 'The export flow differentiates preparation, download, and failure states without logging exported content.', ['src/components/settings/DangerZone.tsx', 'src/services/api.ts']),
  draft('Validate exported data filenames and MIME types', 'Downloaded account archives should have predictable safe filenames and use the response content type rather than a hard-coded assumption.', 'Filename parsing rejects path separators and malformed headers, with a safe fallback name and focused tests.', ['src/services/api.ts', 'src/components/settings/DangerZone.tsx'], 'task'),
  draft('Offer an accessible paste-and-autofill experience for MFA codes', 'The MFA verification input should support one-time-code autofill and pasted six-digit values without weakening validation.', 'Autofill metadata is present, pasted input is normalized safely, and invalid code lengths are announced.', ['src/components/settings/MfaSettingsSection.tsx']),
  draft('Add a clear safe-storage option for one-time MFA recovery codes', 'Recovery codes are shown once today; provide a deliberate user-initiated download that avoids browser storage and logging.', 'Downloaded codes are not persisted by the app and the user is warned before leaving the one-time display.', ['src/components/settings/MfaSettingsSection.tsx', 'docs/API_CONTRACT.md']),

  draft('Show microphone permission state before starting a voice recording', 'The chat recording control should explain denied, unavailable, and granted microphone states before users try to record.', 'Permission failures have an accessible recovery message and do not leave a recorder or media stream running.', ['src/components/chat/ChatEngine.tsx']),
  draft('Enforce a configurable maximum voice-message duration', 'Long recordings can consume storage and network capacity; stop or warn at an explicit duration limit.', 'The limit is visible before recording, enforced at the boundary, and tested with mocked media APIs.', ['src/components/chat/ChatEngine.tsx', 'src/components/chat/VoiceMessagePlayer.tsx']),
  draft('Retry failed voice-message uploads without re-recording', 'A transient upload failure should preserve the recorded clip and let the user retry instead of losing the message.', 'Retry uses the same clip, prevents duplicate uploads, and offers deletion as a separate user action.', ['src/components/chat/ChatEngine.tsx']),
  draft('Provide keyboard controls for voice-message playback', 'Voice messages need accessible playback controls that can be used without a pointer.', 'Play, pause, seek, and playback position are keyboard operable and announced with accessible names.', ['src/components/chat/VoiceMessagePlayer.tsx']),
  draft('Add a copy action for individual chat messages', 'Users should be able to copy a selected message without selecting surrounding conversation text.', 'The action copies the original message text, reports clipboard failure, and has a descriptive accessible name.', ['src/components/chat', 'src/utils/clipboard.ts']),
  draft('Allow users to archive conversations without deleting them', 'Users need a way to declutter the conversation list while retaining messages and execution history.', 'Archived conversations are hidden from the default list, remain searchable in an archive view, and can be restored.', ['src/app/chat', 'src/store/slices/chatSlice.ts']),
  draft('Add an explicit cancel action for an active agent response', 'Users should be able to stop a long-running response and see whether the backend actually stopped execution.', 'Cancellation updates the response state, closes client resources, and distinguishes local stream closure from confirmed backend cancellation.', ['src/components/chat/ChatEngine.tsx', 'src/services/agentStream.ts', 'docs/API_CONTRACT.md']),
  draft('Preserve the prompt when an agent request fails', 'A failed agent request should not force users to reconstruct a long prompt before trying again.', 'The failed prompt remains editable and retryable, and duplicate requests are prevented while a retry is pending.', ['src/components/chat/ChatEngine.tsx', 'src/services/agentService.ts']),
  draft('Mark partial agent responses when streaming ends unexpectedly', 'An interrupted stream should not look like a complete answer when only part of the response arrived.', 'Partial output is labeled, the connection outcome is visible, and the original text remains available for copying.', ['src/services/agentStream.ts', 'src/components/chat/ChatEngine.tsx']),
  draft('Show which agent capabilities are confirmed by the backend', 'The capability status is available in service state, but chat actions should make confirmed, local-fallback, and unavailable capabilities distinguishable.', 'Only backend-confirmed capabilities are presented as available for the active deployment.', ['src/components/agent/AgentStatus.tsx', 'src/services/agentService.ts']),
  draft('Add a conversation export with clear privacy boundaries', 'Users should be able to export a conversation for their own records without exporting unrelated conversations or secrets.', 'The export is limited to the selected conversation, excludes credentials, and clearly identifies the file format.', ['src/app/chat', 'src/store/slices/chatSlice.ts']),
  draft('Announce new incoming messages to assistive technology', 'Live chat updates should be discoverable without forcing screen-reader users to move focus from the composer.', 'A polite live region announces new message summaries without repeatedly reading the entire transcript.', ['src/components/chat']),
  draft('Keep the chat composer usable when the on-screen keyboard opens', 'On small touch devices, the composer and send action should remain visible while the virtual keyboard is open.', 'The conversation remains scrollable, the composer is not obscured, and layout behavior is tested on mobile viewports.', ['src/components/chat', 'src/app/globals.css']),
  draft('Add an explicit attachment review step before sending chat files', 'If chat attachments are enabled, users should inspect file names and sizes and remove accidental selections before upload.', 'The review step enforces supported types and size limits and does not upload before confirmation.', ['src/components/chat/ChatEngine.tsx', 'docs/API_CONTRACT.md']),

  draft('Expose pagination controls on the admin audit view', 'The audit screen should provide predictable navigation through large event histories instead of relying on an unbounded list.', 'Pagination preserves active filters and shows a useful empty state at the end of the result set.', ['src/app/admin/audit/page.tsx']),
  draft('Add event-type and date filters to the admin audit view', 'Administrators need to narrow audit events by event type and time range while preserving the original event record.', 'Filters can be combined, cleared together, and represented in the URL or another shareable state.', ['src/app/admin/audit/page.tsx']),
  draft('Make admin audit records exportable for compliance review', 'Authorized administrators need a bounded export of the currently filtered audit records.', 'Export is permission-gated, reflects active filters, and never includes fields that are not rendered or documented for administrators.', ['src/app/admin/audit/page.tsx', 'docs/API_CONTRACT.md']),
  draft('Add explicit unauthorized and forbidden states to admin routes', 'The audit route should distinguish an unauthenticated user from a signed-in user without permission, without exposing audit data.', 'Both states avoid rendering protected records and provide an appropriate safe navigation action.', ['src/app/admin/audit/layout.tsx', 'src/app/admin/audit/page.tsx']),
  draft('Add request identifiers to client-visible support diagnostics', 'When an API response includes a request identifier, surface it in failure details so support can correlate a report without exposing payload data.', 'Only an allowlisted identifier is shown and the logging redaction rules remain in force.', ['src/services/api.ts', 'src/utils/logger.ts', 'src/docs/LOGGING_GUIDELINES.md'], 'task'),
  draft('Add a reusable accessible status announcement component', 'Loading, success, and error messages are implemented across independent flows; a shared primitive can keep announcement behavior consistent.', 'The primitive supports polite and assertive announcements, has no visual layout assumptions, and is covered by accessibility tests.', ['src/components/ui', 'src/test/accessibility.test.tsx'], 'task'),
  draft('Add a documented account-data retention and deletion summary', 'Users should be able to understand which client-cached data is removed at logout, account deletion, and storage cleanup.', 'The document maps each persisted data category to its lifecycle and matches the storage inventory tests.', ['docs/PWA_OFFLINE_STRATEGY.md', 'src/services/__tests__/storageInventory.test.ts'], 'documentation'),
  draft('Add a client-side privacy inventory for analytics and telemetry', 'Document what the client sends to external services and what is deliberately excluded from logs and diagnostics.', 'The inventory covers network destinations, data categories, retention assumptions, and a review process for new telemetry.', ['docs/LOGGING_GUIDELINES.md', 'docs/API_CONTRACT.md'], 'documentation'),

  draft('Validate socket event payloads before updating application state', 'Socket events are an external boundary; malformed payloads should be rejected before they reach chat or presence state.', 'Each consumed event has a runtime schema, malformed events are logged without payload leakage, and valid legacy payloads are covered.', ['src/services/socketManager.ts', 'src/store/slices/chatSlice.ts'], 'task'),
  draft('Document and test socket event version compatibility', 'The client needs an explicit compatibility policy for socket payload changes so older clients fail safely rather than corrupting state.', 'The supported event versions and unknown-version behavior are documented and exercised in contract tests.', ['src/services/socketManager.ts', 'docs/SOCKET_CONNECTION_STATE.md', 'docs/API_CONTRACT.md'], 'documentation'),
  draft('Avoid reconnecting a socket while the browser is offline', 'Socket reconnection attempts should respect the browser connectivity signal and resume predictably when connectivity returns.', 'Offline transitions stop unnecessary attempts and online transitions trigger at most one reconnect attempt.', ['src/components/providers/SocketProvider.tsx', 'src/services/socketManager.ts']),
  draft('Expose socket reconnect attempt count in connection diagnostics', 'When a real-time session is degraded, users and support need to distinguish a first retry from a prolonged outage.', 'Retry diagnostics are bounded, do not reveal tokens, and reset after a successful connection.', ['src/components/status', 'src/services/socketManager.ts']),
  draft('Test socket listener cleanup when providers unmount', 'The socket manager has listener cleanup behavior that should be verified at the provider boundary to prevent events after navigation.', 'Unmounting removes registered handlers and repeated mount/unmount cycles do not multiply callbacks.', ['src/components/providers/SocketProvider.tsx', 'src/services/__tests__/socketManager.test.ts'], 'task'),
  draft('Add structured client request timing diagnostics', 'Measure request duration by service and route class so slow client experiences can be investigated without logging request or response content.', 'Metrics exclude secrets and payloads, use bounded route labels, and can be disabled in production configuration.', ['src/services/api.ts', 'src/utils/logger.ts'], 'task'),
  draft('Add a consistent cancellation signal to agent service methods', 'Agent calls should honor caller cancellation consistently across streaming and non-streaming paths.', 'Aborted requests stop client-side work, are not misreported as server errors, and release stream resources.', ['src/services/agentService.ts', 'src/services/agentStream.ts'], 'task'),
  draft('Document backend error codes consumed by wallet screens', 'Wallet behavior depends on service errors, but contributors need one reference for error codes, retryability, and user-facing treatment.', 'The contract lists the consumed codes and each entry has a corresponding service or UI test.', ['docs/API_CONTRACT.md', 'src/services/api.ts'], 'documentation'),
  draft('Add contract tests for account funding statistics responses', 'Funding statistics are represented by service methods; response shapes and malformed values should be verified against a stable client contract.', 'Tests cover valid, empty, malformed, unauthorized, and unavailable responses without live network access.', ['src/services/api.ts', 'src/services/__tests__/apiContracts.test.ts'], 'task'),
  draft('Make API service tests assert retry behavior for rate limits', 'Rate-limit responses need deterministic retry policy coverage so wallet and agent operations do not retry unsafe requests.', 'Tests verify eligible methods, retry limits, backoff bounds, and preservation of non-retryable operations.', ['src/services/api.ts', 'src/services/__tests__/apiContracts.test.ts'], 'task'),

  draft('Show queued offline messages and their delivery state', 'Users need to distinguish a locally queued message from one acknowledged by the server.', 'Queued, sending, delivered, and failed states are visible and do not imply server delivery before acknowledgment.', ['src/hooks/useOfflineQueue.ts', 'src/components/chat']),
  draft('Let users remove a single unsent item from the offline queue', 'Users should be able to discard one queued message without clearing unrelated queued work.', 'Removal is scoped to the selected item, updates persisted queue state, and is confirmed when discarding non-empty text.', ['src/hooks/useOfflineQueue.ts', 'src/components/chat']),
  draft('Prevent stale offline queue entries from crossing account changes', 'Persisted queued work must not be replayed under a different authenticated account after sign-out or account switching.', 'Queue ownership is checked before replay and mismatched entries are quarantined or removed with a clear notice.', ['src/hooks/useOfflineQueue.ts', 'src/hooks/useAuth.ts', 'docs/PWA_OFFLINE_STRATEGY.md']),
  draft('Resolve duplicate offline message replay after reconnect', 'A lost acknowledgment can make replay uncertain; define how the client avoids sending the same queued message twice.', 'Replay uses a stable idempotency key when supported, otherwise exposes the backend contract limitation and avoids silent duplication.', ['src/hooks/useOfflineQueue.ts', 'docs/API_CONTRACT.md']),
  draft('Report offline storage usage and quota failures accessibly', 'When persisted chat or queue data cannot be saved, users should know what was retained and what was not.', 'Quota failures are announced, stale-data cleanup is described accurately, and no private message content is included in diagnostics.', ['src/hooks/useOfflineQueue.ts', 'docs/PWA_OFFLINE_STRATEGY.md']),
  draft('Prompt users when a new service worker update is ready', 'A newly deployed client should provide a deliberate refresh action instead of leaving users on a stale cached bundle indefinitely.', 'The update prompt does not interrupt an active wallet transaction and reloads only after user confirmation.', ['src/app/layout.tsx', 'public/service-worker.js']),
  draft('Add offline route guidance for unsupported protected pages', 'When navigation is offline, explain which public shell resources are available and avoid implying authenticated data is cached.', 'The offline state matches the cache allowlist and provides a safe retry action when connectivity returns.', ['src/app/offline', 'public/service-worker.js', 'docs/PWA_OFFLINE_STRATEGY.md']),
  draft('Test service-worker upgrade and cache cleanup across releases', 'Cache version changes should remove obsolete application assets without deleting unrelated origin storage.', 'Tests cover a version upgrade, allowlisted resource retention, and cleanup of only ChenPilot-owned cache names.', ['public/service-worker.js', 'src/app/offlineCachePolicy.test.ts'], 'task'),

  draft('Add a browser-level test for payment form keyboard flow', 'The payment form needs end-to-end keyboard coverage from recipient entry through review and submission.', 'The test verifies focus order, validation announcements, confirmation controls, and recovery from a mocked failure.', ['e2e/wallet-critical-paths.spec.ts', 'src/components/payment/SendPaymentForm.tsx'], 'task'),
  draft('Add end-to-end coverage for account export and deletion safeguards', 'Critical account settings actions should be validated in a browser with intercepted backend responses.', 'Tests verify reauthentication, destructive confirmation, failure recovery, and absence of sensitive values in URLs.', ['e2e', 'src/components/settings/DangerZone.tsx'], 'task'),
  draft('Add accessibility checks for chat and agent status views', 'Automated accessibility coverage currently emphasizes auth, dialogs, contacts, and send; chat needs representative checks too.', 'Tests cover chat composer labels, live updates, message actions, and agent status without requiring a live backend.', ['src/test/accessibility.test.tsx', 'src/components/chat'], 'task'),
];

function normalizeTitle(title) {
  return title.toLocaleLowerCase('en').replace(/[^a-z0-9]+/g, ' ').trim();
}

async function githubRequest(path, token, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub API ${response.status} ${response.statusText}: ${detail}`);
  }

  return response.status === 204 ? null : response.json();
}

async function getAllIssues(token) {
  const issues = [];
  for (let page = 1; ; page += 1) {
    const pageIssues = await githubRequest(`/issues?state=all&per_page=100&page=${page}`, token);
    issues.push(...pageIssues.filter((issue) => !issue.pull_request));
    if (pageIssues.length < 100) return issues;
  }
}

function validateCatalog() {
  if (drafts.length !== 80) throw new Error(`Expected exactly 80 drafts; found ${drafts.length}.`);
  const titles = drafts.map(({ title }) => normalizeTitle(title));
  if (new Set(titles).size !== drafts.length) throw new Error('The draft catalog contains duplicate titles.');

  for (const { title, body, labels } of drafts) {
    if (!title || title.length > 256 || !body || labels.length === 0) {
      throw new Error(`Invalid issue draft: ${title || '(missing title)'}`);
    }
  }
}

async function main() {
  validateCatalog();
  const argumentsList = process.argv.slice(2);
  const publish = argumentsList.includes('--publish');
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (publish && !token) throw new Error('Set GH_TOKEN (or GITHUB_TOKEN) in the environment before publishing.');
  if (argumentsList.some((argument) => argument !== '--publish' && argument !== '--help')) {
    throw new Error('Usage: node scripts/publish-issue-batch.mjs [--publish]');
  }
  if (argumentsList.includes('--help')) {
    console.log('Preview: node scripts/publish-issue-batch.mjs');
    console.log('Publish: GH_TOKEN=... node scripts/publish-issue-batch.mjs --publish');
    return;
  }

  const existing = await getAllIssues(publish ? token : undefined);
  const existingByTitle = new Map(existing.map((issue) => [normalizeTitle(issue.title), issue]));
  const previouslyPublished = [];
  const conflicts = [];
  const pending = [];

  for (const issue of drafts) {
    const match = existingByTitle.get(normalizeTitle(issue.title));
    if (!match) pending.push(issue);
    else if (match.body?.includes(batchMarker)) previouslyPublished.push({ draft: issue, number: match.number });
    else conflicts.push({ title: issue.title, number: match.number, state: match.state });
  }

  console.log(`Repository: ${owner}/${repository}`);
  console.log(`Catalog: ${drafts.length} issue drafts; existing issues scanned: ${existing.length}`);
  console.log(`Already published by this batch: ${previouslyPublished.length}`);
  console.log(`New issues to create: ${pending.length}`);
  for (const issue of pending) console.log(`- [${issue.labels.join(', ')}] ${issue.title}`);

  if (conflicts.length > 0) {
    console.error('\nTitle conflicts found; nothing was published:');
    for (const conflict of conflicts) console.error(`- #${conflict.number} (${conflict.state}): ${conflict.title}`);
    process.exitCode = 1;
    return;
  }
  if (!publish) {
    console.log('\nPreview only. Add --publish to create these issues.');
    return;
  }

  const confirmation = readline.createInterface({ input: stdin, output: stdout });
  const answer = await confirmation.question(`Type PUBLISH ${pending.length} to confirm: `);
  confirmation.close();
  if (answer !== `PUBLISH ${pending.length}`) {
    console.log('Confirmation did not match; nothing was published.');
    return;
  }

  const created = [];
  for (const issue of pending) {
    const result = await githubRequest('/issues', token, {
      method: 'POST',
      body: JSON.stringify(issue),
    });
    created.push(result);
    console.log(`Created #${result.number}: ${result.title} ${result.html_url}`);
    if (created.length < pending.length) await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(`\nCreated ${created.length} issues. Previously created by this batch: ${previouslyPublished.length}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});