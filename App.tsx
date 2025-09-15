
import React, { useState, useEffect, useCallback } from 'react';
import Dashboard from './components/Dashboard';
import AuthPage from './components/AuthPage';
import { User } from './types';

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));
  const [user, setUser] = useState<User | null>(JSON.parse(localStorage.getItem('authUser') || 'null'));

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('authUser');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLoginSuccess = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('authUser', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-gray-200">
      {token && user ? (
        <Dashboard user={user} onLogout={handleLogout} token={token} />
      ) : (
        <AuthPage onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
};

export default App;
