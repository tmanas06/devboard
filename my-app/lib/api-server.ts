import axios from 'axios';
import { auth } from '@clerk/nextjs/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Server-side axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor for server-side requests
export async function getAuthHeader() {
  const session = await auth();
  const token = await session.getToken();

  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Create a server-side API instance with auth
export async function createServerApiClient() {
  const headers = await getAuthHeader();
  
  return axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

export default apiClient;

