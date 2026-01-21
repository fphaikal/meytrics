import { useState, useEffect, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { getMe } from '../lib/api';

interface ProtectedRouteProps {
    children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');

            if (!token) {
                setAuthenticated(false);
                setLoading(false);
                return;
            }

            try {
                await getMe();
                setAuthenticated(true);
            } catch {
                localStorage.removeItem('token');
                setAuthenticated(false);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center">
                <div className="animate-pulse text-slate-600">Loading...</div>
            </div>
        );
    }

    if (!authenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}
