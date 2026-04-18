import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authApi } from '@/services/api';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const [selectedRole, setSelectedRole] = useState(null);

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('ats_token');
    const userJson = localStorage.getItem('ats_user');
    
    if (token && userJson) {
      try {
        const user = JSON.parse(userJson);
        setState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        localStorage.removeItem('ats_token');
        localStorage.removeItem('ats_user');
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await authApi.login(credentials.email, credentials.password);
    const { token, user } = data;
    
    localStorage.setItem('ats_token', token);
    localStorage.setItem('ats_user', JSON.stringify(user));
    
    setState({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const signup = useCallback(async (data) => {
    const result = await authApi.signup(data.name, data.email, data.password, data.role);
    const { token, user } = result;
    
    localStorage.setItem('ats_token', token);
    localStorage.setItem('ats_user', JSON.stringify(user));
    
    setState({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ats_token');
    localStorage.removeItem('ats_user');
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        signup,
        logout,
        selectedRole,
        setSelectedRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
