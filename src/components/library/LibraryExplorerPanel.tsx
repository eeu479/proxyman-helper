import type { Library } from "../../api/libraries";
import type { ChangeEvent } from "react";
import { useMemo, useRef, useState } from "react";
import type { Block } from "../../types/block";
import BlockCard from "../blocks/BlockCard";

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

type LibraryExplorerPanelProps = {
  profileName: string | null;
  blocks: Block[];
  categories: string[];
  libraries: Library[];
  /** When creating a block, pass the selected library id so the new block is added there (undefined = local). */
  onCreateBlock: (libraryId?: string) => void;
  onImportBlocks?: (file: File) => Promise<void>;
  importBlocksMessage?: string | null;
  onEditBlock: (blockId: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onExportBlock?: (block: Block) => void;
  onAddToActive: (blockId: string) => void;
  onSelectVariant: (blockId: string, variantId: string) => void;
  onSetBlockArrayItemEnabled?: (
    blockId: string,
    valueId: string,
    index: number,
    enabled: boolean,
  ) => void;
};

const LibraryExplorerPanel = ({
  profileName,
  blocks,
  categories,
  libraries,
  onCreateBlock,
  onImportBlocks,
  importBlocksMessage,
  onEditBlock,
  onDeleteBlock,
  onExportBlock,
  onAddToActive,
  onSelectVariant,
  onSetBlockArrayItemEnabled,
}: LibraryExplorerPanelProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>("");

  const selectedLibrary = useMemo(
    () =>
      selectedLibraryId
        ? libraries.find((l) => l.id === selectedLibraryId) ?? null
        : null,
    [libraries, selectedLibraryId],
  );

  const filteredBlocks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let result = blocks;

    if (selectedLibraryId) {
      result = result.filter(
        (block) => (block.sourceLibraryId ?? "local") === selectedLibraryId,
      );
    }

    if (q) {
      result = result.filter((block) => {
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
    }

    if (methodFilter) {
      result = result.filter(
        (block) => block.method.toUpperCase() === methodFilter.toUpperCase(),
      );
    }

    if (categoryFilter) {
      const target =
        categoryFilter === UNCATEGORIZED ? "" : categoryFilter;
      result = result.filter(
        (block) => ((block.category ?? "").trim() || UNCATEGORIZED) === (target || UNCATEGORIZED),
      );
    }

    return result;
  }, [blocks, selectedLibraryId, searchQuery, methodFilter, categoryFilter]);

  const grouped = useMemo(
    () => groupBlocksByCategory(filteredBlocks, categories),
    [filteredBlocks, categories],
  );

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

  const methods = useMemo(() => {
    const set = new Set(blocks.map((b) => b.method.toUpperCase()));
    return METHOD_ORDER.filter((m) => set.has(m));
  }, [blocks]);

  const categoryOptions = useMemo(() => {
    const list = [UNCATEGORIZED, ...categories.filter((c) => c !== UNCATEGORIZED)];
    return list;
  }, [categories]);

  const isEmpty = blocks.length === 0;
  const hasNoResults = !isEmpty && filteredBlocks.length === 0;
  const isSingleLibraryEmpty =
    selectedLibraryId && !hasNoResults && filteredBlocks.length === 0;

  const handleLibraryChange = (value: string) => {
    setSelectedLibraryId(value);
  };

  return (
    <div className="library-explorer">
      <header className="library-explorer__header">
        <h1 className="library-explorer__title">Library</h1>
        <div className="library-explorer__actions">
          <button
            className="library-explorer__btn library-explorer__btn--primary"
            type="button"
            onClick={() => onCreateBlock(selectedLibraryId || undefined)}
          >
            Create block
          </button>
          {onImportBlocks ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="library-explorer__file-input"
                aria-hidden
                onChange={handleFileChange}
              />
              <button
                className="library-explorer__btn library-explorer__btn--secondary"
                type="button"
                onClick={handleImportClick}
              >
                Import blocks
              </button>
            </>
          ) : null}
        </div>
      </header>

      {importBlocksMessage ? (
        <div className="library-explorer__message">{importBlocksMessage}</div>
      ) : null}

      {!isEmpty ? (
        <>
          <div className="library-explorer__filters">
            <select
              className="library-explorer__select"
              value={selectedLibraryId}
              onChange={(e) => handleLibraryChange(e.target.value)}
              aria-label="Library"
            >
              <option value="">All libraries</option>
              {libraries.map((lib) => (
                <option key={lib.id} value={lib.id}>
                  {lib.name}
                </option>
              ))}
            </select>
            <input
              type="search"
              className="library-explorer__search"
              placeholder="Search by name, method, path, description…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search blocks"
            />
            <select
              className="library-explorer__select"
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              aria-label="Filter by method"
            >
              <option value="">All methods</option>
              {methods.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select
              className="library-explorer__select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
            >
              <option value="">All categories</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          {selectedLibrary?.type === "remote" && selectedLibrary.folderPath ? (
            <div className="library-explorer__remote-actions">
              <span className="library-explorer__remote-status">
                Folder: {selectedLibrary.folderPath}
              </span>
            </div>
          ) : null}
        </>
      ) : null}

      <div className="library-explorer__body">
        {isEmpty ? (
          <div className="library-explorer__empty">
            <p>No blocks in the library.</p>
            <p>Create a block or import blocks to get started.</p>
            <div className="library-explorer__empty-actions">
              <button
                className="library-explorer__btn library-explorer__btn--primary"
                type="button"
                onClick={() => onCreateBlock(selectedLibraryId || undefined)}
              >
                Create block
              </button>
              {onImportBlocks ? (
                <button
                  className="library-explorer__btn library-explorer__btn--secondary"
                  type="button"
                  onClick={handleImportClick}
                >
                  Import blocks
                </button>
              ) : null}
            </div>
          </div>
        ) : hasNoResults ? (
          <div className="library-explorer__empty">
            {isSingleLibraryEmpty && selectedLibrary ? (
              <>
                <p>No blocks in {selectedLibrary.name}.</p>
                <button
                  className="library-explorer__btn library-explorer__btn--secondary"
                  type="button"
                  onClick={() => setSelectedLibraryId("")}
                >
                  View all libraries
                </button>
              </>
            ) : (
              <>
                <p>No blocks match the current filters.</p>
                <button
                  className="library-explorer__btn library-explorer__btn--secondary"
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setMethodFilter("");
                    setCategoryFilter("");
                  }}
                >
                  Clear filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="library-explorer__groups">
            {grouped.map(({ category, blocks: categoryBlocks }) => (
              <section
                key={category}
                className="library-explorer__group"
              >
                <h2 className="library-explorer__group-title">{category}</h2>
                <div className="library-explorer__grid">
                  {categoryBlocks.map((block) => (
                    <BlockCard
                      key={block.id}
                      block={block}
                      compact
                      className="block--no-drag"
                      libraryName={
                        libraries.find(
                          (l) => l.id === (block.sourceLibraryId ?? "local"),
                        )?.name ?? block.sourceLibraryId ?? "Local"
                      }
                      onEdit={() => onEditBlock(block.id)}
                      onDelete={() => onDeleteBlock(block.id)}
                      onExport={
                        onExportBlock ? () => onExportBlock(block) : undefined
                      }
                      onAddToActive={() => onAddToActive(block.id)}
                      onSelectVariant={(variantId) =>
                        onSelectVariant(block.id, variantId)
                      }
                      onSetArrayItemEnabled={onSetBlockArrayItemEnabled}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryExplorerPanel;
