interface RequestResponse {
  status?: number;
  headers?: Record<string, string>;
  body?: unknown;
}

interface RequestConfig {
  name: string;
  path: string;
  method?: string;
  headers?: Record<string, string>;
  queryParameters?: Record<string, string>;
  body?: Record<string, string>;
  params?: Record<string, string>;
  response?: RequestResponse;
}

export default RequestConfig;
