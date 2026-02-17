import type { Library } from "../../api/libraries";
import type { ChangeEvent, DragEvent as ReactDragEvent, DragEventHandler, PointerEventHandler } from "react";
import { useMemo, useRef, useState } from "react";
import type { Block } from "../../types/block";
import BlockCard from "./BlockCard";

const UNCATEGORIZED = "Uncategorized";

const METHOD_ORDER = ["GET", "POST", "PUT", "PATCH", "DELETE"];

function methodSortIndex(method: string): number {
  const i = METHOD_ORDER.indexOf(method.toUpperCase());
  return i === -1 ? METHOD_ORDER.length : i;
}

function sortBlocks(blocks: Block[]): Block[] {
  return [...blocks].sort((a, b) => {
    const methodA = methodSortIndex(a.method);
    const methodB = methodSortIndex(b.method);
    if (methodA !== methodB) return methodA - methodB;
    return (a.name || "").localeCompare(b.name || "", undefined, {
      sensitivity: "base",
    });
  });
}

function groupBlocksByCategory(
  blocks: Block[],
  storedCategories: string[],
): { category: string; blocks: Block[] }[] {
  const byCategory = new Map<string, Block[]>();

  // Seed with stored categories so empty ones appear
  for (const cat of storedCategories) {
    if (!byCategory.has(cat)) {
      byCategory.set(cat, []);
    }
  }

  for (const block of blocks) {
    const cat = (block.category ?? "").trim() || UNCATEGORIZED;
    if (!byCategory.has(cat)) {
      byCategory.set(cat, []);
    }
    byCategory.get(cat)!.push(block);
  }

  const categories = Array.from(byCategory.keys()).sort((a, b) => {
    if (a === UNCATEGORIZED) return -1;
    if (b === UNCATEGORIZED) return 1;
    return a.localeCompare(b);
  });

  return categories.map((category) => ({
    category,
    blocks: sortBlocks(byCategory.get(category)!),
  }));
}

type LibraryPanelProps = {
  blocks: Block[];
  categories: string[];
  libraries?: Library[];
  onCreateBlock: () => void;
  onImportBlocks?: (file: File) => Promise<void>;
  importBlocksMessage?: string | null;
  onDragOver: DragEventHandler<HTMLDivElement>;
  onDragEnter: DragEventHandler<HTMLDivElement>;
  onDrop: DragEventHandler<HTMLDivElement>;
  onDragStart: (blockId: string) => DragEventHandler<HTMLDivElement>;
  onDragEnd: () => void;
  onPointerDown: (blockId: string) => PointerEventHandler<HTMLDivElement>;
  onDeleteBlock: (blockId: string) => void;
  onEditBlock: (blockId: string) => void;
  onExportBlock?: (block: Block) => void;
  onSelectVariant: (blockId: string, variantId: string) => void;
  onSetBlockArrayItemEnabled?: (
    blockId: string,
    valueId: string,
    index: number,
    enabled: boolean,
  ) => void;
  onAddCategory: (name: string) => void;
  onRenameCategory: (oldName: string, newName: string) => void;
  onDeleteCategory: (name: string) => void;
  onMoveBlockToCategory: (blockId: string, category: string) => void;
};

