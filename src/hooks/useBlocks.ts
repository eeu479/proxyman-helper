import type { DragEvent, FormEvent, PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchBlocks, updateBlocks } from "../api/blocks";
import { initialLibrary } from "../data/initialData";
import type { Block } from "../types/block";
import type { RequestLogEntry } from "../api/logs";
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
  builderResponseTemplate: string;
  builderResponseHeaders: { id: string; key: string; value: string }[];
  builderTemplateValues: { id: string; key: string; value: string }[];
  isEditingBlock: boolean;
  setIsBuilderOpen: (isOpen: boolean) => void;
  setBuilderName: (value: string) => void;
  setBuilderMethod: (value: string) => void;
  setBuilderPath: (value: string) => void;
  setBuilderDescription: (value: string) => void;
  setBuilderResponseTemplate: (value: string) => void;
  addResponseHeader: (key?: string, value?: string) => void;
  updateResponseHeader: (id: string, field: "key" | "value", value: string) => void;
  removeResponseHeader: (id: string) => void;
  openBuilderFromLog: (entry: RequestLogEntry) => void;
  addTemplateValue: (key?: string, value?: string) => void;
  updateTemplateValue: (id: string, field: "key" | "value", value: string) => void;
  removeTemplateValue: (id: string) => void;
  editBlock: (blockId: string) => void;
  closeBuilder: () => void;
  handleCreateBlock: (event: FormEvent<HTMLFormElement>) => void;
  allowDrop: (event: DragEvent<HTMLDivElement>) => void;
  handleDragEnter: (event: DragEvent<HTMLDivElement>) => void;
  handleDragStart: (
    blockId: string,
    source: "library" | "active"
  ) => (event: DragEvent<HTMLDivElement>) => void;
  handleDrop: (
    destination: "library" | "active"
  ) => (event: DragEvent<HTMLDivElement>) => void;
  handleDragEnd: () => void;
  handlePointerDown: (
    blockId: string,
    source: "library" | "active"
  ) => (event: ReactPointerEvent<HTMLDivElement>) => void;
  removeLibraryBlock: (blockId: string) => void;
};

