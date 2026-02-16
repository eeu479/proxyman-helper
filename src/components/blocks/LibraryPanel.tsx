import type { DragEventHandler, PointerEventHandler } from "react";
import type { Block } from "../../types/block";
import BlockCard from "./BlockCard";

type LibraryPanelProps = {
  blocks: Block[];
  onCreateBlock: () => void;
  onDragOver: DragEventHandler<HTMLDivElement>;
  onDragEnter: DragEventHandler<HTMLDivElement>;
  onDrop: DragEventHandler<HTMLDivElement>;
  onDragStart: (blockId: string) => DragEventHandler<HTMLDivElement>;
  onDragEnd: () => void;
  onPointerDown: (blockId: string) => PointerEventHandler<HTMLDivElement>;
  onDeleteBlock: (blockId: string) => void;
  onEditBlock: (blockId: string) => void;
  onSelectVariant: (blockId: string, variantId: string) => void;
};

const LibraryPanel = ({
  blocks,
  onCreateBlock,
  onDragOver,
  onDragEnter,
  onDrop,
  onDragStart,
  onDragEnd,
  onPointerDown,
  onDeleteBlock,
  onEditBlock,
  onSelectVariant,
}: LibraryPanelProps) => {
  return (
    <section className="panel">
      <header className="panel__header">
        <div>
          <h2>Library</h2>
          <span className="panel__hint">Drag a block to activate it.</span>
        </div>
        <button className="panel__action" type="button" onClick={onCreateBlock}>
          New Block
        </button>
      </header>
      <div
        className="panel__body"
        data-drop-zone="library"
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDrop={onDrop}
      >
        {blocks.length === 0 ? (
          <div className="panel__empty">All blocks active.</div>
        ) : (
          blocks.map((block) => (
            <BlockCard
              key={block.id}
              block={block}
              draggable
              onDragStart={onDragStart(block.id)}
              onDragEnd={onDragEnd}
              onPointerDown={onPointerDown(block.id)}
              onDelete={() => onDeleteBlock(block.id)}
              onEdit={() => onEditBlock(block.id)}
              onSelectVariant={(variantId) => onSelectVariant(block.id, variantId)}
            />
          ))
        )}
      </div>
    </section>
  );
};

export default LibraryPanel;
