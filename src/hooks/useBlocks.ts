import type {
  DragEvent,
  FormEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchBlocks, updateBlocks } from "../api/blocks";
import type { RequestLogEntry } from "../api/logs";
import { initialLibrary } from "../data/initialData";
import type { Block, TemplateValue, TemplateValueType } from "../types/block";
import { parseArrayItems } from "../types/block";
import type { Profile } from "../types/profile";

type UseBlocksParams = {
  profiles: Profile[];
  selectedProfile: string;
};

type UseBlocksReturn = {
  libraryBlocks: Block[];
  activeBlocks: Block[];
  isBuilderOpen: boolean;
  builderName: string;
  builderMethod: string;
  builderPath: string;
  builderDescription: string;
  builderCategory: string;
  builderResponseTemplate: string;
  builderResponseHeaders: { id: string; key: string; value: string }[];
  builderTemplateValues: TemplateValue[];
  builderTemplateVariants: {
    id: string;
    name: string;
    values: TemplateValue[];
  }[];
  builderActiveVariantId: string | null;
  isEditingBlock: boolean;
  setIsBuilderOpen: (isOpen: boolean) => void;
  setBuilderName: (value: string) => void;
  setBuilderMethod: (value: string) => void;
  setBuilderPath: (value: string) => void;
  setBuilderDescription: (value: string) => void;
  setBuilderCategory: (value: string) => void;
  setBuilderResponseTemplate: (value: string) => void;
  setBuilderActiveVariantId: (value: string | null) => void;
  addTemplateVariant: (name?: string) => void;
  removeTemplateVariant: (variantId: string) => void;
  updateTemplateVariantName: (variantId: string, value: string) => void;
  addResponseHeader: (key?: string, value?: string) => void;
  updateResponseHeader: (
    id: string,
    field: "key" | "value",
    value: string,
  ) => void;
  removeResponseHeader: (id: string) => void;
  openBuilderFromLog: (entry: RequestLogEntry) => void;
  addTemplateValue: (key?: string, value?: string) => void;
  updateTemplateValue: (
    id: string,
    field: "key" | "value",
    value: string,
  ) => void;
  removeTemplateValue: (id: string) => void;
  updateTemplateValueType: (id: string, valueType: TemplateValueType) => void;
  addArrayItem: (valueId: string) => void;
  updateArrayItem: (valueId: string, index: number, text: string) => void;
  removeArrayItem: (valueId: string, index: number) => void;
  setArrayItemEnabled: (valueId: string, index: number, enabled: boolean) => void;
  editBlock: (blockId: string) => void;
  setBlockActiveVariant: (blockId: string, variantId: string) => void;
  closeBuilder: () => void;
  handleCreateBlock: (event: FormEvent<HTMLFormElement>) => void;
  handleCreateAndReset: (event: FormEvent<HTMLFormElement>) => void;
  allowDrop: (event: DragEvent<HTMLDivElement>) => void;
  handleDragEnter: (event: DragEvent<HTMLDivElement>) => void;
  handleDragStart: (
    blockId: string,
    source: "library" | "active",
  ) => (event: DragEvent<HTMLDivElement>) => void;
  handleDrop: (
    destination: "library" | "active",
  ) => (event: DragEvent<HTMLDivElement>) => void;
  handleDragEnd: () => void;
  handlePointerDown: (
    blockId: string,
    source: "library" | "active",
  ) => (event: ReactPointerEvent<HTMLDivElement>) => void;
  removeLibraryBlock: (blockId: string) => void;
  clearActiveBlocks: () => void;
  replaceBlocksForProfile: (
    profileName: string,
    libraryBlocks: Block[],
    activeBlocks: Block[],
  ) => void;
  categories: string[];
  addCategory: (name: string) => void;
  renameCategory: (oldName: string, newName: string) => void;
  deleteCategory: (name: string) => void;
  moveBlockToCategory: (blockId: string, category: string) => void;
  addLibraryBlockToActive: (blockId: string) => void;
  removeBlockFromActive: (blockId: string) => void;
  setBlockArrayItemEnabled: (
    blockId: string,
    valueId: string,
    index: number,
    enabled: boolean,
  ) => void;
};

function dedupeBlocksById(blocks: Block[]): Block[] {
  const seen = new Set<string>();
  return blocks.filter((b) => {
    if (seen.has(b.id)) return false;
    seen.add(b.id);
    return true;
  });
}

