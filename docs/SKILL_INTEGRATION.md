# Skill Integration Checklist

Comprehensive checklist for building a new skill for the AlphaHuman platform. Derived from the Telegram and Notion reference implementations.

---

## 1. Project Scaffolding

- [ ] Create skill directory: `src/<skill-name>/`
- [ ] Create subdirectories: `api/`, `tools/`, `db/`, `__tests__/`
- [ ] Skill name uses lowercase-hyphens (no underscores)
- [ ] (Optional) Create `package.json` for per-skill npm dependencies

---

## 2. Manifest (`manifest.json`)

### Required Fields
- [ ] `id` — unique kebab-case identifier
- [ ] `name` — human-readable display name
- [ ] `runtime` — `"quickjs"`
- [ ] `entry` — `"index.js"`
- [ ] `version` — semver string
- [ ] `description` — one-line summary
- [ ] `platforms` — array of supported platforms (`windows`, `macos`, `linux`, `android`, `ios`)

### Optional Fields
- [ ] `auto_start` — whether skill starts automatically (default `false`)
- [ ] `env` — required environment variables (array of `{ name, description }`)
- [ ] `setup.required` — whether setup wizard is mandatory
- [ ] `setup.label` — button label for setup (e.g., "Connect Notion")
- [ ] `events` — array of events the skill emits (each with `name` and `description`)
- [ ] `entity_schema.entities` — entity types exposed to the knowledge graph (each with `type`, `name`, `description`, `properties`)
- [ ] `entity_schema.relationships` — how entities relate (`type`, `from`, `to`, `cardinality`)

---

## 3. Types (`types.ts`)

- [ ] Define **config interface** (all user-configurable settings)
- [ ] Define **API response types** (one per external API endpoint/object)
- [ ] Define **database row types** (one per SQLite table)
- [ ] Define **domain-specific enums/unions** (e.g., chat types, status codes)
- [ ] Define **query result types** (extended row types for joined queries)
- [ ] All types exported; no runtime code in this file

---

## 4. State Management (`state.ts`)

- [ ] Define `SkillState` interface covering:
  - [ ] `config` — persisted configuration
  - [ ] `cache` — in-memory cached objects (current user, lists, timestamps)
  - [ ] Client/connection state (client instance, connecting flag, error)
  - [ ] Auth state (authentication stage/status)
  - [ ] Sync state (inProgress, completed, lastSyncTime, error)
  - [ ] Storage statistics (counts for main entities)
- [ ] Initialize state with sensible defaults
- [ ] Register `globalThis.get<SkillName>State()` accessor
- [ ] Register `globalThis.__<skillName>State` for direct access
- [ ] Ensure pattern works in both esbuild IIFE and test harness

---

## 5. Database Schema (`db/schema.ts`)

- [ ] `CREATE TABLE IF NOT EXISTS` for each entity table
- [ ] `CREATE INDEX IF NOT EXISTS` for frequently queried columns
- [ ] Primary keys defined (TEXT for external IDs, composite keys where needed)
- [ ] `created_at` and `updated_at` timestamp columns on all tables
- [ ] `sync_state` key-value table for tracking sync metadata
- [ ] Register `globalThis.initialize<SkillName>Schema()` function
- [ ] All SQL uses `?` parameter placeholders (never string interpolation)

### Common Tables to Consider
- [ ] Main entity table(s) (e.g., chats, pages, items)
- [ ] Secondary entity table(s) (e.g., messages, blocks, contacts)
- [ ] Relationship/junction table(s) if needed
- [ ] Summaries table (for AI context, key topics)
- [ ] Sync state table (`key TEXT PRIMARY KEY, value TEXT`)

---

## 6. Database Helpers (`db/helpers.ts`)

### Upsert Functions
- [ ] One upsert function per entity table (INSERT ... ON CONFLICT DO UPDATE)
- [ ] Handles both new inserts and updates (preserving `created_at`)
- [ ] Extracts/transforms API data into row format

### Update Functions
- [ ] Granular update functions for individual fields (e.g., `updateTitle`, `updateStatus`)
- [ ] Soft-delete function if applicable (`is_deleted` flag instead of DELETE)

### Query Functions
- [ ] Get by ID
- [ ] Search/filter with LIKE queries
- [ ] List with pagination (LIMIT/OFFSET)
- [ ] Aggregate stats (COUNT, SUM)
- [ ] Sync state get/set helpers

### Utility Functions
- [ ] Type parsers (convert API types → simplified enums)
- [ ] Content extractors (preview text, content type detection)
- [ ] Status mappers (API status → display string)

### Registration
- [ ] Register all helpers on `globalThis.<skillName>Db.*`

---

## 7. API Layer (`api/`)

