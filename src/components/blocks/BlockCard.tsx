import type { DragEventHandler, PointerEventHandler } from "react";
import type { Block } from "../../types/block";
import { parseArrayItems } from "../../types/block";

type BlockCardProps = {
  block: Block;
  compact?: boolean;
  draggable?: boolean;
  className?: string;
  /** When set, shows which library this block belongs to (e.g. "Local", remote name). */
  libraryName?: string | null;
  onDragStart?: DragEventHandler<HTMLDivElement>;
  onDragEnd?: DragEventHandler<HTMLDivElement>;
  onPointerDown?: PointerEventHandler<HTMLDivElement>;
  onDelete?: () => void;
  onEdit?: () => void;
  onExport?: () => void;
  onAddToActive?: () => void;
  onRemoveFromActive?: () => void;
  onSelectVariant?: (variantId: string) => void;
  onSetArrayItemEnabled?: (
    blockId: string,
    valueId: string,
    index: number,
    enabled: boolean,
  ) => void;
};

const METHOD_LABELS: Record<string, string> = {
  GET: "GET",
  POST: "PST",
  PUT: "PUT",
  PATCH: "PAT",
  DELETE: "DEL",
};

const BlockCard = ({
  block,
  compact = false,
  draggable = false,
  className,
  onDragStart,
  onDragEnd,
  onPointerDown,
  onDelete,
  onEdit,
  onExport,
  libraryName,
  onAddToActive,
  onRemoveFromActive,
  onSelectVariant,
  onSetArrayItemEnabled,
}: BlockCardProps) => {
  const method = block.method.toUpperCase();
  const cardClassName = [
    "block",
    compact ? "block--compact" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const activeVariant =
    block.templateVariants.find(
      (variant) => variant.id === block.activeVariantId,
    ) ?? block.templateVariants[0];
  const templateValueCount =
    block.templateVariants.length > 0
      ? (activeVariant?.values.length ?? 0)
      : block.templateValues.length;

  const visibleValues =
    block.templateVariants.length > 0
      ? (activeVariant?.values ?? [])
      : block.templateValues;
  const arrayTemplateValues = visibleValues.filter((item) => {
    if ((item.valueType ?? "string") !== "array") return false;
    return parseArrayItems(item.value).length > 0;
  });

  const stopDrag = (event: { stopPropagation: () => void }) =>
    event.stopPropagation();

  return (
    <div
      className={cardClassName}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onPointerDown={onPointerDown}
    >
      <div
        className={`block__edge block__edge--${method.toLowerCase()}`}
        aria-hidden
      />
      <div className="block__content">
        <div className="block__top">
          <span
            className={`block__method block__method--${method.toLowerCase()}`}
          >
            {METHOD_LABELS[method] ?? method.slice(0, 3)}
          </span>
          <span className="block__name">{block.name}</span>
          {libraryName ? (
            <span className="block__library-badge" title={`Library: ${libraryName}`}>
              {libraryName}
            </span>
          ) : null}
          <div className="block__actions">
            {onRemoveFromActive ? (
              <button
                className="block__action-btn block__action-btn--remove"
                type="button"
                onClick={onRemoveFromActive}
                onPointerDown={stopDrag}
                onDragStart={stopDrag}
                aria-label={`Remove ${block.name} from active`}
                title="Remove from active"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            ) : (
              <>
                {onAddToActive ? (
                  <button
                    className="block__action-btn block__action-btn--add-active"
                    type="button"
                    onClick={onAddToActive}
                    onPointerDown={stopDrag}
                    onDragStart={stopDrag}
                    aria-label={`Add ${block.name} to active`}
                    title="Add to active"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                ) : null}
                {onEdit ? (
                  <button
                    className="block__action-btn block__action-btn--edit"
                    type="button"
                    onClick={onEdit}
                    onPointerDown={stopDrag}
                    onDragStart={stopDrag}
                    aria-label={`Edit ${block.name}`}
                    title="Edit"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                  </button>
                ) : null}
                {onExport ? (
                  <button
                    className="block__action-btn block__action-btn--export"
                    type="button"
                    onClick={onExport}
                    onPointerDown={stopDrag}
                    onDragStart={stopDrag}
                    aria-label={`Export ${block.name}`}
                    title="Export"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </button>
                ) : null}
                {onDelete ? (
                  <button
                    className="block__action-btn block__action-btn--delete"
                    type="button"
                    onClick={onDelete}
                    onPointerDown={stopDrag}
                    onDragStart={stopDrag}
                    aria-label={`Delete ${block.name}`}
                    title="Delete"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>
        {compact ? (
          <>
            <span className="block__path">{block.path}</span>
            {block.templateVariants.length > 0 ? (
              <div className="block__variant block__variant--compact">
                <span className="block__variant-label">variant</span>
                {onSelectVariant ? (
                  <select
                    className="block__variant-select"
                    value={activeVariant?.id ?? ""}
                    onChange={(event) => onSelectVariant(event.target.value)}
                    onPointerDown={stopDrag}
                  >
                    {block.templateVariants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.name || "Untitled"}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="block__variant-name">
                    {activeVariant?.name || "Untitled"}
                  </span>
                )}
              </div>
            ) : null}
            {compact &&
            onSetArrayItemEnabled &&
            arrayTemplateValues.length > 0 ? (
              <div
                className="block__array-section"
                onPointerDown={stopDrag}
                onDragStart={stopDrag}
              >
                {arrayTemplateValues.map((item) => {
                  const items = parseArrayItems(item.value);
                  return (
                    <div key={item.id} className="block__array-row">
                      <span className="block__array-key">{item.key}</span>
                      <div className="block__array-chips">
                        {items.map((entry, idx) => (
                          <label
                            key={idx}
                            className={`block__array-chip${entry.e === false ? " block__array-chip--disabled" : ""}`}
                          >
                            <input
                              type="checkbox"
                              className="block__array-toggle"
                              checked={entry.e !== false}
                              onChange={(e) =>
                                onSetArrayItemEnabled(
                                  block.id,
                                  item.id,
                                  idx,
                                  e.target.checked,
                                )
                              }
                              aria-label={`Include ${item.key} item in response`}
                            />
                            <span className="block__array-chip-value">
                              {entry.v || "—"}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="block__desc">{block.description}</div>
            {block.templateVariants.length > 0 ? (
              <div className="block__variant">
                <span className="block__variant-label">variant</span>
                {onSelectVariant ? (
                  <select
                    className="block__variant-select"
                    value={activeVariant?.id ?? ""}
                    onChange={(event) => onSelectVariant(event.target.value)}
                    onPointerDown={stopDrag}
                  >
                    {block.templateVariants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.name || "Untitled"}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="block__variant-name">
                    {activeVariant?.name || "Untitled"}
                  </span>
                )}
              </div>
            ) : null}
            {block.responseTemplate || templateValueCount > 0 ? (
              <div className="block__template">
                Template{" "}
                {templateValueCount > 0 ? `(${templateValueCount} values)` : ""}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

export default BlockCard;
