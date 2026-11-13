
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
            throw new Error('Login token was not received.');
        }

        localStorage.setItem('token', data.token);
        setUser(data.user);

        return data.user;
    }, []);

    // Signup
    const signup = useCallback(async (name, email, password) => {
        return signupRequest(name, email, password);
    }, []);

    // Logout
    const logout = useCallback(async () => {
        try {
            await logoutRequest();
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
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
            'useAuth must be used within an AuthProvider'
        );
    }

    return ctx;
}