### Client/Auth (`api/client.ts`)
- [ ] Central `apiFetch()` or equivalent function
- [ ] Handles authentication header injection (API key, OAuth token, etc.)
- [ ] Handles multiple auth methods if applicable (token vs OAuth)
- [ ] Sets correct `Content-Type` and API version headers
- [ ] Error response parsing (status code → error message)
- [ ] Rate limiting awareness (detect 429, respect retry-after)
- [ ] Timeout configuration

### API Domain Files (one per domain)
- [ ] `api/auth.ts` — authentication/connection verification
- [ ] `api/<entity>.ts` — CRUD operations per entity type
- [ ] Each function is a pure function taking explicit parameters
- [ ] Each function returns parsed response (not raw HTTP)

### Barrel Export
- [ ] `api/index.ts` re-exports all API functions

### Common API Operations to Implement
- [ ] **Verify credentials** — validate API key/token works
- [ ] **Get current user/account** — identity check
- [ ] **List/search entities** — paginated listing
- [ ] **Get entity by ID** — single item retrieval
- [ ] **Create entity** — new item creation
- [ ] **Update entity** — modify existing item
- [ ] **Delete/archive entity** — remove item
- [ ] **Pagination handling** — cursor-based or offset-based

---

## 8. Setup Wizard (`setup.ts`)

### `onSetupStart()`
- [ ] Detect current auth state and return appropriate first step
- [ ] Support resuming interrupted setup (return code/password step if mid-auth)
- [ ] Handle "already connected" scenario (offer keep/reconnect)
- [ ] Handle migration from legacy auth to newer auth (if applicable)

### `onSetupSubmit(stepId, values)`
- [ ] Validate each field (required fields, format validation)
- [ ] Return `{ status: 'error', errors: [...] }` with field-level errors
- [ ] Return `{ status: 'next', nextStep: {...} }` for multi-step flows
- [ ] Return `{ status: 'complete' }` when finished
- [ ] Persist validated config to `state.set('config', ...)`
- [ ] Call `publishState()` after successful setup

### `onSetupCancel()`
- [ ] Clean up any partial state
- [ ] Reset pending flags

### Setup Field Types to Consider
- [ ] `password` — for API keys and tokens (masked input)
- [ ] `text` — for names, labels, URLs
- [ ] `select` — for region/workspace selection
- [ ] `boolean` — for feature toggles
- [ ] `number` — for numeric configuration

### Auth Flows to Support
- [ ] **API Key/Token** — simple paste-and-validate
- [ ] **OAuth** — multi-step with redirect flow (startOAuth → pending → complete)
- [ ] **Phone + Code** — multi-step verification (phone → code → optional 2FA)
- [ ] **Migration** — upgrade from legacy auth to modern auth

---

## 9. Data Sync (`sync.ts`)

### `performInitialSync(onProgress?)`
- [ ] Paginated fetching of all primary entities (respect API limits)
- [ ] Upsert each entity to database via `db/helpers.ts`
- [ ] Load secondary entities for top N primary entities (e.g., messages for top 20 chats)
- [ ] Load related entities (e.g., contacts, members, tags)
- [ ] Report progress via `onProgress()` callback
- [ ] Mark sync as complete in sync_state table
- [ ] Record `last_sync_time`

### `incrementalSync()`
- [ ] Fetch only changed/new data since last sync
- [ ] Use cursors, timestamps, or change tokens from API
- [ ] Upsert changed entities

### `isSyncCompleted()`
- [ ] Check sync_state table for completion flag

### `getLastSyncTime()`
- [ ] Return timestamp from sync_state table

### Registration
- [ ] Register on `globalThis.<skillName>Sync.*`

---

## 10. Update/Event Handlers (`update-handlers.ts`)

_Only needed for real-time integrations (WebSocket, polling, push updates)._

### Handler Registry
- [ ] Map of update type → handler function
- [ ] `dispatchUpdate(update)` — central dispatcher with error catching

### Entity Handlers
- [ ] New entity created → upsert to DB, emit event
- [ ] Entity updated → update DB fields, emit event
- [ ] Entity deleted → soft-delete or remove from DB, emit event

### Event Emission
- [ ] Use `hooks.emit()` for each event defined in manifest
- [ ] Include: event type, source skill, timestamp, entity IDs, relevant data
- [ ] Enrich events with context (sender name, chat title, etc.)

---

## 11. Tools (`tools/`)

### Tool Structure (one file per tool or logical group)
- [ ] `name` — kebab-case, prefixed with skill name (e.g., `notion-search`, `telegram-send-message`)
- [ ] `description` — clear, actionable description for AI
- [ ] `input_schema` — JSON Schema with `properties` and `required`
- [ ] `execute(args)` — returns JSON string

### Common Tool Categories

