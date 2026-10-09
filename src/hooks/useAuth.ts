import { useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types/tea';
import {
  getStoredUser,
  setStoredUser,
  removeStoredUser,
  setAuthToken,
  removeAuthToken,
  getAuthToken
} from '../utils/api';

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const savedUser = getStoredUser();
    const token = getAuthToken();
    if (savedUser && token) {
      setUser(savedUser);
    }
    setIsAuthLoading(false);
  }, []);

  const login = useCallback((userData: UserProfile, token: string) => {
    setStoredUser(userData);
    setAuthToken(token);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    removeStoredUser();
    removeAuthToken();
    setUser(null);
  }, []);

  const markPasswordChanged = useCallback(() => {
    if (user) {
      const updated = { ...user, is_initial: false };
      setStoredUser(updated);
      setUser(updated);
    }
  }, [user]);

  return {
    user,
    setUser,
    isAuthLoading,
    login,
    logout,
    markPasswordChanged
  };
}
