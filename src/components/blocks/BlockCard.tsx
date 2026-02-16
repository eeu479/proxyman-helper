import type { DragEventHandler, PointerEventHandler } from "react";
import type { Block } from "../../types/block";

type BlockCardProps = {
  block: Block;
  draggable?: boolean;
  className?: string;
  onDragStart?: DragEventHandler<HTMLDivElement>;
  onDragEnd?: DragEventHandler<HTMLDivElement>;
  onPointerDown?: PointerEventHandler<HTMLDivElement>;
  onDelete?: () => void;
  onEdit?: () => void;
  onSelectVariant?: (variantId: string) => void;
};

const BlockCard = ({
  block,
  draggable = false,
  className,
  onDragStart,
  onDragEnd,
  onPointerDown,
  onDelete,
  onEdit,
  onSelectVariant,
}: BlockCardProps) => {
  const cardClassName = className ? `block ${className}` : "block";
  const activeVariant =
    block.templateVariants.find((variant) => variant.id === block.activeVariantId) ??
    block.templateVariants[0];
  const templateValueCount =
    block.templateVariants.length > 0
      ? activeVariant?.values.length ?? 0
      : block.templateValues.length;

  return (
    <div
      className={cardClassName}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onPointerDown={onPointerDown}
    >
      <div className="block__meta">
        <div className="block__meta-left">
          <span className={`block__method block__method--${block.method.toLowerCase()}`}>
            {block.method}
          </span>
          <span className="block__name">{block.name}</span>
        </div>
        <div className="block__actions">
          {onEdit ? (
            <button
              className="block__edit"
              type="button"
              onClick={onEdit}
              onPointerDown={(event) => event.stopPropagation()}
              onDragStart={(event) => event.stopPropagation()}
              aria-label={`Edit ${block.name}`}
            >
              Edit
            </button>
          ) : null}
          {onDelete ? (
            <button
              className="block__delete"
              type="button"
              onClick={onDelete}
              onPointerDown={(event) => event.stopPropagation()}
              onDragStart={(event) => event.stopPropagation()}
              aria-label={`Delete ${block.name}`}
            >
              Delete
            </button>
          ) : null}
        </div>
      </div>
      <div className="block__desc">{block.description}</div>
      {block.templateVariants.length > 0 ? (
        <div className="block__variant">
          <span className="block__variant-label">Variant</span>
          {onSelectVariant ? (
            <select
              className="block__variant-select"
              value={activeVariant?.id ?? ""}
              onChange={(event) => onSelectVariant(event.target.value)}
              onPointerDown={(event) => event.stopPropagation()}
            >
              {block.templateVariants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.name || "Untitled Variant"}
                </option>
              ))}
            </select>
          ) : (
            <span className="block__variant-name">
              {activeVariant?.name || "Untitled Variant"}
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
    </div>
  );
};

export default BlockCard;
