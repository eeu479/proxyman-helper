import type { Library } from "../../api/libraries";
import type {
  ChangeEvent,
  DragEvent as ReactDragEvent,
  DragEventHandler,
  KeyboardEvent,
  PointerEventHandler,
} from "react";
import { useMemo, useRef, useState } from "react";
import type { Block } from "../../types/block";

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

type LibraryTreePanelProps = {
  blocks: Block[];
  categories: string[];
  libraries?: Library[];
  onCreateBlock: () => void;
  onCreateBlockInCategory?: (category: string) => void;
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
  onAddToActive: (blockId: string) => void;
};

export default function LibraryTreePanel({
  blocks,
  categories,
  libraries = [],
  onCreateBlock,
  onCreateBlockInCategory,
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
  onAddToActive,
}: LibraryTreePanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string> | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);

  const filteredBlocks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return blocks;
    return blocks.filter((block) => {
      const name = (block.name ?? "").toLowerCase();
      const method = (block.method ?? "").toLowerCase();
      const path = (block.path ?? "").toLowerCase();
      const description = (block.description ?? "").toLowerCase();
      const category = ((block.category ?? "").trim() || UNCATEGORIZED).toLowerCase();
      return (
        name.includes(q) ||
        method.includes(q) ||
        path.includes(q) ||
        description.includes(q) ||
        category.includes(q)
      );
    });
  }, [blocks, searchQuery]);

  const grouped = useMemo(
    () => groupBlocksByCategory(filteredBlocks, categories),
    [filteredBlocks, categories],
  );

  const expandedSet = useMemo(() => {
    if (expandedFolders !== null) return expandedFolders;
    return new Set(grouped.map((g) => g.category));
  }, [expandedFolders, grouped]);

  const toggleFolder = (category: string) => {
    setExpandedFolders((prev) => {
      const base = prev === null ? new Set(grouped.map((g) => g.category)) : new Set(prev);
      if (base.has(category)) {
        base.delete(category);
      } else {
        base.add(category);
      }
      return base;
    });
  };

  const expandAll = () => {
    setExpandedFolders(new Set(grouped.map((g) => g.category)));
  };

  const collapseAll = () => {
    setExpandedFolders(new Set());
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

  const handleFolderDragOver = (category: string) => (e: ReactDragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDragOverCategory(category);
  };

  const handleFolderDragLeave = (e: ReactDragEvent) => {
    const related = e.relatedTarget as Node | null;
    if (related && (e.currentTarget as Node).contains(related)) return;
    setDragOverCategory(null);
  };

  const handleFolderDrop = (category: string) => (e: ReactDragEvent) => {
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

  const getLibraryName = (block: Block) =>
    libraries.find((l) => l.id === (block.sourceLibraryId ?? "local"))?.name ??
    block.sourceLibraryId ??
    "Local";

  const isEmpty = blocks.length === 0;
  const hasNoResults = !isEmpty && filteredBlocks.length === 0;

  return (
    <section className="panel panel--library-tree" aria-label="Library tree">
      <header className="panel__header">
        <div>
          <h2>Library</h2>
          <span className="panel__hint">Activate blocks into the flow.</span>
        </div>
        <div className="panel__header-actions library-tree__header-actions">
          {onImportBlocks ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="settings__file-input"
                aria-hidden
                tabIndex={-1}
                onChange={handleFileChange}
              />
              <button
                className="library-tree__icon-btn library-tree__icon-btn--ghost"
                type="button"
                onClick={handleImportClick}
                title="Import blocks"
                aria-label="Import blocks"
              >
                <svg className="library-tree__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
            </>
          ) : null}
          <button
            className="library-tree__icon-btn library-tree__icon-btn--ghost"
            type="button"
            onClick={() => {
              setIsAddingCategory(true);
              setNewCategoryName("");
            }}
            title="Add category"
            aria-label="Add category"
          >
            <svg className="library-tree__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
          </button>
          <button
            className="library-tree__icon-btn library-tree__icon-btn--primary"
            type="button"
            onClick={onCreateBlock}
            title="New block"
            aria-label="New block"
          >
            <svg className="library-tree__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
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

      {!isEmpty && (
        <div className="library-tree__toolbar">
          <input
            type="search"
            className="library-tree__search"
            placeholder="Search blocks…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search library"
          />
          <div className="library-tree__expand-actions">
            <button
              type="button"
              className="library-tree__expand-btn"
              onClick={expandAll}
              aria-label="Expand all folders"
            >
              Expand all
            </button>
            <button
              type="button"
              className="library-tree__expand-btn"
              onClick={collapseAll}
              aria-label="Collapse all folders"
            >
              Collapse all
            </button>
          </div>
        </div>
      )}

      <div
        className="panel__body library-tree__body"
        data-drop-zone="library"
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDrop={onDrop}
      >
        {isEmpty && !isAddingCategory ? (
          <div className="panel__empty">No blocks. Create or import to get started.</div>
        ) : hasNoResults ? (
          <div className="panel__empty">No blocks match the search.</div>
        ) : (
          <ul className="library-tree" role="tree" aria-label="Library folders and blocks">
            {grouped.map(({ category, blocks: categoryBlocks }) => {
              const isExpanded = expandedSet.has(category);
              const isDragOver = dragOverCategory === category;

              return (
                <li
                  key={category}
                  className="library-tree__folder-wrap"
                  role="treeitem"
                  aria-expanded={isExpanded}
                  aria-level={1}
                >
                  <div
                    className={`library-tree__folder ${isDragOver ? "library-tree__folder--drag-over" : ""}`}
                    onDragOver={handleFolderDragOver(category)}
                    onDragLeave={handleFolderDragLeave}
                    onDrop={handleFolderDrop(category)}
                    onClick={() => toggleFolder(category)}
                    onKeyDown={(e: KeyboardEvent) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleFolder(category);
                      }
                    }}
                  >
                    <span
                      className="library-tree__chevron"
                      aria-hidden
                    >
                      {isExpanded ? "\u25BC" : "\u25B6"}
                    </span>
                    {editingCategory === category ? (
                      <div
                        className="library-tree__folder-edit"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          className="library-tree__folder-input"
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
                          aria-label="Category name"
                        />
                      </div>
                    ) : (
                      <>
                        <span className="library-tree__folder-label">{category}</span>
                        {category !== UNCATEGORIZED && (
                          <div className="library-tree__folder-actions">
                            <button
                              type="button"
                              className="library-tree__folder-btn"
                              title="Rename category"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCategory(category);
                                setEditingCategoryName(category);
                              }}
                              aria-label={`Rename ${category}`}
                            >
                              &#9998;
                            </button>
                            {onCreateBlockInCategory && (
                              <button
                                type="button"
                                className="library-tree__folder-btn"
                                title="Add block in this category"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCreateBlockInCategory(category === UNCATEGORIZED ? "" : category);
                                }}
                                aria-label={`Add block in ${category}`}
                              >
                                +
                              </button>
                            )}
                            <button
                              type="button"
                              className="library-tree__folder-btn library-tree__folder-btn--delete"
                              title="Delete category"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteCategory(category);
                              }}
                              aria-label={`Delete ${category}`}
                            >
                              &times;
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {isExpanded && (
                    <ul className="library-tree__blocks" role="group">
                      {categoryBlocks.map((block) => (
                        <li
                          key={block.id}
                          className="library-tree__block-row-wrap"
                          role="treeitem"
                          aria-level={2}
                        >
                          <div
                            className="library-tree__block-row"
                            draggable
                            onDragStart={onDragStart(block.id)}
                            onDragEnd={onDragEnd}
                            onPointerDown={onPointerDown(block.id)}
                            onDoubleClick={() => onEditBlock(block.id)}
                          >
                            <span className="library-tree__block-method" aria-hidden>
                              {block.method.toUpperCase()}
                            </span>
                            <span className="library-tree__block-label" title={block.path}>
                              {block.name || block.path}
                            </span>
                            {block.sourceLibraryId && block.sourceLibraryId !== "local" ? (
                              <span className="library-tree__block-badge" title={getLibraryName(block)}>
                                {getLibraryName(block)}
                              </span>
                            ) : null}
                            <div className="library-tree__block-actions">
                              <button
                                type="button"
                                className="library-tree__block-add"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAddToActive(block.id);
                                }}
                                title="Add to active flow"
                                aria-label={`Add ${block.name || block.path} to flow`}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}

            {isAddingCategory && (
              <li className="library-tree__folder-wrap" role="treeitem">
                <div className="library-tree__folder library-tree__folder--edit">
                  <span className="library-tree__chevron library-tree__chevron--empty" aria-hidden />
                  <input
                    className="library-tree__folder-input"
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
                    aria-label="New category name"
                  />
                </div>
              </li>
            )}
          </ul>
        )}
      </div>
    </section>
  );
}
