import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useEffect, useState } from "react";
import {
  createProfile,
  deleteProfile as deleteProfileApi,
  fetchActiveProfile,
  fetchProfiles,
  setActiveProfile,
  updateProfile,
} from "../api/profiles";
import type { Profile } from "../types/profile";

type UseProfilesReturn = {
  profiles: Profile[];
  setProfiles: Dispatch<SetStateAction<Profile[]>>;
  selectedProfile: string;
  setSelectedProfile: Dispatch<SetStateAction<string>>;
  profilesError: string;
  activeProfileError: string;
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
  editProfileOriginalName: string;
  createProfileError: string;
  updateProfileError: string;
  deleteProfileError: string;
  isDeletingProfile: boolean;
  isCreateProfileModalOpen: boolean;
  setIsCreateProfileModalOpen: Dispatch<SetStateAction<boolean>>;
  setNewProfileName: Dispatch<SetStateAction<string>>;
  setNewProfileBaseUrl: Dispatch<SetStateAction<string>>;
  setNewProfileParams: Dispatch<SetStateAction<string[]>>;
  setNewProfileParamInput: Dispatch<SetStateAction<string>>;
  setEditProfileName: Dispatch<SetStateAction<string>>;
  setEditProfileBaseUrl: Dispatch<SetStateAction<string>>;
  setEditProfileParams: Dispatch<SetStateAction<string[]>>;
  setEditProfileParamInput: Dispatch<SetStateAction<string>>;
  openCreateProfileModal: () => void;
  handleAddProfile: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleUpdateProfile: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleDeleteProfile: (profileName: string) => Promise<void>;
  addProfileParam: (
    param: string,
    setParams: Dispatch<SetStateAction<string[]>>,
    setInput: Dispatch<SetStateAction<string>>,
  ) => void;
  removeProfileParam: (
    value: string,
    setParams: Dispatch<SetStateAction<string[]>>,
  ) => void;
};

const useProfiles = (): UseProfilesReturn => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState("");
  const [profilesError, setProfilesError] = useState("");
  const [activeProfileError, setActiveProfileError] = useState("");
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
  const [deleteProfileError, setDeleteProfileError] = useState("");
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);
  const [isCreateProfileModalOpen, setIsCreateProfileModalOpen] =
    useState(false);

  useEffect(() => {
    let isActive = true;

    const loadProfiles = async () => {
      setIsLoadingProfiles(true);
      setProfilesError("");
      setActiveProfileError("");
      try {
        const data = await fetchProfiles();
        if (!isActive) {
          return;
        }
        setProfiles(data);
        let nextSelection = data[0]?.name || "";
        try {
          const active = await fetchActiveProfile();
          if (!isActive) {
            return;
          }
          const activeName = active.name ?? "";
          if (
            activeName &&
            data.some((profile) => profile.name === activeName)
          ) {
            nextSelection = activeName;
          }
        } catch (error) {
          if (!isActive) {
            return;
          }
          setActiveProfileError(
            error instanceof Error
              ? error.message
              : "Unable to load active profile.",
          );
        }
        setSelectedProfile((prev) => prev || nextSelection);
      } catch (error) {
        if (!isActive) {
          return;
        }
        setProfilesError(
          error instanceof Error ? error.message : "Unable to load profiles.",
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

  useEffect(() => {
    if (!selectedProfile) {
      return;
    }
    let isActive = true;
    setActiveProfile(selectedProfile)
      .then(() => {
        if (isActive) {
          setActiveProfileError("");
        }
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }
        setActiveProfileError(
          error instanceof Error
            ? error.message
            : "Unable to set active profile.",
        );
      });
    return () => {
      isActive = false;
    };
  }, [selectedProfile]);

  useEffect(() => {
    const profile = profiles.find((p) => p.name === selectedProfile);
    if (profile) {
      setEditProfileOriginalName(profile.name);
      setEditProfileName(profile.name);
      setEditProfileBaseUrl(profile.baseUrl ?? "");
      setEditProfileParams(profile.params ?? []);
      setEditProfileParamInput("");
      setUpdateProfileError("");
    }
  }, [selectedProfile, profiles]);

  const openCreateProfileModal = () => {
    setCreateProfileError("");
    setNewProfileName("");
    setNewProfileBaseUrl("");
    setNewProfileParams([]);
    setNewProfileParamInput("");
    setIsCreateProfileModalOpen(true);
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
        error instanceof Error ? error.message : "Unable to create profile.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const addProfileParam = (
    param: string,
    setParams: Dispatch<SetStateAction<string[]>>,
    setInput: Dispatch<SetStateAction<string>>,
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
    setParams: Dispatch<SetStateAction<string[]>>,
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
          profile.name === editProfileOriginalName ? updated : profile,
        ),
      );
      if (selectedProfile === editProfileOriginalName) {
        setSelectedProfile(updated.name);
      }
    } catch (error) {
      setUpdateProfileError(
        error instanceof Error ? error.message : "Unable to update profile.",
      );
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleDeleteProfile = async (profileName: string) => {
    if (!profileName) {
      return;
    }
    setIsDeletingProfile(true);
    setDeleteProfileError("");
    try {
      await deleteProfileApi(profileName);
      const remaining = profiles.filter((p) => p.name !== profileName);
      setProfiles(remaining);
      setSelectedProfile(remaining[0]?.name ?? "");
    } catch (error) {
      setDeleteProfileError(
        error instanceof Error ? error.message : "Unable to delete profile.",
      );
    } finally {
      setIsDeletingProfile(false);
    }
  };

  return {
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
    editProfileOriginalName,
    createProfileError,
    updateProfileError,
    deleteProfileError,
    isDeletingProfile,
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
  };
};

export default useProfiles;
