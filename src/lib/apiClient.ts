// Simple API client with absolute URLs
const API_BASE_URL = 'http://localhost:8000';

export async function apiCall(endpoint: string, options?: RequestInit) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`;
    try {
      const error = await response.json();
      errorMsg = error.detail || error.message || errorMsg;
    } catch (e) {
      // Could not parse JSON error response
    }
    throw new Error(errorMsg);
  }

  try {
    return await response.json();
  } catch (e) {
    throw new Error(`Invalid JSON response from ${endpoint}`);
  }
}

export function apiGet(endpoint: string) {
  return apiCall(endpoint, { method: 'GET' });
}

export function apiPost(endpoint: string, data: any) {
  return apiCall(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function apiPut(endpoint: string, data: any) {
  return apiCall(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function apiDelete(endpoint: string) {
  return apiCall(endpoint, { method: 'DELETE' });
}

export async function apiUploadFile(
  endpoint: string,
  file: File,
  fields?: Record<string, string>
) {
  const url = `${API_BASE_URL}${endpoint}`;
  const formData = new FormData();
  formData.append('file', file);
  if (fields) {
    Object.entries(fields).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorMsg = `Upload failed: ${response.status}`;
    try {
      const error = await response.json();
      errorMsg = error.detail || errorMsg;
    } catch (e) {
      // Could not parse error
    }
    throw new Error(errorMsg);
  }

  return await response.json();
}
