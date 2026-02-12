import type { DragEvent, FormEvent, PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { initialLibrary } from "../data/initialData";
import type { Block } from "../types/block";
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
  builderTemplateValues: { id: string; key: string; value: string }[];
  setIsBuilderOpen: (isOpen: boolean) => void;
  setBuilderName: (value: string) => void;
  setBuilderMethod: (value: string) => void;
  setBuilderPath: (value: string) => void;
  setBuilderDescription: (value: string) => void;
  setBuilderResponseTemplate: (value: string) => void;
  addTemplateValue: () => void;
  updateTemplateValue: (id: string, field: "key" | "value", value: string) => void;
  removeTemplateValue: (id: string) => void;
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
  const [builderTemplateValues, setBuilderTemplateValues] = useState<
    { id: string; key: string; value: string }[]
  >([]);
  const dragRef = useRef<{ blockId: string; source: "library" | "active" } | null>(
    null
  );
  const pointerPosRef = useRef<{ x: number; y: number } | null>(null);

  const createSeedLibrary = () =>
    initialLibrary.map((block) => ({
      ...block,
      templateValues: [...block.templateValues],
    }));

  useEffect(() => {
    if (profiles.length === 0) {
      return;
    }
    setLibraryBlocksByProfile((prev) => {
      const next = { ...prev };
      profiles.forEach((profile) => {
        if (!next[profile.name]) {
          next[profile.name] = createSeedLibrary();
        }
      });
      return next;
    });
    setActiveBlocksByProfile((prev) => {
      const next = { ...prev };
      profiles.forEach((profile) => {
        if (!next[profile.name]) {
          next[profile.name] = [];
        }
      });
      return next;
    });
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

      if (destination === "active") {
        setLibraryBlocksByProfile((prev) => ({
          ...prev,
          [selectedProfile]: (prev[selectedProfile] ?? []).filter(
            (item) => item.id !== blockId
          ),
        }));
        setActiveBlocksByProfile((prev) => ({
          ...prev,
          [selectedProfile]: [...(prev[selectedProfile] ?? []), block],
        }));
      } else {
        setActiveBlocksByProfile((prev) => ({
          ...prev,
          [selectedProfile]: (prev[selectedProfile] ?? []).filter(
            (item) => item.id !== blockId
          ),
        }));
        setLibraryBlocksByProfile((prev) => ({
          ...prev,
          [selectedProfile]: [...(prev[selectedProfile] ?? []), block],
        }));
      }
    },
    [blockIndex, selectedProfile]
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

  const resetBuilder = () => {
    setBuilderName("");
    setBuilderMethod("GET");
    setBuilderPath("/api/");
    setBuilderDescription("");
    setBuilderResponseTemplate("");
    setBuilderTemplateValues([]);
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

    const nextBlock: Block = {
      id: `block-${Date.now()}`,
      name: trimmedName,
      method: builderMethod,
      description: `${builderMethod} ${trimmedPath}`,
      responseTemplate: builderResponseTemplate.trim(),
      templateValues: builderTemplateValues
        .map((item) => ({
          ...item,
          key: item.key.trim(),
          value: item.value.trim(),
        }))
        .filter((item) => item.key.length > 0),
    };

    if (builderDescription.trim()) {
      nextBlock.description = builderDescription.trim();
    }

    setLibraryBlocksByProfile((prev) => ({
      ...prev,
      [selectedProfile]: [...(prev[selectedProfile] ?? []), nextBlock],
    }));
    closeBuilder();
  };

  const addTemplateValue = () => {
    setBuilderTemplateValues((prev) => [
      ...prev,
      { id: `template-${Date.now()}-${prev.length}`, key: "", value: "" },
    ]);
  };

  const updateTemplateValue = (id: string, field: "key" | "value", value: string) => {
    setBuilderTemplateValues((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const removeTemplateValue = (id: string) => {
    setBuilderTemplateValues((prev) => prev.filter((item) => item.id !== id));
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
    builderTemplateValues,
    setIsBuilderOpen,
    setBuilderName,
    setBuilderMethod,
    setBuilderPath,
    setBuilderDescription,
    setBuilderResponseTemplate,
    addTemplateValue,
    updateTemplateValue,
    removeTemplateValue,
    closeBuilder,
    handleCreateBlock,
    allowDrop,
    handleDragEnter,
    handleDragStart,
    handleDrop,
    handleDragEnd,
    handlePointerDown,
  };
};

export default useBlocks;
