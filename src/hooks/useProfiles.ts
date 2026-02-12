import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useEffect, useState } from "react";
import { createProfile, fetchProfiles, updateProfile } from "../api/profiles";
import type { Profile } from "../types/profile";

type UseProfilesReturn = {
  profiles: Profile[];
  setProfiles: Dispatch<SetStateAction<Profile[]>>;
  selectedProfile: string;
  setSelectedProfile: Dispatch<SetStateAction<string>>;
  profilesError: string;
  isLoadingProfiles: boolean;
  isSavingProfile: boolean;
  isUpdatingProfile: boolean;
  newProfileName: string;
  newProfileBaseUrl: string;
  newProfileParams: string[];
  newProfileParamInput: string;
  editProfileName: string;
  editProfileBaseUrl: string;
  editProfileParams: string[];
  editProfileParamInput: string;
  createProfileError: string;
  updateProfileError: string;
  isManageProfilesModalOpen: boolean;
  isCreateProfileModalOpen: boolean;
  isEditProfileModalOpen: boolean;
  setIsManageProfilesModalOpen: Dispatch<SetStateAction<boolean>>;
  setIsCreateProfileModalOpen: Dispatch<SetStateAction<boolean>>;
  setIsEditProfileModalOpen: Dispatch<SetStateAction<boolean>>;
  setNewProfileName: Dispatch<SetStateAction<string>>;
  setNewProfileBaseUrl: Dispatch<SetStateAction<string>>;
  setNewProfileParams: Dispatch<SetStateAction<string[]>>;
  setNewProfileParamInput: Dispatch<SetStateAction<string>>;
  setEditProfileName: Dispatch<SetStateAction<string>>;
  setEditProfileBaseUrl: Dispatch<SetStateAction<string>>;
  setEditProfileParams: Dispatch<SetStateAction<string[]>>;
  setEditProfileParamInput: Dispatch<SetStateAction<string>>;
  openCreateProfileModal: () => void;
  openEditProfileModal: (profile: Profile) => void;
  handleAddProfile: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleUpdateProfile: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  addProfileParam: (
    param: string,
    setParams: Dispatch<SetStateAction<string[]>>,
    setInput: Dispatch<SetStateAction<string>>
  ) => void;
  removeProfileParam: (
    value: string,
    setParams: Dispatch<SetStateAction<string[]>>
  ) => void;
};

const useProfiles = (): UseProfilesReturn => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState("");
  const [profilesError, setProfilesError] = useState("");
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileBaseUrl, setNewProfileBaseUrl] = useState("");
  const [newProfileParams, setNewProfileParams] = useState<string[]>([]);
  const [newProfileParamInput, setNewProfileParamInput] = useState("");
  const [editProfileName, setEditProfileName] = useState("");
  const [editProfileBaseUrl, setEditProfileBaseUrl] = useState("");
  const [editProfileParams, setEditProfileParams] = useState<string[]>([]);
  const [editProfileParamInput, setEditProfileParamInput] = useState("");
  const [editProfileOriginalName, setEditProfileOriginalName] = useState("");
  const [createProfileError, setCreateProfileError] = useState("");
  const [updateProfileError, setUpdateProfileError] = useState("");
  const [isManageProfilesModalOpen, setIsManageProfilesModalOpen] = useState(false);
  const [isCreateProfileModalOpen, setIsCreateProfileModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadProfiles = async () => {
      setIsLoadingProfiles(true);
      setProfilesError("");
      try {
        const data = await fetchProfiles();
        if (!isActive) {
          return;
        }
        setProfiles(data);
        setSelectedProfile((prev) => prev || data[0]?.name || "");
      } catch (error) {
        if (!isActive) {
          return;
        }
        setProfilesError(
          error instanceof Error ? error.message : "Unable to load profiles."
        );
      } finally {
        if (isActive) {
          setIsLoadingProfiles(false);
        }
      }
    };

    loadProfiles();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (profiles.length === 0) {
      setSelectedProfile("");
      return;
    }
    if (!profiles.some((profile) => profile.name === selectedProfile)) {
      setSelectedProfile(profiles[0]?.name ?? "");
    }
  }, [profiles, selectedProfile]);

  const openCreateProfileModal = () => {
    setCreateProfileError("");
    setNewProfileName("");
    setNewProfileBaseUrl("");
    setNewProfileParams([]);
    setNewProfileParamInput("");
    setIsCreateProfileModalOpen(true);
  };

  const openEditProfileModal = (profile: Profile) => {
    setUpdateProfileError("");
    setEditProfileOriginalName(profile.name);
    setEditProfileName(profile.name);
    setEditProfileBaseUrl(profile.baseUrl ?? "");
    setEditProfileParams(profile.params ?? []);
    setEditProfileParamInput("");
    setIsEditProfileModalOpen(true);
  };

  const handleAddProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = newProfileName.trim();
    if (!trimmedName) {
      return;
    }

    setIsSavingProfile(true);
    setCreateProfileError("");
    try {
      const created = await createProfile({
        name: trimmedName,
        baseUrl: newProfileBaseUrl.trim(),
        params: newProfileParams,
      });
      setProfiles((prev) => [...prev, created]);
      setSelectedProfile(created.name);
      setNewProfileName("");
      setNewProfileBaseUrl("");
      setNewProfileParams([]);
      setNewProfileParamInput("");
      setIsCreateProfileModalOpen(false);
    } catch (error) {
      setCreateProfileError(
        error instanceof Error ? error.message : "Unable to create profile."
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const addProfileParam = (
    param: string,
    setParams: Dispatch<SetStateAction<string[]>>,
    setInput: Dispatch<SetStateAction<string>>
  ) => {
    const trimmed = param.trim();
    if (!trimmed) {
      return;
    }

    setParams((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setInput("");
  };

  const removeProfileParam = (
    value: string,
    setParams: Dispatch<SetStateAction<string[]>>
  ) => {
    setParams((prev) => prev.filter((item) => item !== value));
  };

  const handleUpdateProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editProfileOriginalName) {
      return;
    }

    const trimmedName = editProfileName.trim();
    if (!trimmedName) {
      return;
    }

    setIsUpdatingProfile(true);
    setUpdateProfileError("");
    try {
      const updated = await updateProfile(editProfileOriginalName, {
        name: trimmedName,
        baseUrl: editProfileBaseUrl.trim(),
        params: editProfileParams,
      });
      setProfiles((prev) =>
        prev.map((profile) =>
          profile.name === editProfileOriginalName ? updated : profile
        )
      );
      if (selectedProfile === editProfileOriginalName) {
        setSelectedProfile(updated.name);
      }
      setIsEditProfileModalOpen(false);
    } catch (error) {
      setUpdateProfileError(
        error instanceof Error ? error.message : "Unable to update profile."
      );
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  return {
    profiles,
    setProfiles,
    selectedProfile,
    setSelectedProfile,
    profilesError,
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
  };
};

export default useProfiles;
