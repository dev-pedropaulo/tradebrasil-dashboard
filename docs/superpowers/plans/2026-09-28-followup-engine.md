# Follow-up Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a secure, operator-controlled follow-up module to the Trade Brasil dashboard and prepare the corresponding n8n execution workflow.

**Architecture:** Keep `Leads` as the master table and store plans, templates, and immutable delivery events in related NocoDB tables. The React client calls server-side Vercel functions; only those functions may use the NocoDB token. A dedicated n8n workflow will execute due sends and process Evolution replies once the supplied Evolution instance configuration is available.

**Tech Stack:** React 18, Vite 5, Vercel serverless functions, NocoDB REST API, Vitest, n8n, Evolution API.

**Spec:** `docs/superpowers/specs/2026-09-28-followup-engine-design.md`

## Global Constraints

- Preserve `Leads` as the master table.
- Permit only one active follow-up plan per lead.
- Use `America/Sao_Paulo` for all schedule calculations and display.
- Recurrence has no maximum send count.
- Messages are static text; no template variables are supported.
- A one-off message never changes the recurring anchor or next recurring date.
- Plans cancel only manually or on valid lead reply when that policy is enabled.
- Failures are visible and audit logged, but do not cancel a plan or stop future recurrence.
- Never expose NocoDB credentials through `VITE_*` variables or client bundles.
- Do not modify the hedge simulator.
- Do not activate Evolution sending before a real instance name and server-side credential are configured.

## Review Focus

- A lead with a cancelled plan must never have a due event sent after cancellation.
- A one-off event close to a recurrence must surface a warning without changing recurrence dates.
- A failed send must produce one failed event and leave the following recurrence available.
- A reply sent by the company, a delivery receipt, or group traffic must not cancel a plan.
- Client bundles and `.env.example` must contain no live NocoDB token.

---

### Task 1: Test foundation and follow-up domain utilities

**Files:**
- Create: `src/lib/followupDomain.js`
- Create: `src/lib/followupDomain.test.js`
- Modify: `package.json`
- Modify: `.env.example`

**Interfaces:**
- Produces: `assertPlanInput(input)`, `computeNextRecurringAt(anchorIso, recurrenceDays, afterIso)`, `hasScheduleCollision(oneOffIso, recurringIso, thresholdHours = 48)`, `normalizePhone(value)`.
- Consumes: plain JSON from API handlers and UI form state.

- [ ] **Step 1: Add Vitest and the test script**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Install `vitest` as a dev dependency. Replace all real values in `.env.example` with variable names and explanatory placeholder values only.

- [ ] **Step 2: Write failing tests**

```js
import { describe, expect, it } from 'vitest';
import {
  assertPlanInput,
  computeNextRecurringAt,
  hasScheduleCollision,
  normalizePhone,
} from './followupDomain';

describe('follow-up domain', () => {
  it('requires a future first send and a positive cadence', () => {
    expect(() => assertPlanInput({
      leadId: 7,
      templateId: 2,
      firstSendAt: '2026-09-27T09:00:00-03:00',
      recurrenceDays: 0,
    }, new Date('2026-09-28T12:00:00Z'))).toThrow();
  });

  it('keeps recurring dates anchored after a one-off event', () => {
    expect(computeNextRecurringAt(
      '2026-10-01T09:00:00-03:00',
      30,
      '2026-10-21T09:00:00-03:00',
    )).toBe('2026-10-31T09:00:00-03:00');
  });

  it('warns when a one-off event is within 48 hours of recurrence', () => {
    expect(hasScheduleCollision(
      '2026-10-30T09:00:00-03:00',
      '2026-10-31T09:00:00-03:00',
    )).toBe(true);
  });

  it('normalizes Brazilian phone digits', () => {
    expect(normalizePhone('+55 (43) 99999-0000')).toBe('5543999990000');
  });
});
```

- [ ] **Step 3: Run the test to verify failure**

Run: `npm test -- src/lib/followupDomain.test.js`  
Expected: FAIL because `followupDomain.js` does not exist.

- [ ] **Step 4: Implement only the tested domain functions**

Use `Intl.DateTimeFormat` with `America/Sao_Paulo` or offset-preserving ISO comparison. Reject blank text, invalid phone, non-positive whole-day cadence, missing lead/template IDs and non-future dates.

- [ ] **Step 5: Run the test to verify success**

