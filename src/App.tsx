import { useCallback, useEffect, useState } from "react";
import type { BlocksPayload } from "./api/blocks";
import { updateBlocks } from "./api/blocks";
import ActivePanel from "./components/blocks/ActivePanel";
import LibraryPanel from "./components/blocks/LibraryPanel";
import DebugPanel from "./components/debug/DebugPanel";
import LibraryExplorerPanel from "./components/library/LibraryExplorerPanel";
import Sidebar from "./components/layout/Sidebar";
import BlockBuilderModal from "./components/modals/BlockBuilderModal";
import CreateProfileModal from "./components/modals/CreateProfileModal";
import CreateSubprofileModal from "./components/modals/CreateSubprofileModal";
import EditSubprofileModal from "./components/modals/EditSubprofileModal";
import SettingsPanel from "./components/settings/SettingsPanel";
import useBlocks from "./hooks/useBlocks";
import useProfiles from "./hooks/useProfiles";
import useSubprofiles from "./hooks/useSubprofiles";
import type { Block } from "./types/block";

const useChooseFolder = () =>
  useCallback(async (): Promise<string | null> => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const result = await open({ directory: true, multiple: false });
      if (result == null) return null;
      return Array.isArray(result) ? result[0] ?? null : result;
    } catch {
      return null;
    }
  }, []);

