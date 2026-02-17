# Template Values Row — Design Note

Redesign of the Template Values section in the Block Builder modal for clarity, alignment, and scalability.

## 1. Layout Structure

- **Single table** with a clear header row and data rows.
- **Columns (left to right):**
  - **Key** — Fixed width (140px). Variable name used in `{{key}}` syntax.
  - **Value** — Flex (2fr). Single input for string type; chip/tag list for array type.
  - **Type** — Fixed (72px). Segmented control: Str | [ ].
  - **Actions** — Fixed (56px). Duplicate (⊕) and Remove (✕) icon buttons.
- Each **row is one cohesive unit**: same background, padding, and separator so it reads as one editable record.
- Table has a **bordered container** (rounded, subtle background) so the block is visually grouped.

## 2. Spacing and Alignment

- **Table:** 1px border, 10px radius, no gap between cells (cells touch for a real table feel).
- **Header row:** 10px vertical padding, 12–14px horizontal; uppercase 11px labels; muted background.
- **Data cells:** 8px vertical, 10–14px horizontal; inputs use 8px/10px padding and 36px min height.
- **Column gutters:** Header and cells align; Type column has a bit more left padding so the control doesn’t sit on the value edge.
- **Row separation:** 1px bottom border on each row; last row has no bottom border.
- **Actions:** Right-aligned in the cell with a small gap (2px) between duplicate and delete.

## 3. Interaction Behavior

- **Enter** (in Key or Value): Adds a new row and keeps focus in the current field. User can Tab or click to the new row.
- **Backspace** (in Key when empty): Removes the current row when there is more than one row.
- **Tab:** Default — moves Key → Value → Type → Duplicate → Remove → next row Key.
- **Type change:** Str ↔ Array keeps the current value when possible (backend/state already supports this).
- **Duplicate:** Copies key and value to a new row.
- **Remove:** Deletes the row; no confirmation (danger styling on hover only).

## 4. Visual Hierarchy

- **Header:** Muted background, uppercase, smaller font — reads as “labels,” not data.
- **Rows:** Same background as modal content so the table feels like one surface; row borders provide separation.
- **Key → Value → Type:** Left-to-right reading order; Key and Value get more space; Type is compact and clearly separated so it doesn’t overlap the value.
- **Actions:** Same row, right side; secondary (muted) until hover — duplicate gets neutral hover, delete gets danger (red) hover.

## 5. Value Editor by Type

- **String:** One full-width input in the Value cell, same height as other row inputs.
- **Array:** Chip/tag style in the Value cell:
  - Each item is a **chip**: rounded pill, soft background, inline input + × to remove.
  - “+ Add” adds a new chip slot.
  - Chips wrap; cell grows with content so multiple rows don’t feel cramped.

## 6. Optional: Many Rows

- Current layout scales to many rows: fixed column widths and row borders keep alignment.
- If the list gets very long (e.g. 15+ rows), consider:
  - **Max height + scroll** on the table body (e.g. `max-height: 280px; overflow-y: auto`) so the modal doesn’t grow unbounded.
  - Header can stay sticky so “Key | Value | Type | Actions” stays visible while scrolling.

## 7. Usability Improvements vs Previous Design

- **No overlap:** Type is in its own column with fixed width so it never overlaps the value.
- **Clear grouping:** Table container + row borders make each row one unit.
- **Consistent alignment:** Grid columns and cell padding keep Key, Value, Type, and actions aligned across rows.
- **Keyboard flow:** Enter to add row, Backspace in empty key to remove row.
- **Array UX:** Chips make array values scannable and editable without a big nested block.
- **Actions:** Dedicated action column with hover states; delete has danger hover only (no confirmation).
- **Focus:** Row inputs use visible focus ring (accent) for accessibility.
- **Empty state:** Unchanged: “Define variables used in your response template.”
