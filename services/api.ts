
import { 
  ApiResponse, 
  AuthData, 
  Organization, 
  PaginatedResponse, 
  RedisInstance, 
  User 
} from '../types';

const BASE_URL = 'http://localhost:8080';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  
  const result: ApiResponse<T> = await response.json();
  if(!result.success) {
    throw new Error(result.message || 'API returned an error');
  }
  return result.data;
}

export const register = (userData: Omit<User, 'id'> & { password: string }) => {
  return request<User>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

export const login = (credentials: Pick<User, 'email'> & { password: string }) => {
  return request<AuthData>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
};

export const getOrganizations = (token: string, page = 1, limit = 20) => {
  return request<PaginatedResponse<Organization>>(`/api/organizations?page=${page}&limit=${limit}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
};

export const createOrganization = (token: string, orgData: { name: string; description: string; slug: string }) => {
    return request<Organization>('/api/organizations', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(orgData)
    });
};


export const getRedisInstances = (token: string, orgId: string) => {
  return request<{ items: RedisInstance[] }>(`/api/organizations/${orgId}/redis-instances`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
};

export const createRedisInstance = (token: string, orgId: string, instanceData: any) => {
  return request<RedisInstance>(`/api/organizations/${orgId}/redis-instances`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(instanceData),
  });
};