const App = () => {
  const onChooseFolder = useChooseFolder();
  const [activeView, setActiveView] = useState<
    "builder" | "debug" | "settings" | "library"
  >("builder");
  const [selectedSubprofile, setSelectedSubprofile] = useState("");
  const [importBlocksMessage, setImportBlocksMessage] = useState<string | null>(
    null,
  );
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("theme");
    return saved === "light" ? "light" : "dark";
  });

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  const {
    profiles,
    setProfiles,
    selectedProfile,
    setSelectedProfile,
    activeProfileError,
    isSavingProfile,
    isUpdatingProfile,
    newProfileName,
    newProfileBaseUrl,
    newProfileParams,
    newProfileParamInput,
    editProfileName,
    editProfileBaseUrl,
    editProfileParams,
    editProfileParamInput,
    createProfileError,
    updateProfileError,
    isCreateProfileModalOpen,
    setIsCreateProfileModalOpen,
    setNewProfileName,
    setNewProfileBaseUrl,
    setNewProfileParams,
    setNewProfileParamInput,
    setEditProfileName,
    setEditProfileBaseUrl,
    setEditProfileParams,
    setEditProfileParamInput,
    openCreateProfileModal,
    handleAddProfile,
    handleUpdateProfile,
    handleDeleteProfile,
    addProfileParam,
    removeProfileParam,
    deleteProfileError,
    isDeletingProfile,
  } = useProfiles();

  const {
    isCreateSubprofileModalOpen,
    isEditSubprofileModalOpen,
    newSubprofileName,
    newSubprofileParamValue,
    newSubprofileParams,
    editSubprofileName,
    editSubprofileParamValue,
    editSubprofileParams,
    subprofileProfileName,
    subprofileValueByKey,
    createSubprofileError,
    updateSubprofileError,
    isSavingSubprofile,
    isUpdatingSubprofile,
    setIsCreateSubprofileModalOpen,
    setIsEditSubprofileModalOpen,
    setNewSubprofileName,
    setNewSubprofileParamValue,
    setNewSubprofileParams,
    setEditSubprofileName,
    setEditSubprofileParamValue,
    setEditSubprofileParams,
    openCreateSubprofileModal,
    openEditSubprofileModal,
    addSubprofileParam,
    removeSubprofileParam,
    updateSubprofileValueForKey,
    handleCreateSubprofile,
    handleUpdateSubprofile,
    deleteSubprofile,
  } = useSubprofiles({ profiles, selectedProfile, setProfiles });

  const {
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
    builderTemplateVariants,
    builderActiveVariantId,
    isEditingBlock,
    setIsBuilderOpen,
    setBuilderName,
    setBuilderMethod,
    setBuilderPath,
    setBuilderDescription,
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
    replaceBlocksForProfile,
    editBlock,
    removeBlockFromActive,
    clearActiveBlocks,
    setBlockActiveVariant,
    categories,
    addCategory,
    renameCategory,
    deleteCategory,
    moveBlockToCategory,
    addLibraryBlockToActive,
    setBlockArrayItemEnabled,
    libraries,
    addLibrary,
    deleteLibrary,
  } = useBlocks({ profiles, selectedProfile });

  useEffect(() => {
    const profileData = profiles.find((p) => p.name === selectedProfile);
    const subs = profileData?.subProfiles ?? [];
    if (subs.length === 0) {
      setSelectedSubprofile("");
    } else if (!subs.some((s) => s.name === selectedSubprofile)) {
      setSelectedSubprofile(subs[0]?.name ?? "");
    }
  }, [profiles, selectedProfile, selectedSubprofile]);

  const handleExportBlocks = useCallback(() => {
    if (!selectedProfile) return;
    const payload = { libraryBlocks: libraryBlocks };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `local-proxy-library-${selectedProfile}-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selectedProfile, libraryBlocks]);

  const handleExportBlock = useCallback((block: Block) => {
    const payload = { libraryBlocks: [block], activeBlocks: [] };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const sanitized = block.name.replace(/[^a-zA-Z0-9-_]/g, "-");
    a.download = `local-proxy-block-${sanitized}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  function isValidBlocksPayload(
    payload: unknown,
  ): payload is { libraryBlocks: unknown[]; activeBlocks?: unknown[] } {
    if (typeof payload !== "object" || payload === null) return false;
    const p = payload as Record<string, unknown>;
    return Array.isArray(p.libraryBlocks);
  }

  function isBlockLike(item: unknown): item is Record<string, unknown> {
    if (typeof item !== "object" || item === null) return false;
    const o = item as Record<string, unknown>;
    return (
      typeof o.id === "string" &&
      typeof o.name === "string" &&
      typeof o.method === "string" &&
      typeof o.path === "string"
    );
  }

  const handleImportBlocks = useCallback(
    async (file: File) => {
      if (!selectedProfile) {
        setImportBlocksMessage("No profile selected.");
        return;
      }
      setImportBlocksMessage(null);
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as unknown;
        if (!isValidBlocksPayload(parsed)) {
          setImportBlocksMessage("Invalid blocks file: missing libraryBlocks.");
          return;
        }
        if (!parsed.libraryBlocks.every(isBlockLike)) {
          setImportBlocksMessage(
            "Invalid blocks file: each block must have id, name, method, and path.",
          );
          return;
        }
        const library = parsed.libraryBlocks as BlocksPayload["libraryBlocks"];
        await updateBlocks(selectedProfile, {
          libraryBlocks: library,
          activeBlocks: activeBlocks,
        });
        replaceBlocksForProfile(selectedProfile, library, activeBlocks);
        setImportBlocksMessage("Import successful.");
        setTimeout(() => setImportBlocksMessage(null), 3000);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Import failed.";
        setImportBlocksMessage(
          err instanceof SyntaxError
            ? "Invalid blocks file: invalid JSON."
            : message,
        );
      }
    },
    [selectedProfile, activeBlocks, replaceBlocksForProfile],
  );

  return (
    <div className="app">
      <Sidebar
        profiles={profiles}
        selectedProfile={selectedProfile}
        selectedSubprofile={selectedSubprofile}
        activeProfileError={activeProfileError}
        activeView={activeView}
        theme={theme}
        onSelectProfile={setSelectedProfile}
        onSelectSubprofile={setSelectedSubprofile}
        onChangeView={setActiveView}
        onCreateProfile={openCreateProfileModal}
        onToggleTheme={() =>
          setTheme((current) => (current === "dark" ? "light" : "dark"))
        }
      />

      <main
        className={`main ${activeView !== "builder" ? "main--single" : ""}`}
      >
        {activeView === "debug" ? (
          <DebugPanel onCreateBlockFromLog={openBuilderFromLog} />
        ) : activeView === "library" ? (
          <LibraryExplorerPanel
            profileName={selectedProfile ?? null}
            blocks={libraryBlocks}
            categories={categories}
            libraries={libraries}
            onCreateBlock={() => setIsBuilderOpen(true)}
            onImportBlocks={handleImportBlocks}
            importBlocksMessage={importBlocksMessage}
            onEditBlock={editBlock}
            onDeleteBlock={removeLibraryBlock}
            onExportBlock={handleExportBlock}
            onAddToActive={addLibraryBlockToActive}
            onSelectVariant={setBlockActiveVariant}
            onSetBlockArrayItemEnabled={setBlockArrayItemEnabled}
          />
        ) : activeView === "settings" ? (
          <SettingsPanel
            profiles={profiles}
            selectedProfile={selectedProfile}
            editProfileName={editProfileName}
            editProfileBaseUrl={editProfileBaseUrl}
            editProfileParams={editProfileParams}
            editProfileParamInput={editProfileParamInput}
            isUpdatingProfile={isUpdatingProfile}
            updateProfileError={updateProfileError}
            onChangeName={setEditProfileName}
            onChangeBaseUrl={setEditProfileBaseUrl}
            onChangeParamInput={setEditProfileParamInput}
            onAddParam={() =>
              addProfileParam(
                editProfileParamInput,
                setEditProfileParams,
                setEditProfileParamInput,
              )
            }
            onRemoveParam={(value: string) =>
              removeProfileParam(value, setEditProfileParams)
            }
            onSave={handleUpdateProfile}
            onAddSubprofile={openCreateSubprofileModal}
            onEditSubprofile={openEditSubprofileModal}
            onDeleteSubprofile={async (profileName, subprofileName) => {
              await deleteSubprofile(profileName, subprofileName);
              if (
                selectedProfile === profileName &&
                selectedSubprofile === subprofileName
              ) {
                setSelectedSubprofile("");
              }
            }}
            onExportBlocks={handleExportBlocks}
            onImportBlocks={handleImportBlocks}
            importBlocksMessage={importBlocksMessage}
            libraries={libraries}
            onAddLibrary={addLibrary}
            onDeleteLibrary={deleteLibrary}
            onDeleteProfile={handleDeleteProfile}
            deleteProfileError={deleteProfileError}
            isDeletingProfile={isDeletingProfile}
            onChooseFolder={onChooseFolder}
          />
        ) : (
          <>
            <LibraryPanel
              blocks={libraryBlocks}
              categories={categories}
              libraries={libraries}
              onCreateBlock={() => setIsBuilderOpen(true)}
              onImportBlocks={handleImportBlocks}
              importBlocksMessage={importBlocksMessage}
              onDragOver={allowDrop}
              onDragEnter={handleDragEnter}
              onDrop={handleDrop("library")}
              onDragStart={(blockId) => handleDragStart(blockId, "library")}
              onDragEnd={handleDragEnd}
              onPointerDown={(blockId) => handlePointerDown(blockId, "library")}
              onDeleteBlock={removeLibraryBlock}
              onEditBlock={editBlock}
              onExportBlock={handleExportBlock}
              onSelectVariant={setBlockActiveVariant}
              onSetBlockArrayItemEnabled={setBlockArrayItemEnabled}
              onAddCategory={addCategory}
              onRenameCategory={renameCategory}
              onDeleteCategory={deleteCategory}
              onMoveBlockToCategory={moveBlockToCategory}
            />
            <ActivePanel
              blocks={activeBlocks}
              onDragOver={allowDrop}
              onDragEnter={handleDragEnter}
              onDropActive={handleDrop("active")}
              onDropLibrary={handleDrop("library")}
              onDragStart={(blockId) => handleDragStart(blockId, "active")}
              onDragEnd={handleDragEnd}
              onPointerDown={(blockId) => handlePointerDown(blockId, "active")}
              onRemoveFromActive={removeBlockFromActive}
              onClearActive={clearActiveBlocks}
              onSelectVariant={setBlockActiveVariant}
              onSetBlockArrayItemEnabled={setBlockArrayItemEnabled}
            />
          </>
        )}
      </main>

      <BlockBuilderModal
        isOpen={isBuilderOpen}
        isEditing={isEditingBlock}
        builderName={builderName}
        builderMethod={builderMethod}
        builderPath={builderPath}
        builderDescription={builderDescription}
        builderResponseTemplate={builderResponseTemplate}
        builderResponseHeaders={builderResponseHeaders}
        builderTemplateValues={builderTemplateValues}
        builderTemplateVariants={builderTemplateVariants}
        builderActiveVariantId={builderActiveVariantId}
        onClose={closeBuilder}
        onSubmit={handleCreateBlock}
        onSaveAndCreateAnother={handleCreateAndReset}
        onChangeName={setBuilderName}
        onChangeMethod={setBuilderMethod}
        onChangePath={setBuilderPath}
        onChangeDescription={setBuilderDescription}
        onChangeResponseTemplate={setBuilderResponseTemplate}
        onSelectTemplateVariant={setBuilderActiveVariantId}
        onAddTemplateVariant={addTemplateVariant}
        onRemoveTemplateVariant={removeTemplateVariant}
        onUpdateTemplateVariantName={updateTemplateVariantName}
        onAddResponseHeader={addResponseHeader}
        onUpdateResponseHeader={updateResponseHeader}
        onRemoveResponseHeader={removeResponseHeader}
        onAddTemplateValue={addTemplateValue}
        onUpdateTemplateValue={updateTemplateValue}
        onRemoveTemplateValue={removeTemplateValue}
        onUpdateTemplateValueType={updateTemplateValueType}
        onAddArrayItem={addArrayItem}
        onUpdateArrayItem={updateArrayItem}
        onRemoveArrayItem={removeArrayItem}
        onSetArrayItemEnabled={setArrayItemEnabled}
      />

      <CreateProfileModal
        isOpen={isCreateProfileModalOpen}
        name={newProfileName}
        baseUrl={newProfileBaseUrl}
        params={newProfileParams}
        paramInput={newProfileParamInput}
        isSubmitting={isSavingProfile}
        errorMessage={createProfileError}
        onClose={() => setIsCreateProfileModalOpen(false)}
        onSubmit={handleAddProfile}
        onChangeName={setNewProfileName}
        onChangeBaseUrl={setNewProfileBaseUrl}
        onChangeParamInput={setNewProfileParamInput}
        onAddParam={() =>
          addProfileParam(
            newProfileParamInput,
            setNewProfileParams,
            setNewProfileParamInput,
          )
        }
        onRemoveParam={(value: string) =>
          removeProfileParam(value, setNewProfileParams)
        }
      />

      <CreateSubprofileModal
        isOpen={isCreateSubprofileModalOpen}
        name={newSubprofileName}
        params={newSubprofileParams}
        requiredKeys={
          profiles.find((item) => item.name === selectedProfile)?.params ?? []
        }
        valueByKey={subprofileValueByKey}
        paramValueInput={newSubprofileParamValue}
        isSubmitting={isSavingSubprofile}
        errorMessage={createSubprofileError}
        onClose={() => setIsCreateSubprofileModalOpen(false)}
        onSubmit={handleCreateSubprofile}
        onChangeName={setNewSubprofileName}
        onChangeValueForKey={updateSubprofileValueForKey}
        onChangeParamValue={setNewSubprofileParamValue}
        onAddExtraParam={() =>
          addSubprofileParam(
            newSubprofileParamValue,
            setNewSubprofileParams,
            setNewSubprofileParamValue,
          )
        }
        onRemoveExtraParam={(key: string) =>
          removeSubprofileParam(key, setNewSubprofileParams)
        }
      />

      <EditSubprofileModal
        isOpen={isEditSubprofileModalOpen}
        name={editSubprofileName}
        params={editSubprofileParams}
        requiredKeys={
          profiles.find((item) => item.name === subprofileProfileName)
            ?.params ?? []
        }
        valueByKey={subprofileValueByKey}
        paramValueInput={editSubprofileParamValue}
        isSubmitting={isUpdatingSubprofile}
        errorMessage={updateSubprofileError}
        onClose={() => setIsEditSubprofileModalOpen(false)}
        onSubmit={handleUpdateSubprofile}
        onChangeName={setEditSubprofileName}
        onChangeValueForKey={updateSubprofileValueForKey}
        onChangeParamValue={setEditSubprofileParamValue}
        onAddExtraParam={() =>
          addSubprofileParam(
            editSubprofileParamValue,
            setEditSubprofileParams,
            setEditSubprofileParamValue,
          )
        }
        onRemoveExtraParam={(key: string) =>
          removeSubprofileParam(key, setEditSubprofileParams)
        }
      />
    </div>
  );
};

export default App;