#### Read Tools
- [ ] **Get status** — skill connection/health status
- [ ] **Search** — full-text search across entities
- [ ] **Get by ID** — retrieve single entity
- [ ] **List** — paginated entity listing
- [ ] **Get stats** — aggregate statistics

#### Write Tools
- [ ] **Create** — new entity creation
- [ ] **Update/Edit** — modify existing entity
- [ ] **Delete/Archive** — remove entity
- [ ] **Send** — post messages, comments, etc.

#### Management Tools
- [ ] **Manage settings** — modify entity properties (title, permissions, etc.)
- [ ] **Member operations** — add/remove members, change roles
- [ ] **Organization** — folders, categories, tags

### Tool Implementation Patterns
- [ ] Access state via `globalThis.get<SkillName>State()`
- [ ] Check client/connection exists before API calls
- [ ] Validate required parameters, return error if missing
- [ ] Parse string IDs (external services may use large integers)
- [ ] Always wrap in try/catch
- [ ] Return `JSON.stringify({ success: true, ... })` on success
- [ ] Return `JSON.stringify({ success: false, error: "..." })` on failure
- [ ] Include helpful context in responses (counts, previews, links)

### Barrel Export
- [ ] `tools/index.ts` re-exports all tool definitions

---

## 12. Entry Point (`index.ts`)

### Import Order
1. State module (`./state`)
2. DB schema module (`./db/schema`)
3. DB helpers module (`./db/helpers`)
4. Sync module (`./sync`)
5. API modules (`./api`)
6. Setup module (`./setup`)
7. Tool modules (`./tools`)
8. Update handlers (`./update-handlers`) if applicable

### Lifecycle Hooks

#### `init()`
- [ ] Initialize database schema (`globalThis.initialize<SkillName>Schema()`)
- [ ] Load persisted config from `state.get('config')`
- [ ] Load sync state from database
- [ ] Initialize client/connection (non-blocking)
- [ ] Publish initial state

#### `start()`
- [ ] Register cron schedules for periodic sync
- [ ] Start update loop (for real-time integrations)
- [ ] Trigger initial sync if not yet completed
- [ ] Publish running state

#### `stop()`
- [ ] Unregister cron schedules
- [ ] Stop update loop / close connection
- [ ] Persist current config
- [ ] Clean up resources

#### `onCronTrigger(scheduleId)`
- [ ] Handle periodic sync triggers
- [ ] Handle scheduled maintenance tasks
- [ ] Wrap in try/catch with `platform.notify()` on error

#### `onSessionStart(args)` / `onSessionEnd(args)`
- [ ] Track active AI sessions (optional)
- [ ] Load fresh data for session context

#### `onListOptions()`
- [ ] Return runtime-configurable options (e.g., sync interval, feature toggles)

#### `onSetOption(args)`
- [ ] Update config for the changed option
- [ ] Re-register cron if interval changed
- [ ] Persist updated config

#### `onPing()`
- [ ] Health check: verify client connected and authenticated
- [ ] Verify API credentials still valid
- [ ] Return connection status

#### `onError(args)`
- [ ] Handle skill errors from setup or runtime
- [ ] Reset pending flags
- [ ] Log error details

#### `onDisconnect()`
- [ ] Clear stored credentials/tokens
- [ ] Revoke OAuth credentials if applicable
- [ ] Reset connection state
- [ ] Publish disconnected state

### State Publishing (`publishState()`)
- [ ] Map internal state → `state.setPartial({...})`
- [ ] Include: `connection_status`, `is_initialized`, `error`, `authMethod`
- [ ] Include: entity counts, last sync time
- [ ] Include: auth-specific status (e.g., `auth_status` for multi-step auth)

### Tool Registration
- [ ] Assemble `tools` array from all imported tool definitions
- [ ] Include a status tool that reports skill health

---

## 13. Helper Utilities (`helpers.ts`)

_Optional file for shared utility functions._

- [ ] Content formatting (rich text → plain text, markdown conversion)
- [ ] ID parsing/normalization
- [ ] Date formatting
- [ ] Text truncation with ellipsis
- [ ] Sensitive data masking (phone numbers, tokens)

---

## 14. Tests (`__tests__/test-<skill>.ts`)

### Test Infrastructure

#### `freshInit(overrides?)` Helper
- [ ] Accepts: `config`, `fetchResponses`, `fetchErrors`, `env`, `oauthAvailable`, `oauthCredentials`
- [ ] Calls `_setup({...})` with mock configuration
- [ ] Resets skill module-level state
- [ ] Calls `init()`

#### `configuredInit(additionalFetchResponses?)` Helper
- [ ] Pre-configures with valid credentials
- [ ] Mocks common API responses (user/me, search, etc.)
- [ ] Optionally accepts additional fetch mocks

### Test Categories

