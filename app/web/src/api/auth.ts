import { apiFetch } from './client';

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  userType: 'SA' | 'A';
};

export type AuthResponse = {
  user: AuthUser;
  token: string;
};

export function getMe() {
  return apiFetch<{ user: AuthUser }>('/auth/me');
}

export function login(payload: { email: string; password: string }) {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    json: payload,
  });
}

export function logout() {
  return apiFetch<void>('/auth/logout', {
    method: 'POST',
  });
}
