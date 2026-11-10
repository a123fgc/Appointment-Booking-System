
import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback
} from 'react';

import {
    loginRequest,
    signupRequest,
    logoutRequest,
    meRequest
} from '../api/auth.js';

const AuthContext = createContext(null);

export const HOME_BY_ROLE = {
    admin: '/admin',
    staff: '/staff/schedule',
    customer: '/customer/book',
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // App open ya refresh hone par saved token verify karein
    useEffect(() => {
        let active = true;

        async function checkSession() {
            const token = localStorage.getItem('token');

            if (!token) {
                if (active) {
                    setUser(null);
                    setLoading(false);
                }
                return;
            }

            try {
                const data = await meRequest();

                if (active) {
                    setUser(data.user);
                }
            } catch (err) {
                if (active) {
                    setUser(null);

                    // Sirf invalid/expired token remove karein
                    if (err.status === 401) {
                        localStorage.removeItem('token');
                    }
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        checkSession();

        return () => {
            active = false;
        };
    }, []);

    // Login
    const login = useCallback(async (email, password) => {
        const data = await loginRequest(email, password);

        if (!data.token) {
            throw new Error('Login token receive nahi hua.');
        }

        localStorage.setItem('token', data.token);
        setUser(data.user);

        return data.user;
    }, []);

    // Signup
    const signup = useCallback(async (name, email, password) => {
        const data = await signupRequest(name, email, password);

        if (!data.token) {
            throw new Error('Signup token receive nahi hua.');
        }

        localStorage.setItem('token', data.token);
        setUser(data.user);

        return data.user;
    }, []);

    // Logout
    const logout = useCallback(async () => {
        try {
            await logoutRequest();
        } catch (error) {
            console.error('Logout API Error:', error);
        } finally {
            localStorage.removeItem('token');
            setUser(null);
        }
    }, []);
    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                signup,
                logout
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);

    if (!ctx) {
        throw new Error(
            'useAuth ko AuthProvider ke andar istemal karein'
        );
    }

    return ctx;
}