#### Initialization Tests
- [ ] Loads config from store when available
- [ ] Handles missing config gracefully (no errors)
- [ ] Detects OAuth credentials on init
- [ ] Prefers OAuth over legacy token when both available
- [ ] Initializes database schema without errors

#### Start/Stop Tests
- [ ] Publishes connected state when configured
- [ ] Does not fail when not configured
- [ ] Registers cron schedules on start
- [ ] Cleans up on stop

#### Setup Flow Tests — Token/API Key Auth
- [ ] Returns correct first step (field names, types)
- [ ] Validates empty/missing credentials
- [ ] Validates credential format (regex patterns)
- [ ] Completes with valid credentials
- [ ] Handles unauthorized/invalid credentials (401)
- [ ] Persists config on successful setup
- [ ] Writes config backup file

#### Setup Flow Tests — OAuth
- [ ] Returns OAuth step when OAuth available
- [ ] Shows "already connected" when credentials exist
- [ ] Offers migration from legacy to OAuth
- [ ] Handles keep/reconnect actions for already-connected
- [ ] Starts OAuth flow and returns pending step
- [ ] Completes when flow succeeds
- [ ] Errors when flow fails (user denied)
- [ ] Errors when flow expires (timeout)

#### Disconnect Tests
- [ ] Clears legacy token config
- [ ] Revokes OAuth credentials
- [ ] Publishes disconnected state
- [ ] Resets auth method

#### API Call Tests
- [ ] Uses correct auth header (token vs OAuth)
- [ ] Handles 401 by revoking credentials and disconnecting

#### Tool Tests — Per Tool
- [ ] Returns expected data on success
- [ ] Requires connection (errors when not connected)
- [ ] Validates required parameters
- [ ] Handles empty results gracefully
- [ ] Handles API errors (4xx, 5xx)
- [ ] Filters/paginates correctly

#### Tool Tests — Read Operations
- [ ] Search returns matching results with count
- [ ] Filter by type/category works
- [ ] Get by ID returns entity details
- [ ] Get by ID validates ID parameter
- [ ] List returns array with count
- [ ] Stats return aggregate numbers

#### Tool Tests — Write Operations
- [ ] Create returns success with created entity
- [ ] Create validates required fields (parent, title, etc.)
- [ ] Update/edit modifies entity
- [ ] Delete/archive marks entity correctly
- [ ] Append/add content works

#### Sync Tests
- [ ] Initial sync loads all primary entities
- [ ] Initial sync loads secondary entities for top N
- [ ] Sync marks completion in database
- [ ] Incremental sync fetches only changes
- [ ] Sync handles API errors gracefully

#### Update Handler Tests _(real-time integrations)_
- [ ] New entity event → upserts to DB
- [ ] Entity updated event → updates DB fields
- [ ] Entity deleted event → soft-deletes in DB
- [ ] Events emit with correct payload shape

---

## 15. Build & Validation

- [ ] `yarn build` compiles without errors
- [ ] `yarn typecheck` passes
- [ ] `yarn validate` passes (manifest checks, code quality)
- [ ] `yarn validate:secrets` passes (no secrets in source)
- [ ] `yarn test src/<skill>/__tests__/test-<skill>.ts` passes
- [ ] Output in `skills/<skill-name>/` contains `index.js` and `manifest.json`
- [ ] Bundled JS is a single IIFE file with no external imports

---

## 16. Final Review

### Code Quality
- [ ] No `async/await` in production code (QuickJS is synchronous; only TDLib-style clients use async)
- [ ] No dynamic imports
- [ ] All tool execute functions return JSON strings
- [ ] All SQL uses parameterized queries
- [ ] No hardcoded secrets or API keys
- [ ] Error messages are user-friendly and actionable
- [ ] Console.log used sparingly (for debug only)

### State Consistency
- [ ] State is published to frontend after every meaningful change
- [ ] Config is persisted after every modification
- [ ] Database is updated in sync with API responses
- [ ] Disconnect clears all credentials and resets state

### API Robustness
- [ ] All API calls have timeout set
- [ ] Rate limiting is detected and handled
- [ ] Auth expiry triggers credential revocation
- [ ] Network errors produce clear error messages
- [ ] Pagination loops have safety limits

### User Experience
- [ ] Setup wizard has clear labels and descriptions
- [ ] Setup validates input before making API calls
- [ ] Setup allows resuming interrupted flows
- [ ] Tools have descriptive names and descriptions for AI
- [ ] Tool responses include enough context (counts, previews, links)
- [ ] Status tool reports comprehensive health information
- [ ] Notifications sent for critical errors (`platform.notify()`)

---

_Last updated: 2026-02-11_
_Derived from: `src/telegram/` (v2.0.0) and `src/notion/` reference implementations_
