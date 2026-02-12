import type RequestConfig from "../../interfaces/request";
import type SubProfile from "../../interfaces/subProfile";

export type Profile = {
  name: string;
  baseUrl?: string;
  params: string[];
  subProfiles?: SubProfile[];
  requests?: RequestConfig[];
};

export type NewSubProfileNames = Record<string, string>;
