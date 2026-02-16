import { useState } from "react";
import ActivePanel from "./components/blocks/ActivePanel";
import LibraryPanel from "./components/blocks/LibraryPanel";
import DebugPanel from "./components/debug/DebugPanel";
import Sidebar from "./components/layout/Sidebar";
import BlockBuilderModal from "./components/modals/BlockBuilderModal";
import CreateProfileModal from "./components/modals/CreateProfileModal";
import EditProfileModal from "./components/modals/EditProfileModal";
import ManageProfilesModal from "./components/modals/ManageProfilesModal";
import CreateSubprofileModal from "./components/modals/CreateSubprofileModal";
import EditSubprofileModal from "./components/modals/EditSubprofileModal";
import ManageSubprofilesModal from "./components/modals/ManageSubprofilesModal";
import useBlocks from "./hooks/useBlocks";
import useProfiles from "./hooks/useProfiles";
import useSubprofiles from "./hooks/useSubprofiles";

const App = () => {
  const [activeView, setActiveView] = useState<"builder" | "debug">("builder");
  const {
    profiles,
    setProfiles,
    selectedProfile,
    setSelectedProfile,
    profilesError,
    activeProfileError,
    isLoadingProfiles,
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
    isManageProfilesModalOpen,
    isCreateProfileModalOpen,
    isEditProfileModalOpen,
    setIsManageProfilesModalOpen,
    setIsCreateProfileModalOpen,
    setIsEditProfileModalOpen,
    setNewProfileName,
    setNewProfileBaseUrl,
    setNewProfileParams,
    setNewProfileParamInput,
    setEditProfileName,
    setEditProfileBaseUrl,
    setEditProfileParams,
    setEditProfileParamInput,
    openCreateProfileModal,
    openEditProfileModal,
    handleAddProfile,
    handleUpdateProfile,
    addProfileParam,
    removeProfileParam,
  } = useProfiles();

  const {
    isManageSubprofilesModalOpen,
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
    setIsManageSubprofilesModalOpen,
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
    closeBuilder,
    handleCreateBlock,
    allowDrop,
    handleDragEnter,
    handleDragStart,
    handleDrop,
    handleDragEnd,
    handlePointerDown,
    removeLibraryBlock,
  } = useBlocks({ profiles, selectedProfile });


  return (
    <div className="app">
      <Sidebar
        profiles={profiles}
        selectedProfile={selectedProfile}
        activeProfileError={activeProfileError}
        activeView={activeView}
        onSelectProfile={setSelectedProfile}
        onChangeView={setActiveView}
        onManageProfiles={() => setIsManageProfilesModalOpen(true)}
        onManageSubprofiles={() => setIsManageSubprofilesModalOpen(true)}
      />

      <main className={`main ${activeView === "debug" ? "main--single" : ""}`}>
        {activeView === "debug" ? (
          <DebugPanel onCreateBlockFromLog={openBuilderFromLog} />
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
            />
          </>
        )}
      </main>
      <BlockBuilderModal
        isOpen={isBuilderOpen}
        builderName={builderName}
        builderMethod={builderMethod}
        builderPath={builderPath}
        builderDescription={builderDescription}
        builderResponseTemplate={builderResponseTemplate}
        builderResponseHeaders={builderResponseHeaders}
        builderTemplateValues={builderTemplateValues}
        onClose={closeBuilder}
        onSubmit={handleCreateBlock}
        onChangeName={setBuilderName}
        onChangeMethod={setBuilderMethod}
        onChangePath={setBuilderPath}
        onChangeDescription={setBuilderDescription}
        onChangeResponseTemplate={setBuilderResponseTemplate}
        onAddResponseHeader={addResponseHeader}
        onUpdateResponseHeader={updateResponseHeader}
        onRemoveResponseHeader={removeResponseHeader}
        onAddTemplateValue={addTemplateValue}
        onUpdateTemplateValue={updateTemplateValue}
        onRemoveTemplateValue={removeTemplateValue}
      />
      <ManageProfilesModal
        isOpen={isManageProfilesModalOpen}
        profiles={profiles}
        isLoading={isLoadingProfiles}
        errorMessage={profilesError}
        onClose={() => setIsManageProfilesModalOpen(false)}
        onCreate={openCreateProfileModal}
        onEdit={openEditProfileModal}
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
      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        name={editProfileName}
        baseUrl={editProfileBaseUrl}
        params={editProfileParams}
        paramInput={editProfileParamInput}
        isSubmitting={isUpdatingProfile}
        errorMessage={updateProfileError}
        onClose={() => setIsEditProfileModalOpen(false)}
        onSubmit={handleUpdateProfile}
        onChangeName={setEditProfileName}
        onChangeBaseUrl={setEditProfileBaseUrl}
        onChangeParamInput={setEditProfileParamInput}
        onAddParam={() =>
          addProfileParam(editProfileParamInput, setEditProfileParams, setEditProfileParamInput)
        }
        onRemoveParam={(value: string) => removeProfileParam(value, setEditProfileParams)}
      />
      <ManageSubprofilesModal
        isOpen={isManageSubprofilesModalOpen}
        profiles={profiles}
        selectedProfile={selectedProfile}
        isLoading={isLoadingProfiles}
        errorMessage={profilesError}
        onClose={() => setIsManageSubprofilesModalOpen(false)}
        onCreate={openCreateSubprofileModal}
        onEdit={openEditSubprofileModal}
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
