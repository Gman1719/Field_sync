import React from 'react';
import { User } from '../types/index.ts';
import AuthService from '../services/authService.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<User | null>(() => AuthService.getStoredUser());
  const [token, setToken] = React.useState<string | null>(() => AuthService.getStoredToken());
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const initAuth = async () => {
      const storedToken = AuthService.getStoredToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      // If device is online, verify token with backend
      if (navigator.onLine) {
        try {
          const freshUser = await AuthService.getMe();
          setUser(freshUser);
        } catch {
          // Token expired or invalid
          setUser(null);
          setToken(null);
        }
      } else {
        // Offline: Fallback to stored user in device localStorage
        const cachedUser = AuthService.getStoredUser();
        if (cachedUser) {
          setUser(cachedUser);
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const result = await AuthService.login(email, password);
    setUser(result.user);
    setToken(result.token);
  };

  const logout = async () => {
    await AuthService.logout();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