Run: `npm test -- src/lib/followupDomain.test.js`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .env.example src/lib/followupDomain.js src/lib/followupDomain.test.js
git commit -m "test: add follow-up domain rules"
```

### Task 2: Private NocoDB access and server API

**Files:**
- Create: `api/lib/nocodb.js`
- Create: `api/followups/templates.js`
- Create: `api/followups/plans.js`
- Create: `api/followups/events.js`
- Create: `api/followups/cancel.js`
- Create: `api/lib/nocodb.test.js`
- Modify: `vercel.json`

**Interfaces:**
- Consumes: `NOCODB_BASE_URL`, `NOCODB_API_TOKEN`, `NOCODB_LEADS_TABLE_ID`, `NOCODB_FOLLOWUP_TEMPLATES_TABLE_ID`, `NOCODB_FOLLOWUP_SCHEDULES_TABLE_ID`, `NOCODB_FOLLOWUP_EVENTS_TABLE_ID`.
- Produces: server-only `listRecords`, `createRecord`, `updateRecord`, `createPlan`, `createOneOffEvent`, `cancelPlan`.

- [ ] **Step 1: Write failing tests for private request construction**

```js
import { expect, it, vi } from 'vitest';
import { createNocoClient } from './nocodb';

it('sends the private NocoDB token only as a server request header', async () => {
  const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ list: [] }) });
  const client = createNocoClient({
    baseUrl: 'https://nocodb.example',
    token: 'server-secret',
    fetchImpl,
  });

  await client.listRecords('table-id');
  expect(fetchImpl.mock.calls[0][1].headers['xc-token']).toBe('server-secret');
});
```

- [ ] **Step 2: Run the test to verify failure**

Run: `npm test -- api/lib/nocodb.test.js`  
Expected: FAIL because `createNocoClient` does not exist.

- [ ] **Step 3: Implement the NocoDB client and API handlers**

- Reject requests that lack the required fields with HTTP 400.
- Return normalized errors as `{ error: { code, message } }`.
- In `plans.js`, reject a new plan if an active plan already links to that lead.
- In `events.js`, write a one-off event as `agendado`, return `collisionWarning` when its date is within 48 hours of `proximo_envio_recorrente_em`, and never mutate that recurring date.
- In `cancel.js`, change the plan status, cancel all pending events and update the lead projection in a controlled sequence.
- Remove the public `/api/nocodb` reverse proxy. Keep `/api/followups/*` available to serverless functions and send the SPA fallback only for non-API paths.

- [ ] **Step 4: Run the API tests**

Run: `npm test -- api/lib/nocodb.test.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api vercel.json
git commit -m "feat: add private follow-up API"
```

### Task 3: Follow-up workspace in the dashboard

**Files:**
- Create: `src/components/FollowupsPage.jsx`
- Create: `src/components/FollowupPlanForm.jsx`
- Create: `src/components/FollowupEventForm.jsx`
- Create: `src/components/FollowupTemplatesPanel.jsx`
- Create: `src/services/followupsApi.js`
- Create: `src/components/FollowupsPage.test.jsx`
- Modify: `src/App.jsx`
- Modify: `src/index.css`
- Modify: `src/services/nocodb.js`

**Interfaces:**
- Consumes: REST endpoints from Task 2 and `lead.Id`, `lead.nome`, `lead.telefone`.
- Produces: Follow-ups tab with plan creation, one-off scheduling, template management, cancellation, failure list and event history.

- [ ] **Step 1: Write failing UI tests**

```jsx
it('blocks plan creation without a valid lead phone', async () => {
  render(<FollowupsPage leads={[{ Id: 1, nome: 'Sem telefone', telefone: '' }]} />);
  await userEvent.click(screen.getByRole('button', { name: /criar follow-up/i }));
  expect(screen.getByText(/telefone válido/i)).toBeInTheDocument();
});

it('shows a collision warning for a nearby one-off send', async () => {
  mockApi.createOneOffEvent.mockResolvedValue({ collisionWarning: true });
  render(<FollowupsPage leads={[validLead]} />);
  await userEvent.click(screen.getByRole('button', { name: /agendar mensagem/i }));
  expect(await screen.findByText(/próximo envio recorrente/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the UI tests to verify failure**

Run: `npm test -- src/components/FollowupsPage.test.jsx`  
Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the workspace**

- Add a **Follow-ups** navigation tab in `App.jsx`.
- List plans and the next scheduled send, plus a dedicated visible list of `falhou` events.
- Allow only leads with normalized, valid phone values in the plan form.
- Provide template create, edit, deactivate and selection controls; template text remains static.
- Provide manual cancellation with a confirmation action.
- Show the one-off collision warning returned by the API.
- Remove client-side NocoDB fetching and token state from `App.jsx`; client lead reads must use a private server route.

- [ ] **Step 4: Run tests and production build**

Run: `npm test && npm run build`  
Expected: PASS and a Vite production bundle with no NocoDB token.

- [ ] **Step 5: Commit**

```bash
git add src package.json package-lock.json
git commit -m "feat: add follow-up dashboard workspace"
```

### Task 4: NocoDB schema bootstrap and operator documentation

**Files:**
- Create: `scripts/setup-followup-schema.mjs`
- Create: `docs/followup-operations.md`
- Create: `scripts/setup-followup-schema.test.mjs`

**Interfaces:**
- Consumes: `NOCODB_BASE_URL`, `NOCODB_API_TOKEN`, existing leads table ID and target project ID.
- Produces: columns in `Leads` plus the three tables specified in the design, without modifying existing lead records.

- [ ] **Step 1: Write a dry-run schema test**

```js
import assert from 'node:assert/strict';
import { buildSchemaPlan } from './setup-followup-schema.mjs';

const plan = buildSchemaPlan({ leadsTableId: 'leads' });
assert.equal(plan.leadColumns.length, 4);
assert.deepEqual(plan.tables.map((table) => table.title), [
  'Follow-up Templates',
  'Follow-up Schedule',
  'Follow-up Events',
]);
```

- [ ] **Step 2: Run the dry-run test to verify failure**

Run: `node scripts/setup-followup-schema.test.mjs`  
Expected: FAIL because `buildSchemaPlan` does not exist.

- [ ] **Step 3: Implement idempotent schema creation**

- Fetch project table metadata before each create operation.
- Create only missing tables and columns.
- Create all required single-select choices.
- Create the lead links after the referenced tables exist.
- Provide `--dry-run` and `--apply`; `--apply` requires explicit environment variables and prints each mutation.
- Write operator instructions for template creation, plan configuration, cancellation policy, one-off collision warnings and failed-event handling.

- [ ] **Step 4: Run dry-run and build**

Run: `node scripts/setup-followup-schema.mjs --dry-run && npm run build`  
Expected: schema plan prints without mutations and build succeeds.

- [ ] **Step 5: Commit**

```bash
git add scripts docs/followup-operations.md
git commit -m "feat: add NocoDB follow-up schema bootstrap"
```

### Task 5: Dedicated n8n workflow

**Files:**
- Create: `docs/n8n-followup-workflow.md`
- Modify: `docs/followup-operations.md`

**Interfaces:**
- Consumes: NocoDB table IDs, NocoDB server credential, Evolution API credential and Evolution instance name.
- Produces: one disabled-by-default n8n workflow for due delivery and one webhook path for inbound-message cancellation.

- [ ] **Step 1: Discover the installed n8n NocoDB, HTTP Request, Schedule Trigger and Webhook node definitions**

Call the n8n MCP SDK reference, relevant scheduling/webhook best practices, node search and exact type definitions before creating any workflow code.

- [ ] **Step 2: Validate a disabled workflow design**

The schedule path must query due recurring plans and pending one-off events, claim an item, revalidate its active state, send, then write success/failure events. The webhook path must exclude `fromMe`, groups, delivery/read updates and invalid phone identifiers before applying response cancellation policy.

- [ ] **Step 3: Create the workflow only after configured credentials are available**

Use the supplied Evolution instance credential and NocoDB credential. Keep the workflow disabled until a test lead is supplied. Do not invent an Evolution instance name, API URL or credential.

- [ ] **Step 4: Run an end-to-end test**

With a test lead, verify one send, failed-send recording, one-off collision warning, manual cancellation and reply-driven cancellation.

- [ ] **Step 5: Commit documentation update**

```bash
git add docs/n8n-followup-workflow.md docs/followup-operations.md
git commit -m "docs: add follow-up n8n runbook"
```

## Self-review

- **Spec coverage:** Tasks 1–4 implement every dashboard, data, error, schedule, security and audit requirement. Task 5 covers the n8n execution and reply webhook, gated only by credentials the user explicitly deferred.
- **Placeholder scan:** No task defers implementation by vague instruction; the only gated action is real Evolution activation, which requires values not yet supplied.
- **Type consistency:** Task 1 domain functions feed Task 2 API validation and Task 3 forms. Task 2 endpoint payloads drive Task 3. Task 4 provisions the exact tables named by Task 2. Task 5 consumes the same table model.
- **Review focus coverage:** Cancellation is tested in Task 2; collision and failure display in Task 3; reply filtering in Task 5; client credential exclusion in Tasks 2 and 3.
