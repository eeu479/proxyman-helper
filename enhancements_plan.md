

Block Builder UI — Refinement Improvements (v2)

Overview

The current design is strong and close to production quality. The layout is clear, the two-column approach works well, and validation feedback is visible.

This document outlines refinements to improve clarity, reduce friction, and elevate the UX from “good” to “excellent”.

⸻

1. Request Section Improvements

1.1 Method + Path Alignment

Current

Method sits slightly detached from Path.

Change

Treat Method + Path as a single control group.

[ GET ▼ ]  /api/session

Benefits
	•	Stronger mental model
	•	Faster scanning
	•	Feels like a single endpoint identity

⸻

1.2 Endpoint Preview Styling

Current

Preview looks like a disabled input.

Change

Make it a subtle info row with icon.

🌐 Creates endpoint: GET /api/session

Benefits
	•	Less visual confusion
	•	Feels informative instead of editable

⸻

1.3 Description UX

Current

Collapsed disclosure is good.

Improvement

Add helper text:

“Optional notes about this endpoint”

⸻

2. Response Template Editor

2.1 JSON Validation Messaging

Current

“Invalid JSON” is correct but abrupt.

Improve

Add line-specific feedback:

❌ Invalid JSON — Unexpected token at line 2

Also Add

Green success state:

✅ Valid JSON


⸻

2.2 Template Token Helper

Add small helper text under editor:

Use {{variable}} to inject template values

Make tokens clickable → inserts into editor.

⸻

2.3 Editor Toolbar

Add minimal toolbar:
	•	Format JSON
	•	Copy
	•	Expand fullscreen

⸻

3. Response Scenarios Section

Current

Good placement but lacks clarity on purpose.

Improvements

Rename button

“Add Scenario” → “Add Response Scenario”

Empty state text

“No scenarios yet”

→ change to:

“Add scenarios to simulate different responses (errors, delays, variants)”

⸻

4. Template Values — Major UX Upgrade

This is the most important improvement area.

4.1 Replace Empty State

Current

“No template values yet.”

Change

Add explanatory text:

“Define variables used in your response template”

⸻

4.2 Add Typed Row Editor

Each value should include:
	•	Key
	•	Type selector
	•	Value editor
	•	Delete action

Types
	•	String
	•	Array

⸻

4.3 Value Editing Behavior

String

Single input field

Array

Chip input:

admin   editor   viewer  [+]

Supports:
	•	Enter to add
	•	Paste comma-separated
	•	Backspace remove

⸻

4.4 JSON Mode Toggle

Add toggle:

“Edit as JSON”

Opens modal or inline editor.

Validates on save and converts to rows.

⸻

5. Response Headers

5.1 Improve Empty State

Change:

“No headers yet.”

→

“Add headers returned with this response (Content-Type, Cache-Control)”

⸻

5.2 Add Quick Presets

Optional quick buttons:
	•		•	JSON Content-Type
	•		•	CORS headers

⸻

6. Visual Hierarchy Improvements

6.1 Section Headers

Make slightly smaller and lighter weight to reduce visual noise.

⸻

6.2 Increase Vertical Rhythm

Add slightly more spacing between major sections:
	•	Template Editor
	•	Scenarios
	•	Values
	•	Headers

⸻

6.3 Divider Lines

Subtle divider between:

Editor → Scenarios

⸻

7. Action Bar Improvements

Current

Cancel + Save Block

Improvements

Add Secondary Action

Save & Create Another

Add Loading State

Saving…

Add Keyboard Shortcut

Cmd + Enter → Save

⸻

8. Add Inline Help Icons

Small tooltip icons for:
	•	Response Template
	•	Template Values
	•	Scenarios

Helps new users learn faster.

⸻

9. Path Intelligence (High Value)

Detect variables in path:

/api/users/{{userId}}

Auto-suggest adding template value.

⸻

10. Token Validation

If template uses undefined variable:

⚠ Undefined variable: {{userId}}


⸻

11. Microcopy Improvements

Replace

Save Block → Save Endpoint

⸻

Replace

Block Builder → Endpoint Builder

(optional but clearer terminology)

⸻

12. Accessibility Improvements
	•	Ensure contrast on secondary text
	•	Larger click targets on buttons
	•	Focus states on inputs
	•	Keyboard navigation between sections

⸻

13. Nice-to-Have Enhancements

Response Preview Panel

Optional small preview:

Preview response →
{
  "test": "value"
}

