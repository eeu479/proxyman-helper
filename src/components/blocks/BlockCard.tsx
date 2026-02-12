import type { DragEventHandler, PointerEventHandler } from "react";
import type { Block } from "../../types/block";

type BlockCardProps = {
  block: Block;
  draggable?: boolean;
  className?: string;
  onDragStart?: DragEventHandler<HTMLDivElement>;
  onDragEnd?: DragEventHandler<HTMLDivElement>;
  onPointerDown?: PointerEventHandler<HTMLDivElement>;
};

const BlockCard = ({
  block,
  draggable = false,
  className,
  onDragStart,
  onDragEnd,
  onPointerDown,
}: BlockCardProps) => {
  const cardClassName = className ? `block ${className}` : "block";

  return (
    <div
      className={cardClassName}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onPointerDown={onPointerDown}
    >
      <div className="block__meta">
        <span className={`block__method block__method--${block.method.toLowerCase()}`}>
          {block.method}
        </span>
        <span className="block__name">{block.name}</span>
      </div>
      <div className="block__desc">{block.description}</div>
      {block.responseTemplate || block.templateValues.length > 0 ? (
        <div className="block__template">
          Template{" "}
          {block.templateValues.length > 0
            ? `(${block.templateValues.length} values)`
            : ""}
        </div>
      ) : null}
    </div>
  );
};

export default BlockCard;
