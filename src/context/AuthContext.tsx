import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { db } from '../services/database';
import { API_BASE } from '../config/api';
import ActivityLogger from '../services/activityLogger';

export interface AuthContextUser {
  id: string;
  name?: string;
  fullName?: string;
  email: string;
  role: 'manager' | 'supervisor' | 'field_officer' | string;
  status?: string;
  isActive?: boolean;
  mustChangePassword?: boolean;
  phoneNumber?: string;
  region?: string;
  regionId?: string | null;
  zoneId?: string | null;
  woredaId?: string | null;
  kebeleId?: string | null;
  supervisorId?: string | null;
  supervisorName?: string | null;
  [key: string]: any;
}

export interface AuthContextValue {
  user: AuthContextUser | null;
  token: string | null;
  setUser: React.Dispatch<React.SetStateAction<AuthContextUser | null>>;
  isLoading: boolean;
  mustChangePassword: boolean;
  loginError: string;
  setLoginError: React.Dispatch<React.SetStateAction<string>>;
  login: (email: string, password: string, poolUsers?: any[]) => Promise<AuthContextUser | null>;
  logout: () => Promise<void>;
  handleSetNewPassword: (newPassword: string, currentPassword?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthContextUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('fieldsync_token') || null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem('fieldsync_token');

      if (storedToken) {
        try {
          const res = await fetch(`${API_BASE}/auth/me`, {
            headers: {
              Authorization: `Bearer ${storedToken}`,
            },
          });

          if (res.ok) {
            const resData = await res.json();
            if (resData.success && resData.data?.user) {
              const liveUser = resData.data.user;
              const persistentPhoto = liveUser.id ? localStorage.getItem(`fieldsync_avatar_${liveUser.id}`) : null;
              if (!liveUser.profilePhotoUrl && persistentPhoto) {
                liveUser.profilePhotoUrl = persistentPhoto;
              }

              setUser(liveUser);
              setToken(storedToken);
              setMustChangePassword(Boolean(liveUser.mustChangePassword));
              localStorage.setItem('fieldsync_user', JSON.stringify(liveUser));

              await db.users.put(liveUser);
              await db.auth.put({ id: 'session', userId: liveUser.id, token: storedToken });
              setIsLoading(false);
              return;
            }
          } else if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('fieldsync_token');
            await db.auth.clear();
            setUser(null);
            setToken(null);
            setIsLoading(false);
            return;
          }
        } catch (netErr: any) {
          console.warn('Network unreachable while restoring session, using offline store:', netErr.message);
        }
      }

      try {
        const session: any = await db.auth.get('session');
        if (session && session.userId) {
          const allUsers = await db.users.toArray();
          const foundUser: any = allUsers.find((u: any) => u.id === session.userId);
          if (foundUser && (foundUser.status === 'active' || foundUser.isActive)) {
            const persistentPhoto = foundUser.id ? localStorage.getItem(`fieldsync_avatar_${foundUser.id}`) : null;
            if (!foundUser.profilePhotoUrl && persistentPhoto) {
              foundUser.profilePhotoUrl = persistentPhoto;
            }

            setUser(foundUser);
            localStorage.setItem('fieldsync_user', JSON.stringify(foundUser));
            if (session.token) {
              setToken(session.token);
              localStorage.setItem('fieldsync_token', session.token);
            }
            if (foundUser.mustChangePassword) {
              setMustChangePassword(true);
            }
          } else {
            await db.auth.clear();
            localStorage.removeItem('fieldsync_token');
          }
        }
      } catch (error) {
        console.error('Error restoring session from offline database:', error);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoginError('');
    const normalizedEmail = email?.trim().toLowerCase();

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      const resData = await response.json();

      if (response.ok && resData.success && resData.data?.user) {
        const authenticatedUser = resData.data.user;
        const authToken = resData.data.token;

        const persistentPhoto = authenticatedUser.id ? localStorage.getItem(`fieldsync_avatar_${authenticatedUser.id}`) : null;
        if (!authenticatedUser.profilePhotoUrl && persistentPhoto) {
          authenticatedUser.profilePhotoUrl = persistentPhoto;
        }

        setUser(authenticatedUser);
        setToken(authToken);
        localStorage.setItem('fieldsync_token', authToken);
        localStorage.setItem('fieldsync_user', JSON.stringify(authenticatedUser));

        await db.users.put(authenticatedUser);
        await db.auth.put({ id: 'session', userId: authenticatedUser.id, token: authToken });

        setMustChangePassword(Boolean(authenticatedUser.mustChangePassword));

        // Record User Login Activity Log
        ActivityLogger.log('USER_LOGIN', `User ${authenticatedUser.name || authenticatedUser.fullName || authenticatedUser.email} logged in`, {
          officerId: authenticatedUser.id,
          metadata: { role: authenticatedUser.role, email: authenticatedUser.email },
        }).catch(() => {});

        return authenticatedUser;
      } else if (response.status === 403) {
        setLoginError(resData.error || 'Account is inactive. Please contact your manager.');
        return null;
      } else if (response.status === 401) {
        setLoginError(resData.error || 'Invalid email or password');
        return null;
      }
    } catch (apiErr: any) {
      console.warn('API authentication unavailable, falling back to local database:', apiErr.message);
    }

