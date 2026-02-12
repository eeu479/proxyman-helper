import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useState } from "react";
import { createSubProfile, updateSubProfile } from "../api/profiles";
import type { Profile } from "../types/profile";

type UseSubprofilesParams = {
  profiles: Profile[];
  selectedProfile: string;
  setProfiles: Dispatch<SetStateAction<Profile[]>>;
};

type UseSubprofilesReturn = {
  isManageSubprofilesModalOpen: boolean;
  isCreateSubprofileModalOpen: boolean;
  isEditSubprofileModalOpen: boolean;
  newSubprofileName: string;
  newSubprofileParamValue: string;
  newSubprofileParams: { key: string; value: string }[];
  editSubprofileName: string;
  editSubprofileParamValue: string;
  editSubprofileParams: { key: string; value: string }[];
  subprofileProfileName: string;
  subprofileValueByKey: Record<string, string>;
  createSubprofileError: string;
  updateSubprofileError: string;
  isSavingSubprofile: boolean;
  isUpdatingSubprofile: boolean;
  setIsManageSubprofilesModalOpen: Dispatch<SetStateAction<boolean>>;
  setIsCreateSubprofileModalOpen: Dispatch<SetStateAction<boolean>>;
  setIsEditSubprofileModalOpen: Dispatch<SetStateAction<boolean>>;
  setNewSubprofileName: Dispatch<SetStateAction<string>>;
  setNewSubprofileParamValue: Dispatch<SetStateAction<string>>;
  setNewSubprofileParams: Dispatch<
    SetStateAction<{ key: string; value: string }[]>
  >;
  setEditSubprofileName: Dispatch<SetStateAction<string>>;
  setEditSubprofileParamValue: Dispatch<SetStateAction<string>>;
  setEditSubprofileParams: Dispatch<
    SetStateAction<{ key: string; value: string }[]>
  >;
  openCreateSubprofileModal: () => void;
  openEditSubprofileModal: (profileName: string, subprofileName: string) => void;
  addSubprofileParam: (
    value: string,
    setParams: Dispatch<SetStateAction<{ key: string; value: string }[]>>,
    setValueInput: Dispatch<SetStateAction<string>>
  ) => void;
  removeSubprofileParam: (
    key: string,
    setParams: Dispatch<SetStateAction<{ key: string; value: string }[]>>
  ) => void;
  updateSubprofileValueForKey: (key: string, value: string) => void;
  handleCreateSubprofile: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleUpdateSubprofile: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

const useSubprofiles = ({
  profiles,
  selectedProfile,
  setProfiles,
}: UseSubprofilesParams): UseSubprofilesReturn => {
  const [newSubprofileName, setNewSubprofileName] = useState("");
  const [newSubprofileParamValue, setNewSubprofileParamValue] = useState("");
  const [newSubprofileParams, setNewSubprofileParams] = useState<
    { key: string; value: string }[]
  >([]);
  const [editSubprofileName, setEditSubprofileName] = useState("");
  const [editSubprofileParamValue, setEditSubprofileParamValue] = useState("");
  const [editSubprofileParams, setEditSubprofileParams] = useState<
    { key: string; value: string }[]
  >([]);
  const [editSubprofileOriginalName, setEditSubprofileOriginalName] = useState("");
  const [subprofileProfileName, setSubprofileProfileName] = useState("");
  const [subprofileValueByKey, setSubprofileValueByKey] = useState<
    Record<string, string>
  >({});
  const [createSubprofileError, setCreateSubprofileError] = useState("");
  const [updateSubprofileError, setUpdateSubprofileError] = useState("");
  const [isManageSubprofilesModalOpen, setIsManageSubprofilesModalOpen] =
    useState(false);
  const [isCreateSubprofileModalOpen, setIsCreateSubprofileModalOpen] =
    useState(false);
  const [isEditSubprofileModalOpen, setIsEditSubprofileModalOpen] =
    useState(false);
  const [isSavingSubprofile, setIsSavingSubprofile] = useState(false);
  const [isUpdatingSubprofile, setIsUpdatingSubprofile] = useState(false);

  const openCreateSubprofileModal = () => {
    if (!selectedProfile) {
      return;
    }
    setCreateSubprofileError("");
    const profile = profiles.find((item) => item.name === selectedProfile);
    const requiredKeys = profile?.params ?? [];
    const initialValues: Record<string, string> = {};
    requiredKeys.forEach((key) => {
      initialValues[key] = "";
    });
    setSubprofileProfileName(selectedProfile);
    setNewSubprofileName("");
    setNewSubprofileParamValue("");
    setNewSubprofileParams([]);
    setSubprofileValueByKey(initialValues);
    setIsCreateSubprofileModalOpen(true);
  };

  const openEditSubprofileModal = (profileName: string, subprofileName: string) => {
    const profile = profiles.find((item) => item.name === profileName);
    const subprofile = profile?.subProfiles?.find((item) => item.name === subprofileName);
    if (!profile || !subprofile) {
      return;
    }
    setUpdateSubprofileError("");
    const requiredKeys = profile.params ?? [];
    const existingParams = subprofile.params ?? {};
    const initialValues: Record<string, string> = {};
    requiredKeys.forEach((key) => {
      initialValues[key] = existingParams[key] ?? "";
    });
    setSubprofileProfileName(profileName);
    setEditSubprofileOriginalName(subprofile.name);
    setEditSubprofileName(subprofile.name);
    setEditSubprofileParamValue("");
    setSubprofileValueByKey(initialValues);
    setEditSubprofileParams(
      Object.entries(existingParams)
        .filter(([key]) => !requiredKeys.includes(key))
        .map(([key, value]) => ({ key, value }))
    );
    setIsEditSubprofileModalOpen(true);
  };

  const addSubprofileParam = (
    value: string,
    setParams: Dispatch<SetStateAction<{ key: string; value: string }[]>>,
    setValueInput: Dispatch<SetStateAction<string>>
  ) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return;
    }
    const key = `extra_${Date.now()}`;
    setParams((prev) => [...prev, { key, value: trimmedValue }]);
    setValueInput("");
  };

  const removeSubprofileParam = (
    key: string,
    setParams: Dispatch<SetStateAction<{ key: string; value: string }[]>>
  ) => {
    setParams((prev) => prev.filter((item) => item.key !== key));
  };

  const updateSubprofileValueForKey = (key: string, value: string) => {
    setSubprofileValueByKey((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreateSubprofile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = newSubprofileName.trim();
    if (!trimmedName || !subprofileProfileName) {
      return;
    }

    const params = {
      ...subprofileValueByKey,
      ...Object.fromEntries(newSubprofileParams.map((param) => [param.key, param.value])),
    };

    setIsSavingSubprofile(true);
    setCreateSubprofileError("");
    try {
      const created = await createSubProfile(subprofileProfileName, trimmedName, params);
      setProfiles((prev) =>
        prev.map((profile) =>
          profile.name === subprofileProfileName
            ? {
                ...profile,
                subProfiles: [...(profile.subProfiles ?? []), created],
              }
            : profile
        )
      );
      setIsCreateSubprofileModalOpen(false);
    } catch (error) {
      setCreateSubprofileError(
        error instanceof Error ? error.message : "Unable to create subprofile."
      );
    } finally {
      setIsSavingSubprofile(false);
    }
  };

  const handleUpdateSubprofile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = editSubprofileName.trim();
    if (!trimmedName || !subprofileProfileName || !editSubprofileOriginalName) {
      return;
    }

    const params = {
      ...subprofileValueByKey,
      ...Object.fromEntries(editSubprofileParams.map((param) => [param.key, param.value])),
    };

    setIsUpdatingSubprofile(true);
    setUpdateSubprofileError("");
    try {
      const updated = await updateSubProfile(
        subprofileProfileName,
        editSubprofileOriginalName,
        {
          name: trimmedName,
          params,
        }
      );
      setProfiles((prev) =>
        prev.map((profile) =>
          profile.name === subprofileProfileName
            ? {
                ...profile,
                subProfiles: (profile.subProfiles ?? []).map((sub) =>
                  sub.name === editSubprofileOriginalName ? updated : sub
                ),
              }
            : profile
        )
      );
      setIsEditSubprofileModalOpen(false);
    } catch (error) {
      setUpdateSubprofileError(
        error instanceof Error ? error.message : "Unable to update subprofile."
      );
    } finally {
      setIsUpdatingSubprofile(false);
    }
  };

  return {
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
  };
};

export default useSubprofiles;
