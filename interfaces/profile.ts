import RequestConfig from "./request";
import SubProfile from "./subProfile";

interface Profile {
  name: string;
  baseUrl?: string;
  params: string[];
  subProfiles?: SubProfile[];
  requests?: RequestConfig[];
}

export default Profile;
