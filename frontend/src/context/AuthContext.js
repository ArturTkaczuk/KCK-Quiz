import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/me', { withCredentials: true });
            setUser(res.data);
        } catch (err) {
            setUser(null);
            console.log('Not authenticated');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
    }, []);

    const loginSimulation = async (userId) => {
        // This is a helper for the prototype to set the cookie client-side if needed
        // In real app, this would be done by the server or external SSO
        document.cookie = `User=${userId}; path=/; max-age=86400`;
        await fetchUser();
    };

    const logout = () => {
        document.cookie = 'User=; path=/; max-age=0';
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, loginSimulation, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