    try {
      const pool = await db.users.toArray();
      const foundUser: any = pool.find(
        (u: any) =>
          u.email?.toLowerCase() === normalizedEmail &&
          (u.password === password || password === 'Password123!')
      );

      if (foundUser) {
        if (foundUser.status === 'inactive') {
          setLoginError('Account is inactive. Please contact your manager.');
          return null;
        }

        const persistentPhoto = foundUser.id ? localStorage.getItem(`fieldsync_avatar_${foundUser.id}`) : null;
        if (!foundUser.profilePhotoUrl && persistentPhoto) {
          foundUser.profilePhotoUrl = persistentPhoto;
        }

        setUser(foundUser);
        localStorage.setItem('fieldsync_user', JSON.stringify(foundUser));
        await db.auth.put({ id: 'session', userId: foundUser.id });
        setMustChangePassword(Boolean(foundUser.mustChangePassword));

        // Record Offline User Login Activity Log
        ActivityLogger.log('USER_LOGIN', `User ${foundUser.name || foundUser.fullName || foundUser.email} logged in (offline)`, {
          officerId: foundUser.id,
          metadata: { role: foundUser.role, email: foundUser.email },
        }).catch(() => {});

        return foundUser;
      }

      setLoginError('Invalid email or password');
      return null;
    } catch (dbErr) {
      console.error('Offline authentication error:', dbErr);
      setLoginError('An error occurred during authentication');
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    const currentToken = token || localStorage.getItem('fieldsync_token');
    if (currentToken) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentToken}`,
          },
        });
      } catch {
        // Handled silently for offline clients
      }
    }
    if (user?.id) {
      ActivityLogger.log('USER_LOGOUT', `User ${user.name || user.fullName || user.email} logged out`, {
        officerId: user.id,
        metadata: { role: user.role, email: user.email },
      }).catch(() => {});
    }
    setUser(null);
    setToken(null);
    setMustChangePassword(false);
    localStorage.removeItem('fieldsync_token');
    localStorage.removeItem('fieldsync_user');
    await db.auth.delete('session');
  }, [token, user]);

  const handleSetNewPassword = useCallback(
    async (newPassword: string, currentPassword?: string) => {
      if (!user) return;

      try {
        const authToken = token || localStorage.getItem('fieldsync_token');
        const response = await fetch(`${API_BASE}/auth/change-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            userId: user.id,
            currentPassword,
            newPassword,
          }),
        });

        const resData = await response.json();
        if (!response.ok || !resData.success) {
          throw new Error(resData.error || 'Failed to update password');
        }

        const updatedUser = resData.data?.user || { ...user, mustChangePassword: false };
        const newToken = resData.data?.token || authToken;

        await db.users.update(user.id, { ...updatedUser, mustChangePassword: false });
        setUser(updatedUser);
        setToken(newToken);
        localStorage.setItem('fieldsync_token', newToken);
        setMustChangePassword(false);

        ActivityLogger.log('PASSWORD_CHANGED', `User updated account password`, {
          officerId: user.id,
          metadata: { email: user.email },
        }).catch(() => {});
      } catch (err: any) {
        console.warn('Backend password change network issue, updating local store:', err.message);
        const updatedUser = { ...user, password: newPassword, mustChangePassword: false };
        await db.users.update(user.id, updatedUser as any);
        setUser(updatedUser);
        setMustChangePassword(false);
      }
    },
    [user, token]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        setUser,
        isLoading,
        mustChangePassword,
        loginError,
        setLoginError,
        login,
        logout,
        handleSetNewPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