const LibraryPanel = ({
  blocks,
  categories,
  libraries = [],
  onCreateBlock,
  onImportBlocks,
  importBlocksMessage,
  onDragOver,
  onDragEnter,
  onDrop,
  onDragStart,
  onDragEnd,
  onPointerDown,
  onDeleteBlock,
  onEditBlock,
  onExportBlock,
  onSelectVariant,
  onSetBlockArrayItemEnabled,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
  onMoveBlockToCategory,
}: LibraryPanelProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);

  const handleCategoryDragOver = (category: string) => (e: ReactDragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDragOverCategory(category);
  };

  const handleCategoryDragLeave = (e: ReactDragEvent) => {
    const related = e.relatedTarget as Node | null;
    if (related && (e.currentTarget as Node).contains(related)) return;
    setDragOverCategory(null);
  };

  const handleCategoryDrop = (category: string) => (e: ReactDragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCategory(null);

    let blockId: string | undefined;
    let source: string | undefined;

    const payload = e.dataTransfer.getData("text/plain");
    if (payload) {
      try {
        const parsed = JSON.parse(payload) as { blockId: string; source: string };
        blockId = parsed.blockId;
        source = parsed.source;
      } catch {
        blockId = payload;
      }
    }

    if (blockId && source === "library") {
      onMoveBlockToCategory(blockId, category);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportBlocks) {
      onImportBlocks(file).finally(() => {
        e.target.value = "";
      });
    }
  };

  const handleAddCategoryConfirm = () => {
    const trimmed = newCategoryName.trim();
    if (trimmed) {
      onAddCategory(trimmed);
    }
    setNewCategoryName("");
    setIsAddingCategory(false);
  };

  const handleRenameConfirm = () => {
    const trimmed = editingCategoryName.trim();
    if (trimmed && editingCategory && trimmed !== editingCategory) {
      onRenameCategory(editingCategory, trimmed);
    }
    setEditingCategory(null);
    setEditingCategoryName("");
  };

  const grouped = useMemo(
    () => groupBlocksByCategory(blocks, categories),
    [blocks, categories],
  );

  return (
    <section className="panel">
      <header className="panel__header">
        <div>
          <h2>Library</h2>
          <span className="panel__hint">Drag a block to activate it.</span>
        </div>
        <div className="panel__header-actions">
          {onImportBlocks ? (
            <>
              <button
                className="panel__action panel__action--ghost"
                type="button"
                onClick={handleImportClick}
              >
                Import blocks
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="settings__file-input"
                aria-hidden
                tabIndex={-1}
                onChange={handleFileChange}
              />
            </>
          ) : null}
          <button
            className="panel__action panel__action--ghost"
            type="button"
            onClick={() => {
              setIsAddingCategory(true);
              setNewCategoryName("");
            }}
          >
            + Add Category
          </button>
          <button
            className="panel__action"
            type="button"
            onClick={onCreateBlock}
          >
            New Block
          </button>
        </div>
      </header>
      {importBlocksMessage ? (
        <div
          className={
            importBlocksMessage.startsWith("Invalid") ||
            importBlocksMessage.startsWith("Import failed") ||
            importBlocksMessage.startsWith("No profile")
              ? "panel__message panel__message--error"
              : "panel__message panel__message--success"
          }
        >
          {importBlocksMessage}
        </div>
      ) : null}
      <div
        className="panel__body"
        data-drop-zone="library"
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDrop={onDrop}
      >
        {blocks.length === 0 && categories.length === 0 && !isAddingCategory ? (
          <div className="panel__empty">All blocks active.</div>
        ) : (
          <>
            {grouped.map(({ category, blocks: categoryBlocks }) => (
              <div
                key={category}
                className={`panel__category-group${dragOverCategory === category ? " panel__category-group--drag-over" : ""}`}
                onDragOver={handleCategoryDragOver(category)}
                onDragLeave={handleCategoryDragLeave}
                onDrop={handleCategoryDrop(category)}
              >
                {editingCategory === category ? (
                  <div className="panel__category-edit">
                    <input
                      className="panel__category-input"
                      type="text"
                      value={editingCategoryName}
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameConfirm();
                        if (e.key === "Escape") {
                          setEditingCategory(null);
                          setEditingCategoryName("");
                        }
                      }}
                      onBlur={handleRenameConfirm}
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="panel__category-header">
                    <h3 className="panel__category">{category}</h3>
                    {category !== UNCATEGORIZED && (
                      <div className="panel__category-actions">
                        <button
                          className="panel__category-btn panel__category-btn--edit"
                          type="button"
                          title="Rename category"
                          onClick={() => {
                            setEditingCategory(category);
                            setEditingCategoryName(category);
                          }}
                        >
                          &#9998;
                        </button>
                        <button
                          className="panel__category-btn panel__category-btn--delete"
                          type="button"
                          title="Delete category"
                          onClick={() => onDeleteCategory(category)}
                        >
                          &times;
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {categoryBlocks.length > 0 && (
                  <div className="panel__block-grid">
                    {categoryBlocks.map((block) => (
                      <BlockCard
                        key={block.id}
                        block={block}
                        compact
                        draggable
                        libraryName={
                          libraries.find(
                            (l) => l.id === (block.sourceLibraryId ?? "local"),
                          )?.name ?? block.sourceLibraryId ?? "Local"
                        }
                        onDragStart={onDragStart(block.id)}
                        onDragEnd={onDragEnd}
                        onPointerDown={onPointerDown(block.id)}
                        onDelete={() => onDeleteBlock(block.id)}
                        onEdit={() => onEditBlock(block.id)}
                        onExport={
                          onExportBlock ? () => onExportBlock(block) : undefined
                        }
                        onSelectVariant={(variantId) =>
                          onSelectVariant(block.id, variantId)
                        }
                        onSetArrayItemEnabled={onSetBlockArrayItemEnabled}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isAddingCategory && (
              <div className="panel__category-group">
                <div className="panel__category-edit">
                  <input
                    className="panel__category-input"
                    type="text"
                    placeholder="Category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddCategoryConfirm();
                      if (e.key === "Escape") {
                        setIsAddingCategory(false);
                        setNewCategoryName("");
                      }
                    }}
                    onBlur={handleAddCategoryConfirm}
                    autoFocus
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default LibraryPanel;