const useBlocks = ({
  profiles,
  selectedProfile,
}: UseBlocksParams): UseBlocksReturn => {
  const [libraryBlocksByProfile, setLibraryBlocksByProfile] = useState<
    Record<string, Block[]>
  >({});
  const [activeBlocksByProfile, setActiveBlocksByProfile] = useState<
    Record<string, Block[]>
  >({});
  const [categoriesByProfile, setCategoriesByProfile] = useState<
    Record<string, string[]>
  >({});
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [builderName, setBuilderName] = useState("");
  const [builderMethod, setBuilderMethod] = useState("GET");
  const [builderPath, setBuilderPath] = useState("/api/");
  const [builderDescription, setBuilderDescription] = useState("");
  const [builderCategory, setBuilderCategory] = useState("");
  const [builderResponseTemplate, setBuilderResponseTemplate] = useState("");
  const [builderResponseHeaders, setBuilderResponseHeaders] = useState<
    { id: string; key: string; value: string }[]
  >([]);
  const [builderTemplateValues, setBuilderTemplateValues] = useState<
    TemplateValue[]
  >([]);
  const [builderTemplateVariants, setBuilderTemplateVariants] = useState<
    {
      id: string;
      name: string;
      values: TemplateValue[];
    }[]
  >([]);
  const [builderActiveVariantId, setBuilderActiveVariantId] = useState<
    string | null
  >(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const dragRef = useRef<{
    blockId: string;
    source: "library" | "active";
  } | null>(null);
  const pointerPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (builderTemplateVariants.length === 0) {
      if (builderActiveVariantId !== null) {
        setBuilderActiveVariantId(null);
      }
      return;
    }
    if (
      !builderTemplateVariants.some(
        (variant) => variant.id === builderActiveVariantId,
      )
    ) {
      setBuilderActiveVariantId(builderTemplateVariants[0]?.id ?? null);
    }
  }, [builderTemplateVariants, builderActiveVariantId]);

  const createSeedLibrary = () =>
    initialLibrary.map((block) => ({
      ...block,
      category: block.category ?? "",
      templateValues: [...block.templateValues],
      templateVariants: block.templateVariants.map((variant) => ({
        ...variant,
        values: [...variant.values],
      })),
    }));

  const extractTemplateKeys = (template: string) => {
    const regex = /\{\{\s*([^}]+?)\s*\}\}/g;
    const keys = new Set<string>();
    let match = regex.exec(template);
    while (match) {
      const key = match[1]?.trim();
      if (key) {
        keys.add(key);
      }
      match = regex.exec(template);
    }
    return Array.from(keys);
  };

  const normalizeTemplateValues = (values: TemplateValue[]) =>
    values
      .map((item) => ({
        ...item,
        key: item.key.trim(),
        value: item.value.trim(),
      }))
      .filter((item) => item.key.length > 0);

  const ensureTemplateKeys = (values: TemplateValue[], template: string) => {
    const keys = extractTemplateKeys(template);
    if (keys.length === 0) {
      return values;
    }
    const keySet = new Set(keys);
    const filtered = values.filter((item) => keySet.has(item.key));
    const existing = new Set(filtered.map((item) => item.key));
    const missing = keys.filter((key) => !existing.has(key));
    if (missing.length === 0) {
      return filtered;
    }
    const timestamp = Date.now();
    const additions = missing.map((key, index) => ({
      id: `template-${timestamp}-${filtered.length + index}`,
      key,
      value: "",
      valueType: "string" as TemplateValueType,
    }));
    return [...filtered, ...additions];
  };

  useEffect(() => {
    if (profiles.length === 0) {
      return;
    }
    let isActive = true;

    const loadBlocks = async () => {
      const entries = await Promise.all(
        profiles.map(async (profile) => {
          try {
            const blocks = await fetchBlocks(profile.name);
            return { name: profile.name, blocks };
          } catch (error) {
            if (import.meta.env.DEV) {
              console.error(
                "[blocks] failed to load blocks",
                profile.name,
                error,
              );
            }
            return { name: profile.name, blocks: null };
          }
        }),
      );

      if (!isActive) {
        return;
      }

      setLibraryBlocksByProfile((prev) => {
        const next = { ...prev };
        entries.forEach(({ name, blocks }) => {
          if (blocks) {
            if (
              blocks.libraryBlocks.length === 0 &&
              blocks.activeBlocks.length === 0
            ) {
              next[name] = createSeedLibrary();
            } else {
              next[name] = dedupeBlocksById(blocks.libraryBlocks);
            }
          } else if (!next[name]) {
            next[name] = createSeedLibrary();
          }
        });
        return next;
      });

      setActiveBlocksByProfile((prev) => {
        const next = { ...prev };
        entries.forEach(({ name, blocks }) => {
          if (blocks) {
            if (
              blocks.libraryBlocks.length === 0 &&
              blocks.activeBlocks.length === 0
            ) {
              next[name] = [];
            } else {
              next[name] = dedupeBlocksById(blocks.activeBlocks);
            }
          } else if (!next[name]) {
            next[name] = [];
          }
        });
        return next;
      });

      setCategoriesByProfile((prev) => {
        const next = { ...prev };
        entries.forEach(({ name, blocks }) => {
          if (blocks) {
            next[name] = blocks.categories ?? [];
          } else if (!next[name]) {
            next[name] = [];
          }
        });
        return next;
      });

      await Promise.all(
        entries.map(async ({ name, blocks }) => {
          if (!blocks) {
            return;
          }
          if (
            blocks.libraryBlocks.length === 0 &&
            blocks.activeBlocks.length === 0
          ) {
            const seed = createSeedLibrary();
            try {
              await updateBlocks(name, {
                libraryBlocks: seed,
                activeBlocks: [],
                categories: [],
              });
            } catch (error) {
              if (import.meta.env.DEV) {
                console.error("[blocks] failed to seed blocks", name, error);
              }
            }
          }
        }),
      );
    };

    loadBlocks();

    return () => {
      isActive = false;
    };
  }, [profiles]);

  const libraryBlocks = libraryBlocksByProfile[selectedProfile] ?? [];
  const activeBlocks = activeBlocksByProfile[selectedProfile] ?? [];
  const categories = categoriesByProfile[selectedProfile] ?? [];

  const blockIndex = useMemo(() => {
    return new Map(
      [...libraryBlocks, ...activeBlocks].map((block) => [block.id, block]),
    );
  }, [libraryBlocks, activeBlocks]);

  const moveBlock = useCallback(
    (
      blockId: string | undefined,
      source: "library" | "active" | undefined,
      destination: "library" | "active",
    ) => {
      if (!blockId || !source || source === destination) {
        if (import.meta.env.DEV) {
          console.log("[drag] ignored", { blockId, source, destination });
        }
        return;
      }

      const block = blockIndex.get(blockId);
      if (!block) {
        if (import.meta.env.DEV) {
          console.log("[drag] missing block", { blockId });
        }
        return;
      }

      if (!selectedProfile) {
        return;
      }

      const nextLibrary =
        destination === "active"
          ? libraryBlocks.filter((item) => item.id !== blockId)
          : libraryBlocks.some((b) => b.id === blockId)
            ? libraryBlocks
            : [...libraryBlocks, block];
      const nextActive =
        destination === "active"
          ? activeBlocks.some((b) => b.id === blockId)
            ? activeBlocks
            : [...activeBlocks, block]
          : activeBlocks.filter((item) => item.id !== blockId);

      if (destination === "active") {
        setLibraryBlocksByProfile((prev) => ({
          ...prev,
          [selectedProfile]: nextLibrary,
        }));
        setActiveBlocksByProfile((prev) => ({
          ...prev,
          [selectedProfile]: nextActive,
        }));
      } else {
        setActiveBlocksByProfile((prev) => ({
          ...prev,
          [selectedProfile]: nextActive,
        }));
        setLibraryBlocksByProfile((prev) => ({
          ...prev,
          [selectedProfile]: nextLibrary,
        }));
      }

      updateBlocks(selectedProfile, {
        libraryBlocks: nextLibrary,
        activeBlocks: nextActive,
        categories,
      }).catch((error) => {
        if (import.meta.env.DEV) {
          console.error("[blocks] failed to persist move", error);
        }
      });
    },
    [blockIndex, selectedProfile, libraryBlocks, activeBlocks, categories],
  );

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragRef.current) {
        return;
      }
      pointerPosRef.current = { x: event.clientX, y: event.clientY };
    };

    const handlePointerUp = (event: PointerEvent) => {
      const current = dragRef.current;
      if (!current) {
        return;
      }

      const position = pointerPosRef.current ?? {
        x: event.clientX,
        y: event.clientY,
      };
      const element = document.elementFromPoint(position.x, position.y);
      const dropZone = element?.closest<HTMLElement>("[data-drop-zone]");
      const destination = dropZone?.dataset.dropZone as
        | "library"
        | "active"
        | undefined;

      if (import.meta.env.DEV) {
        console.log("[drag] pointer up", {
          blockId: current.blockId,
          source: current.source,
          destination,
        });
      }

      if (destination) {
        moveBlock(current.blockId, current.source, destination);
      }

      dragRef.current = null;
      pointerPosRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [moveBlock]);

  const handleDragStart = (blockId: string, source: "library" | "active") => {
    return (event: DragEvent<HTMLDivElement>) => {
      dragRef.current = { blockId, source };
      if (import.meta.env.DEV) {
        console.log("[drag] start", { blockId, source });
      }
      event.dataTransfer.setData(
        "text/plain",
        JSON.stringify({ blockId, source }),
      );
      event.dataTransfer.setData("text", JSON.stringify({ blockId, source }));
      event.dataTransfer.setData(
        "application/json",
        JSON.stringify({ blockId, source }),
      );
      event.dataTransfer.effectAllowed = "move";
    };
  };

  const handleDrop = (destination: "library" | "active") => {
    return (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (import.meta.env.DEV) {
        console.log("[drag] drop", {
          destination,
          types: Array.from(event.dataTransfer.types),
        });
      }
      let blockId = dragRef.current?.blockId;
      let source = dragRef.current?.source;

      if (!blockId || !source) {
        const payload = event.dataTransfer.getData("text/plain");
        if (import.meta.env.DEV) {
          console.log("[drag] payload", payload);
        }
        if (payload) {
          try {
            const parsed = JSON.parse(payload) as {
              blockId: string;
              source: "library" | "active";
            };
            blockId = parsed.blockId;
            source = parsed.source;
          } catch {
            blockId = payload;
          }
        }
      }

      moveBlock(blockId, source, destination);

      dragRef.current = null;
    };
  };

  const allowDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (import.meta.env.DEV) {
      console.log("[drag] allowDrop", {
        types: Array.from(event.dataTransfer.types),
      });
    }
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (import.meta.env.DEV) {
      console.log("[drag] enter", {
        types: Array.from(event.dataTransfer.types),
      });
    }
  };

  const handleDragEnd = () => {
    if (import.meta.env.DEV) {
      console.log("[drag] end");
    }
    dragRef.current = null;
  };

  const handlePointerDown = (blockId: string, source: "library" | "active") => {
    return (event: ReactPointerEvent<HTMLDivElement>) => {
      dragRef.current = { blockId, source };
      pointerPosRef.current = { x: event.clientX, y: event.clientY };
      if (import.meta.env.DEV) {
        console.log("[drag] pointer down", { blockId, source });
      }
    };
  };

  const removeLibraryBlock = (blockId: string) => {
    if (!selectedProfile) {
      return;
    }
    const nextLibrary = libraryBlocks.filter((block) => block.id !== blockId);
    setLibraryBlocksByProfile((prev) => ({
      ...prev,
      [selectedProfile]: nextLibrary,
    }));
    updateBlocks(selectedProfile, {
      libraryBlocks: nextLibrary,
      activeBlocks,
      categories,
    }).catch((error) => {
      if (import.meta.env.DEV) {
        console.error("[blocks] failed to delete block", error);
      }
    });
  };

  const replaceBlocksForProfile = useCallback(
    (
      profileName: string,
      newLibraryBlocks: Block[],
      newActiveBlocks: Block[],
    ) => {
      setLibraryBlocksByProfile((prev) => ({
        ...prev,
        [profileName]: dedupeBlocksById(newLibraryBlocks),
      }));
      setActiveBlocksByProfile((prev) => ({
        ...prev,
        [profileName]: dedupeBlocksById(newActiveBlocks),
      }));
    },
    [],
  );

  const resetBuilder = () => {
    setBuilderName("");
    setBuilderMethod("GET");
    setBuilderPath("/api/");
    setBuilderDescription("");
    setBuilderCategory("");
    setBuilderResponseTemplate("");
    setBuilderResponseHeaders([]);
    setBuilderTemplateValues([]);
    setBuilderTemplateVariants([]);
    setBuilderActiveVariantId(null);
    setEditingBlockId(null);
  };

  const closeBuilder = () => {
    setIsBuilderOpen(false);
    resetBuilder();
  };

  const saveBlock = (onComplete: () => void) => {
    if (!selectedProfile) return;
    const trimmedName = builderName.trim();
    const trimmedPath = builderPath.trim();
    if (!trimmedName || !trimmedPath) return;

    const responseHeaders = builderResponseHeaders.reduce<
      Record<string, string>
    >((acc, item) => {
      const key = item.key.trim();
      if (!key) return acc;
      acc[key] = item.value.trim();
      return acc;
    }, {});

    const templateValues = normalizeTemplateValues(builderTemplateValues);
    const templateVariants = builderTemplateVariants.map((variant, index) => ({
      ...variant,
      name: variant.name.trim() || `Variant ${index + 1}`,
      values: normalizeTemplateValues(variant.values),
    }));
    const activeVariantId = templateVariants.some(
      (variant) => variant.id === builderActiveVariantId,
    )
      ? builderActiveVariantId
      : (templateVariants[0]?.id ?? null);

    const nextBlock: Block = {
      id: editingBlockId ?? `block-${Date.now()}`,
      name: trimmedName,
      method: builderMethod,
      path: trimmedPath,
      description: `${builderMethod} ${trimmedPath}`,
      category: builderCategory.trim() || "",
      responseTemplate: builderResponseTemplate.trim(),
      responseHeaders,
      templateValues,
      templateVariants,
      activeVariantId,
    };

    if (builderDescription.trim()) {
      nextBlock.description = builderDescription.trim();
    }

    const updateList = (items: Block[]) =>
      items.some((block) => block.id === nextBlock.id)
        ? items.map((block) => (block.id === nextBlock.id ? nextBlock : block))
        : [...items, nextBlock];
    const nextLibrary = updateList(libraryBlocks);
    // When creating a new block, only add to library; when editing, update in both library and active
    const nextActive = editingBlockId ? updateList(activeBlocks) : activeBlocks;
    setLibraryBlocksByProfile((prev) => ({
      ...prev,
      [selectedProfile]: nextLibrary,
    }));
    setActiveBlocksByProfile((prev) => ({
      ...prev,
      [selectedProfile]: nextActive,
    }));
    updateBlocks(selectedProfile, {
      libraryBlocks: nextLibrary,
      activeBlocks: nextActive,
      categories,
    }).catch((error) => {
      if (import.meta.env.DEV) {
        console.error("[blocks] failed to persist block", error);
      }
    });
    onComplete();
  };

  const handleCreateBlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveBlock(closeBuilder);
  };

  const handleCreateAndReset = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveBlock(resetBuilder);
  };

  const updateEditableTemplateValues = (
    updater: (values: TemplateValue[]) => TemplateValue[],
  ) => {
    if (builderTemplateVariants.length === 0) {
      setBuilderTemplateValues((prev) => updater(prev));
      return;
    }
    const activeId = builderActiveVariantId ?? builderTemplateVariants[0]?.id;
    if (!activeId) {
      return;
    }
    setBuilderTemplateVariants((prev) =>
      prev.map((variant) =>
        variant.id === activeId
          ? { ...variant, values: updater(variant.values) }
          : variant,
      ),
    );
  };

  const addTemplateValue = (
    key = "",
    value = "",
    valueType: TemplateValueType = "string",
  ) => {
    updateEditableTemplateValues((prev) => [
      ...prev,
      {
        id: `template-${Date.now()}-${prev.length}`,
        key,
        value,
        valueType,
      },
    ]);
  };

  const updateTemplateValueType = (id: string, valueType: TemplateValueType) => {
    updateEditableTemplateValues((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, valueType, value: "" } : item,
      ),
    );
  };

  const addArrayItem = (valueId: string) => {
    updateEditableTemplateValues((prev) =>
      prev.map((item) => {
        if (item.id !== valueId) return item;
        const items = parseArrayItems(item.value);
        return {
          ...item,
          value: JSON.stringify([...items, { v: "", e: true }]),
        };
      }),
    );
  };

  const updateArrayItem = (valueId: string, index: number, text: string) => {
    updateEditableTemplateValues((prev) =>
      prev.map((item) => {
        if (item.id !== valueId) return item;
        const items = parseArrayItems(item.value);
        const next = [...items];
        if (index >= 0 && index < next.length) {
          next[index] = { ...next[index], v: text };
        }
        return { ...item, value: JSON.stringify(next) };
      }),
    );
  };

  const removeArrayItem = (valueId: string, index: number) => {
    updateEditableTemplateValues((prev) =>
      prev.map((item) => {
        if (item.id !== valueId) return item;
        const items = parseArrayItems(item.value);
        const next = items.filter((_, i) => i !== index);
        return { ...item, value: JSON.stringify(next) };
      }),
    );
  };

  const setArrayItemEnabled = (
    valueId: string,
    index: number,
    enabled: boolean,
  ) => {
    updateEditableTemplateValues((prev) =>
      prev.map((item) => {
        if (item.id !== valueId) return item;
        const items = parseArrayItems(item.value);
        const next = [...items];
        if (index >= 0 && index < next.length) {
          next[index] = { ...next[index], e: enabled };
        }
        return { ...item, value: JSON.stringify(next) };
      }),
    );
  };

  const addTemplateVariant = (name = "") => {
    const id = `variant-${Date.now()}-${builderTemplateVariants.length}`;
    setBuilderTemplateVariants((prev) => {
      const seedValues = prev.length === 0 ? builderTemplateValues : [];
      const trimmedName = name.trim();
      const nextName = trimmedName || `Variant ${prev.length + 1}`;
      return [
        ...prev,
        {
          id,
          name: nextName,
          values: seedValues,
        },
      ];
    });
    if (
      builderTemplateVariants.length === 0 &&
      builderTemplateValues.length > 0
    ) {
      setBuilderTemplateValues([]);
    }
    setBuilderActiveVariantId(id);
  };

  const addResponseHeader = (key = "", value = "") => {
    setBuilderResponseHeaders((prev) => [
      ...prev,
      { id: `header-${Date.now()}-${prev.length}`, key, value },
    ]);
  };

  useEffect(() => {
    if (!builderResponseTemplate) {
      return;
    }
    if (builderTemplateVariants.length === 0) {
      setBuilderTemplateValues((prev) =>
        ensureTemplateKeys(prev, builderResponseTemplate),
      );
      return;
    }
    const activeId = builderActiveVariantId ?? builderTemplateVariants[0]?.id;
    if (!activeId) {
      return;
    }
    setBuilderTemplateVariants((prev) =>
      prev.map((variant) =>
        variant.id === activeId
          ? {
              ...variant,
              values: ensureTemplateKeys(
                variant.values,
                builderResponseTemplate,
              ),
            }
          : variant,
      ),
    );
  }, [
    builderResponseTemplate,
    builderActiveVariantId,
    builderTemplateVariants.length,
  ]);

  const updateTemplateValue = (
    id: string,
    field: "key" | "value",
    value: string,
  ) => {
    updateEditableTemplateValues((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const removeTemplateValue = (id: string) => {
    updateEditableTemplateValues((prev) =>
      prev.filter((item) => item.id !== id),
    );
  };

  const removeTemplateVariant = (variantId: string) => {
    setBuilderTemplateVariants((prev) => {
      const removed = prev.find((variant) => variant.id === variantId);
      const next = prev.filter((variant) => variant.id !== variantId);
      if (next.length === 0 && removed) {
        setBuilderTemplateValues(removed.values);
        setBuilderActiveVariantId(null);
      } else if (builderActiveVariantId === variantId) {
        setBuilderActiveVariantId(next[0]?.id ?? null);
      }
      return next;
    });
  };

  const updateTemplateVariantName = (variantId: string, value: string) => {
    setBuilderTemplateVariants((prev) =>
      prev.map((variant) =>
        variant.id === variantId ? { ...variant, name: value } : variant,
      ),
    );
  };

  const updateResponseHeader = (
    id: string,
    field: "key" | "value",
    value: string,
  ) => {
    setBuilderResponseHeaders((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const removeResponseHeader = (id: string) => {
    setBuilderResponseHeaders((prev) => prev.filter((item) => item.id !== id));
  };

  const openBuilderFromLog = (entry: RequestLogEntry) => {
    setBuilderName(`${entry.method} ${entry.path}`);
    setBuilderMethod(entry.method);
    setBuilderPath(entry.path);
    setBuilderDescription(`${entry.method} ${entry.path}`);
    setBuilderCategory("");
    setBuilderResponseTemplate(entry.response?.body ?? "");
    setBuilderResponseHeaders(
      Object.entries(entry.response?.headers ?? {}).map(
        ([key, value], index) => ({
          id: `header-${Date.now()}-${index}`,
          key,
          value,
        }),
      ),
    );
    setBuilderTemplateValues([]);
    setBuilderTemplateVariants([]);
    setBuilderActiveVariantId(null);
    setEditingBlockId(null);
    setIsBuilderOpen(true);
  };

  const editBlock = (blockId: string) => {
    const block = blockIndex.get(blockId);
    if (!block) {
      return;
    }
    setBuilderName(block.name);
    setBuilderMethod(block.method);
    setBuilderPath(block.path);
    setBuilderDescription(block.description);
    setBuilderCategory(block.category ?? "");
    setBuilderResponseTemplate(block.responseTemplate);
    setBuilderResponseHeaders(
      Object.entries(block.responseHeaders ?? {}).map(
        ([key, value], index) => ({
          id: `header-${Date.now()}-${index}`,
          key,
          value,
        }),
      ),
    );
    setBuilderTemplateValues(
      block.templateValues.map((item, index) => ({
        ...item,
        id: item.id || `template-${Date.now()}-${index}`,
      })),
    );
    setBuilderTemplateVariants(
      block.templateVariants.map((variant, variantIndex) => ({
        ...variant,
        id: variant.id || `variant-${Date.now()}-${variantIndex}`,
        values: variant.values.map((item, index) => ({
          ...item,
          id: item.id || `template-${Date.now()}-${variantIndex}-${index}`,
        })),
      })),
    );
    setBuilderActiveVariantId(
      block.activeVariantId ?? block.templateVariants[0]?.id ?? null,
    );
    setEditingBlockId(block.id);
    setIsBuilderOpen(true);
  };

  const setBlockActiveVariant = (blockId: string, variantId: string) => {
    if (!selectedProfile) {
      return;
    }
    const block = blockIndex.get(blockId);
    if (!block) {
      return;
    }
    const nextBlock = { ...block, activeVariantId: variantId };
    const updateList = (items: Block[]) =>
      items.map((item) => (item.id === blockId ? nextBlock : item));
    const nextLibrary = updateList(libraryBlocks);
    const nextActive = updateList(activeBlocks);
    setLibraryBlocksByProfile((prev) => ({
      ...prev,
      [selectedProfile]: nextLibrary,
    }));
    setActiveBlocksByProfile((prev) => ({
      ...prev,
      [selectedProfile]: nextActive,
    }));
    updateBlocks(selectedProfile, {
      libraryBlocks: nextLibrary,
      activeBlocks: nextActive,
      categories,
    }).catch((error) => {
      if (import.meta.env.DEV) {
        console.error("[blocks] failed to update variant", error);
      }
    });
  };

  const addCategory = (name: string) => {
    if (!selectedProfile) return;
    const trimmed = name.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    const nextCategories = [...categories, trimmed];
    setCategoriesByProfile((prev) => ({
      ...prev,
      [selectedProfile]: nextCategories,
    }));
    updateBlocks(selectedProfile, {
      libraryBlocks,
      activeBlocks,
      categories: nextCategories,
    }).catch((error) => {
      if (import.meta.env.DEV) {
        console.error("[blocks] failed to add category", error);
      }
    });
  };

  const renameCategory = (oldName: string, newName: string) => {
    if (!selectedProfile) return;
    const trimmed = newName.trim();
    if (!trimmed || (trimmed !== oldName && categories.includes(trimmed)))
      return;
    const nextCategories = categories.map((c) => (c === oldName ? trimmed : c));
    const updateBlockCategory = (block: Block) =>
      (block.category ?? "").trim() === oldName
        ? { ...block, category: trimmed }
        : block;
    const nextLibrary = libraryBlocks.map(updateBlockCategory);
    const nextActive = activeBlocks.map(updateBlockCategory);
    setCategoriesByProfile((prev) => ({
      ...prev,
      [selectedProfile]: nextCategories,
    }));
    setLibraryBlocksByProfile((prev) => ({
      ...prev,
      [selectedProfile]: nextLibrary,
    }));
    setActiveBlocksByProfile((prev) => ({
      ...prev,
      [selectedProfile]: nextActive,
    }));
    updateBlocks(selectedProfile, {
      libraryBlocks: nextLibrary,
      activeBlocks: nextActive,
      categories: nextCategories,
    }).catch((error) => {
      if (import.meta.env.DEV) {
        console.error("[blocks] failed to rename category", error);
      }
    });
  };

  const deleteCategory = (name: string) => {
    if (!selectedProfile) return;
    const nextCategories = categories.filter((c) => c !== name);
    const clearCategory = (block: Block) =>
      (block.category ?? "").trim() === name
        ? { ...block, category: "" }
        : block;
    const nextLibrary = libraryBlocks.map(clearCategory);
    const nextActive = activeBlocks.map(clearCategory);
    setCategoriesByProfile((prev) => ({
      ...prev,
      [selectedProfile]: nextCategories,
    }));
    setLibraryBlocksByProfile((prev) => ({
      ...prev,
      [selectedProfile]: nextLibrary,
    }));
    setActiveBlocksByProfile((prev) => ({
      ...prev,
      [selectedProfile]: nextActive,
    }));
    updateBlocks(selectedProfile, {
      libraryBlocks: nextLibrary,
      activeBlocks: nextActive,
      categories: nextCategories,
    }).catch((error) => {
      if (import.meta.env.DEV) {
        console.error("[blocks] failed to delete category", error);
      }
    });
  };

  const moveBlockToCategory = (blockId: string, category: string) => {
    if (!selectedProfile) return;
    const newCategory = category === "Uncategorized" ? "" : category;
    const block = blockIndex.get(blockId);
    if (!block) return;
    if ((block.category ?? "").trim() === newCategory.trim()) return;
    const updatedBlock = { ...block, category: newCategory };
    const updateList = (items: Block[]) =>
      items.map((item) => (item.id === blockId ? updatedBlock : item));
    const nextLibrary = updateList(libraryBlocks);
    const nextActive = updateList(activeBlocks);
    setLibraryBlocksByProfile((prev) => ({
      ...prev,
      [selectedProfile]: nextLibrary,
    }));
    setActiveBlocksByProfile((prev) => ({
      ...prev,
      [selectedProfile]: nextActive,
    }));
    updateBlocks(selectedProfile, {
      libraryBlocks: nextLibrary,
      activeBlocks: nextActive,
      categories,
    }).catch((error) => {
      if (import.meta.env.DEV) {
        console.error("[blocks] failed to move block to category", error);
      }
    });
  };

  const setBlockArrayItemEnabled = useCallback(
    (
      blockId: string,
      valueId: string,
      index: number,
      enabled: boolean,
    ) => {
      if (!selectedProfile) return;
      const block =
        libraryBlocks.find((b) => b.id === blockId) ??
        activeBlocks.find((b) => b.id === blockId);
      if (!block) return;
      const values =
        block.templateVariants.length > 0
          ? (() => {
              const variant =
                block.templateVariants.find(
                  (v) => v.id === block.activeVariantId,
                ) ?? block.templateVariants[0];
              return variant?.values ?? [];
            })()
          : block.templateValues;
      const item = values.find((v) => v.id === valueId);
      if (
        !item ||
        (item.valueType ?? "string") !== "array"
      ) {
        return;
      }
      const items = parseArrayItems(item.value);
      if (index < 0 || index >= items.length) return;
      const nextItems = [...items];
      nextItems[index] = { ...nextItems[index], e: enabled };
      const newValue = JSON.stringify(nextItems);
      const updatedValues = values.map((v) =>
        v.id === valueId ? { ...v, value: newValue } : v,
      );
      let updatedBlock: Block;
      if (block.templateVariants.length > 0) {
        const activeId =
          block.activeVariantId ?? block.templateVariants[0]?.id;
        updatedBlock = {
          ...block,
          templateVariants: block.templateVariants.map((v) =>
            v.id === activeId
              ? { ...v, values: updatedValues }
              : v,
          ),
        };
      } else {
        updatedBlock = { ...block, templateValues: updatedValues };
      }
      const nextLibrary = libraryBlocks.map((b) =>
        b.id === blockId ? updatedBlock : b,
      );
      const nextActive = activeBlocks.map((b) =>
        b.id === blockId ? updatedBlock : b,
      );
      setLibraryBlocksByProfile((prev) => ({
        ...prev,
        [selectedProfile]: nextLibrary,
      }));
      setActiveBlocksByProfile((prev) => ({
        ...prev,
        [selectedProfile]: nextActive,
      }));
      updateBlocks(selectedProfile, {
        libraryBlocks: nextLibrary,
        activeBlocks: nextActive,
        categories,
      }).catch((error) => {
        if (import.meta.env.DEV) {
          console.error("[blocks] failed to persist array toggle", error);
        }
      });
    },
    [
      selectedProfile,
      libraryBlocks,
      activeBlocks,
      categories,
    ],
  );

  const addLibraryBlockToActive = useCallback(
    (blockId: string) => {
      moveBlock(blockId, "library", "active");
    },
    [moveBlock],
  );

  const removeBlockFromActive = useCallback(
    (blockId: string) => {
      moveBlock(blockId, "active", "library");
    },
    [moveBlock],
  );

  const clearActiveBlocks = useCallback(() => {
    if (!selectedProfile || activeBlocks.length === 0) {
      return;
    }
    setActiveBlocksByProfile((prev) => ({
      ...prev,
      [selectedProfile]: [],
    }));
    updateBlocks(selectedProfile, {
      libraryBlocks,
      activeBlocks: [],
      categories,
    }).catch((error) => {
      if (import.meta.env.DEV) {
        console.error("[blocks] failed to clear active blocks", error);
      }
    });
  }, [selectedProfile, activeBlocks.length, libraryBlocks, categories]);

  return {
    libraryBlocks,
    activeBlocks,
    isBuilderOpen,
    builderName,
    builderMethod,
    builderPath,
    builderDescription,
    builderCategory,
    builderResponseTemplate,
    builderResponseHeaders,
    builderTemplateValues,
    builderTemplateVariants,
    builderActiveVariantId,
    isEditingBlock: editingBlockId !== null,
    setIsBuilderOpen,
    setBuilderName,
    setBuilderMethod,
    setBuilderPath,
    setBuilderDescription,
    setBuilderCategory,
    setBuilderResponseTemplate,
    setBuilderActiveVariantId,
    addTemplateVariant,
    removeTemplateVariant,
    updateTemplateVariantName,
    addResponseHeader,
    updateResponseHeader,
    removeResponseHeader,
    openBuilderFromLog,
    addTemplateValue,
    updateTemplateValue,
    removeTemplateValue,
    updateTemplateValueType,
    addArrayItem,
    updateArrayItem,
    removeArrayItem,
    setArrayItemEnabled,
    editBlock,
    setBlockActiveVariant,
    closeBuilder,
    handleCreateBlock,
    handleCreateAndReset,
    allowDrop,
    handleDragEnter,
    handleDragStart,
    handleDrop,
    handleDragEnd,
    handlePointerDown,
    removeLibraryBlock,
    clearActiveBlocks,
    replaceBlocksForProfile,
    categories,
    addCategory,
    renameCategory,
    deleteCategory,
    moveBlockToCategory,
    addLibraryBlockToActive,
    removeBlockFromActive,
    setBlockArrayItemEnabled,
  };
};

export default useBlocks;