const useBlocks = ({ profiles, selectedProfile }: UseBlocksParams): UseBlocksReturn => {
  const [libraryBlocksByProfile, setLibraryBlocksByProfile] = useState<
    Record<string, Block[]>
  >({});
  const [activeBlocksByProfile, setActiveBlocksByProfile] = useState<
    Record<string, Block[]>
  >({});
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [builderName, setBuilderName] = useState("");
  const [builderMethod, setBuilderMethod] = useState("GET");
  const [builderPath, setBuilderPath] = useState("/api/");
  const [builderDescription, setBuilderDescription] = useState("");
  const [builderResponseTemplate, setBuilderResponseTemplate] = useState("");
  const [builderResponseHeaders, setBuilderResponseHeaders] = useState<
    { id: string; key: string; value: string }[]
  >([]);
  const [builderTemplateValues, setBuilderTemplateValues] = useState<
    { id: string; key: string; value: string }[]
  >([]);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const dragRef = useRef<{ blockId: string; source: "library" | "active" } | null>(
    null
  );
  const pointerPosRef = useRef<{ x: number; y: number } | null>(null);

  const createSeedLibrary = () =>
    initialLibrary.map((block) => ({
      ...block,
      templateValues: [...block.templateValues],
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
              console.error("[blocks] failed to load blocks", profile.name, error);
            }
            return { name: profile.name, blocks: null };
          }
        })
      );

      if (!isActive) {
        return;
      }

      setLibraryBlocksByProfile((prev) => {
        const next = { ...prev };
        entries.forEach(({ name, blocks }) => {
          if (blocks) {
            if (blocks.libraryBlocks.length === 0 && blocks.activeBlocks.length === 0) {
              next[name] = createSeedLibrary();
            } else {
              next[name] = blocks.libraryBlocks;
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
            if (blocks.libraryBlocks.length === 0 && blocks.activeBlocks.length === 0) {
              next[name] = [];
            } else {
              next[name] = blocks.activeBlocks;
            }
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
          if (blocks.libraryBlocks.length === 0 && blocks.activeBlocks.length === 0) {
            const seed = createSeedLibrary();
            try {
              await updateBlocks(name, { libraryBlocks: seed, activeBlocks: [] });
            } catch (error) {
              if (import.meta.env.DEV) {
                console.error("[blocks] failed to seed blocks", name, error);
              }
            }
          }
        })
      );
    };

    loadBlocks();

    return () => {
      isActive = false;
    };
  }, [profiles]);

  const libraryBlocks = libraryBlocksByProfile[selectedProfile] ?? [];
  const activeBlocks = activeBlocksByProfile[selectedProfile] ?? [];

  const blockIndex = useMemo(() => {
    return new Map(
      [...libraryBlocks, ...activeBlocks].map((block) => [block.id, block])
    );
  }, [libraryBlocks, activeBlocks]);

  const moveBlock = useCallback(
    (
      blockId: string | undefined,
      source: "library" | "active" | undefined,
      destination: "library" | "active"
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
          : [...libraryBlocks, block];
      const nextActive =
        destination === "active"
          ? [...activeBlocks, block]
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
      }).catch((error) => {
        if (import.meta.env.DEV) {
          console.error("[blocks] failed to persist move", error);
        }
      });
    },
    [blockIndex, selectedProfile, libraryBlocks, activeBlocks]
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
        JSON.stringify({ blockId, source })
      );
      event.dataTransfer.setData("text", JSON.stringify({ blockId, source }));
      event.dataTransfer.setData(
        "application/json",
        JSON.stringify({ blockId, source })
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
      console.log("[drag] allowDrop", { types: Array.from(event.dataTransfer.types) });
    }
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (import.meta.env.DEV) {
      console.log("[drag] enter", { types: Array.from(event.dataTransfer.types) });
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
    }).catch((error) => {
      if (import.meta.env.DEV) {
        console.error("[blocks] failed to delete block", error);
      }
    });
  };

  const resetBuilder = () => {
    setBuilderName("");
    setBuilderMethod("GET");
    setBuilderPath("/api/");
    setBuilderDescription("");
    setBuilderResponseTemplate("");
    setBuilderResponseHeaders([]);
    setBuilderTemplateValues([]);
    setEditingBlockId(null);
  };

  const closeBuilder = () => {
    setIsBuilderOpen(false);
    resetBuilder();
  };

  const handleCreateBlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProfile) {
      return;
    }
    const trimmedName = builderName.trim();
    const trimmedPath = builderPath.trim();
    if (!trimmedName || !trimmedPath) {
      return;
    }

    const responseHeaders = builderResponseHeaders.reduce<Record<string, string>>((acc, item) => {
      const key = item.key.trim();
      if (!key) {
        return acc;
      }
      acc[key] = item.value.trim();
      return acc;
    }, {});
    const templateValues = builderTemplateValues
      .map((item) => ({
        ...item,
        key: item.key.trim(),
        value: item.value.trim(),
      }))
      .filter((item) => item.key.length > 0);

    const nextBlock: Block = {
      id: editingBlockId ?? `block-${Date.now()}`,
      name: trimmedName,
      method: builderMethod,
      path: trimmedPath,
      description: `${builderMethod} ${trimmedPath}`,
      responseTemplate: builderResponseTemplate.trim(),
      responseHeaders,
      templateValues,
    };

    if (builderDescription.trim()) {
      nextBlock.description = builderDescription.trim();
    }

    const updateList = (items: Block[]) =>
      items.some((block) => block.id === nextBlock.id)
        ? items.map((block) => (block.id === nextBlock.id ? nextBlock : block))
        : [...items, nextBlock];
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
    }).catch((error) => {
      if (import.meta.env.DEV) {
        console.error("[blocks] failed to persist block", error);
      }
    });
    closeBuilder();
  };

  const addTemplateValue = (key = "", value = "") => {
    setBuilderTemplateValues((prev) => [
      ...prev,
      { id: `template-${Date.now()}-${prev.length}`, key, value },
    ]);
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
    setBuilderTemplateValues((prev) => {
      const existing = new Set(prev.map((item) => item.key));
      const missing = extractTemplateKeys(builderResponseTemplate).filter(
        (key) => !existing.has(key)
      );
      if (missing.length === 0) {
        return prev;
      }
      const timestamp = Date.now();
      const additions = missing.map((key, index) => ({
        id: `template-${timestamp}-${prev.length + index}`,
        key,
        value: "",
      }));
      return [...prev, ...additions];
    });
  }, [builderResponseTemplate]);

  const updateTemplateValue = (id: string, field: "key" | "value", value: string) => {
    setBuilderTemplateValues((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const removeTemplateValue = (id: string) => {
    setBuilderTemplateValues((prev) => prev.filter((item) => item.id !== id));
  };

  const updateResponseHeader = (id: string, field: "key" | "value", value: string) => {
    setBuilderResponseHeaders((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
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
    setBuilderResponseTemplate(entry.response?.body ?? "");
    setBuilderResponseHeaders(
      Object.entries(entry.response?.headers ?? {}).map(([key, value], index) => ({
        id: `header-${Date.now()}-${index}`,
        key,
        value,
      }))
    );
    setBuilderTemplateValues([]);
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
    setBuilderResponseTemplate(block.responseTemplate);
    setBuilderResponseHeaders(
      Object.entries(block.responseHeaders ?? {}).map(([key, value], index) => ({
        id: `header-${Date.now()}-${index}`,
        key,
        value,
      }))
    );
    setBuilderTemplateValues(
      block.templateValues.map((item, index) => ({
        ...item,
        id: item.id || `template-${Date.now()}-${index}`,
      }))
    );
    setEditingBlockId(block.id);
    setIsBuilderOpen(true);
  };

  return {
    libraryBlocks,
    activeBlocks,
    isBuilderOpen,
    builderName,
    builderMethod,
    builderPath,
    builderDescription,
    builderResponseTemplate,
    builderResponseHeaders,
    builderTemplateValues,
    isEditingBlock: editingBlockId !== null,
    setIsBuilderOpen,
    setBuilderName,
    setBuilderMethod,
    setBuilderPath,
    setBuilderDescription,
    setBuilderResponseTemplate,
    addResponseHeader,
    updateResponseHeader,
    removeResponseHeader,
    openBuilderFromLog,
    addTemplateValue,
    updateTemplateValue,
    removeTemplateValue,
    editBlock,
    closeBuilder,
    handleCreateBlock,
    allowDrop,
    handleDragEnter,
    handleDragStart,
    handleDrop,
    handleDragEnd,
    handlePointerDown,
    removeLibraryBlock,
  };
};

export default useBlocks;
