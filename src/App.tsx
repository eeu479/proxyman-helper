import { useEffect, useState } from "react";
import ActivePanel from "./components/blocks/ActivePanel";
import LibraryPanel from "./components/blocks/LibraryPanel";
import DebugPanel from "./components/debug/DebugPanel";
import Sidebar from "./components/layout/Sidebar";
import BlockBuilderModal from "./components/modals/BlockBuilderModal";
import CreateProfileModal from "./components/modals/CreateProfileModal";
import CreateSubprofileModal from "./components/modals/CreateSubprofileModal";
import EditSubprofileModal from "./components/modals/EditSubprofileModal";
import SettingsPanel from "./components/settings/SettingsPanel";
import useBlocks from "./hooks/useBlocks";
import useProfiles from "./hooks/useProfiles";
import useSubprofiles from "./hooks/useSubprofiles";

const App = () => {
  const [activeView, setActiveView] = useState<"builder" | "debug" | "settings">(
    "builder"
  );
  const [selectedSubprofile, setSelectedSubprofile] = useState("");
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
    addProfileParam,
    removeProfileParam,
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
    closeBuilder,
    handleCreateBlock,
    allowDrop,
    handleDragEnter,
    handleDragStart,
    handleDrop,
    handleDragEnd,
    handlePointerDown,
    removeLibraryBlock,
    editBlock,
    setBlockActiveVariant,
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

      <main className={`main ${activeView !== "builder" ? "main--single" : ""}`}>
        {activeView === "debug" ? (
          <DebugPanel onCreateBlockFromLog={openBuilderFromLog} />
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
                setEditProfileParamInput
              )
            }
            onRemoveParam={(value: string) =>
              removeProfileParam(value, setEditProfileParams)
            }
            onSave={handleUpdateProfile}
            onAddSubprofile={openCreateSubprofileModal}
            onEditSubprofile={openEditSubprofileModal}
          />
        ) : (
          <>
            <LibraryPanel
              blocks={libraryBlocks}
              onCreateBlock={() => setIsBuilderOpen(true)}
              onDragOver={allowDrop}
              onDragEnter={handleDragEnter}
              onDrop={handleDrop("library")}
              onDragStart={(blockId) => handleDragStart(blockId, "library")}
              onDragEnd={handleDragEnd}
              onPointerDown={(blockId) => handlePointerDown(blockId, "library")}
              onDeleteBlock={removeLibraryBlock}
              onEditBlock={editBlock}
              onSelectVariant={setBlockActiveVariant}
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
              onEditBlock={editBlock}
              onSelectVariant={setBlockActiveVariant}
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
          addProfileParam(newProfileParamInput, setNewProfileParams, setNewProfileParamInput)
        }
        onRemoveParam={(value: string) => removeProfileParam(value, setNewProfileParams)}
      />

      <CreateSubprofileModal
        isOpen={isCreateSubprofileModalOpen}
        name={newSubprofileName}
        params={newSubprofileParams}
        requiredKeys={profiles.find((item) => item.name === selectedProfile)?.params ?? []}
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
            setNewSubprofileParamValue
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
          profiles.find((item) => item.name === subprofileProfileName)?.params ?? []
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
            setEditSubprofileParamValue
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
