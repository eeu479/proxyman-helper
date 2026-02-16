import type { DragEventHandler, PointerEventHandler } from "react";
import type { Block } from "../../types/block";
import BlockCard from "./BlockCard";

type ActivePanelProps = {
  blocks: Block[];
  onDragOver: DragEventHandler<HTMLDivElement>;
  onDragEnter: DragEventHandler<HTMLDivElement>;
  onDropActive: DragEventHandler<HTMLDivElement>;
  onDropLibrary: DragEventHandler<HTMLDivElement>;
  onDragStart: (blockId: string) => DragEventHandler<HTMLDivElement>;
  onDragEnd: () => void;
  onPointerDown: (blockId: string) => PointerEventHandler<HTMLDivElement>;
  onRemoveFromActive: (blockId: string) => void;
  onClearActive: () => void;
  onSelectVariant: (blockId: string, variantId: string) => void;
};

const ActivePanel = ({
  blocks,
  onDragOver,
  onDragEnter,
  onDropActive,
  onDropLibrary,
  onDragStart,
  onDragEnd,
  onPointerDown,
  onRemoveFromActive,
  onClearActive,
  onSelectVariant,
}: ActivePanelProps) => {
  return (
    <section className="panel panel--active">
      <header className="panel__header">
        <div>
          <h2>Active Blocks</h2>
          <span className="panel__hint">Drop here to build the flow.</span>
        </div>
        {blocks.length > 0 ? (
          <div className="panel__header-actions">
            <button
              type="button"
              className="panel__action panel__action--danger"
              onClick={onClearActive}
              aria-label="Clear all active blocks"
            >
              Clear
            </button>
          </div>
        ) : null}
      </header>
      <div
        className="panel__body"
        data-drop-zone="active"
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDrop={onDropActive}
      >
        {blocks.length === 0 ? (
          <div className="panel__empty">Drag blocks here.</div>
        ) : (
          <div className="panel__block-grid">
            {blocks.map((block) => (
              <BlockCard
                key={block.id}
                block={block}
                compact
                className="block--active"
                draggable
                onDragStart={onDragStart(block.id)}
                onDragEnd={onDragEnd}
                onPointerDown={onPointerDown(block.id)}
                onRemoveFromActive={() => onRemoveFromActive(block.id)}
                onSelectVariant={(variantId) =>
                  onSelectVariant(block.id, variantId)
                }
              />
            ))}
          </div>
        )}
      </div>
      <div
        className="panel__footer"
        data-drop-zone="library"
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDrop={onDropLibrary}
      >
        Drag here to remove from active.
      </div>
    </section>
  );
};

export default ActivePanel;
