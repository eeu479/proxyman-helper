1. Request Identity Strip

Problem

Name, Method, and Path feel visually disconnected and lack context.

Recommendation

Combine into a single horizontal strip at the top.

Fields
	•	Name (wide input)
	•	Method (compact pill/dropdown)
	•	Path (wide input with validation)
	•	Optional: Folder/Tag

Enhancement

Add a live preview line below:

GET /api/session → 200 (application/json)


⸻

2. Two-Column Layout

Problem

The form grows vertically and becomes hard to scan.

Recommendation

Split modal into two columns.

Left Column — Request
	•	Name
	•	Method
	•	Path
	•	Description (collapsed by default)
	•	Match Conditions / Headers

Right Column — Response
	•	Response Template editor
	•	Template Values editor
	•	Response Scenarios (Variants)

⸻

3. Replace Tabs with Segmented Control

Problem

“Response / Headers” tabs don’t match the actual mental model.

Recommendation

Use segmented control:
	•	Request
	•	Response
	•	Variables

Or keep two columns and use section tabs within the right column.

⸻

4. Response Template Editor Improvements

Problem

Template editor looks like a plain textarea despite being structured data.

Recommendation

Add
	•	Monospace font
	•	Syntax highlighting
	•	JSON formatting button
	•	Token insertion helper
	•	Inline validation

Validation States
	•	✅ Valid JSON
	•	⚠️ Invalid JSON (line indicator)
	•	⚠️ Undefined template tokens

UX

Move example text to a hint below instead of inside editor.

⸻

5. Template Values — Typed Editor

Goal

Support strings and arrays with clear editing affordances.

Recommendation

Table-style editor.

Row Structure

Field	Control
Key	Text input
Type	Dropdown: String / Array
Value	Dynamic control
Actions	Duplicate / Delete

Value Controls
	•	String → single input
	•	Array → chips input (Enter to add)

Behavior Rules
	•	Keys must be unique
	•	Switching types:
	•	String → Array wraps value
	•	Array → String takes first value (warn if multiple)

⸻

Power User Mode

Toggle: “Edit as JSON”

Allows editing as:

{
  "userId": "123",
  "roles": ["admin", "editor"]
}

Validation
	•	Parse on save
	•	Show inline errors
	•	Preserve last valid state

⸻

6. Response Scenarios (Variants)

Problem

“Template Variants” is vague and feels optional without purpose.

Recommendation

Rename to:

Response Scenarios

Each Scenario Contains
	•	Name (e.g. Success, Validation Error)
	•	Condition
	•	Template override OR value overrides

Suggested Conditions
	•	Percent rollout
	•	Header equals
	•	Query param exists
	•	Sequential

Collapse section by default.

⸻

7. Headers Clarification

Problem

Unclear whether headers are request matchers or response headers.

Recommendation

Split into two sections.

Match Conditions
	•	Required headers
	•	Query parameters

Response Headers
	•	Content-Type
	•	Cache-Control
	•	Custom headers

⸻

8. Action Bar Improvements

Current

Cancel / Save Block

Recommended
	•	Primary: Save
	•	Secondary: Save & Add Another
	•	Optional: Test Endpoint

Add Summary Above Buttons

Creates endpoint: GET /api/session


⸻

9. Small UX Enhancements
	•	Show detected path params as chips
	•	Add Required indicators for key fields
	•	Collapse Description by default
	•	Tighten spacing between sections
	•	Inline validation for path conflicts
	•	Keyboard shortcuts (Cmd+Enter = Save)

