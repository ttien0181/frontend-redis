import React, { useState } from 'react';
import { login, register } from '../services/api';
import { User, AuthData } from '../types';
import { LogoIcon } from './ui/Icons';

interface AuthPageProps {
  onLoginSuccess: (token: string, user: User) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!isLoginView && formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      if (isLoginView) {
        const { email, password } = formData;
        const data: AuthData = await login({ email, password });
        onLoginSuccess(data.token, data.user);
      } else {
        const { email, username, password, first_name, last_name } = formData;
        await register({ email, username, password, first_name, last_name });
        alert('Registration successful! Please log in.');
        setIsLoginView(true);
        setFormData({ ...formData, password: '', confirmPassword: ''});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl">
        <div className="flex justify-center mb-4">
            <LogoIcon />
        </div>
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-slate-900">
            {isLoginView ? 'Welcome Back' : 'Create Your Account'}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {isLoginView ? 'Or ' : 'Already have an account? '}
            <button
              onClick={() => {
                setIsLoginView(!isLoginView);
                setError(null);
              }}
              className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
            >
              {isLoginView ? 'create an account' : 'sign in'}
            </button>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <p className="text-sm text-red-700 text-center bg-red-100 p-3 rounded-md">{error}</p>}
          <div className="space-y-4">
            {!isLoginView && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <input name="first_name" type="text" required value={formData.first_name} onChange={handleChange} className="input-field" placeholder="First Name"/>
                  <input name="last_name" type="text" required value={formData.last_name} onChange={handleChange} className="input-field" placeholder="Last Name"/>
                </div>
                <input name="username" type="text" required value={formData.username} onChange={handleChange} className="input-field" placeholder="Username"/>
              </>
            )}
            <input name="email" type="email" autoComplete="email" required value={formData.email} onChange={handleChange} className="input-field" placeholder="Email address"/>
            <input name="password" type="password" autoComplete="current-password" required value={formData.password} onChange={handleChange} className="input-field" placeholder="Password"/>
            {!isLoginView && (
                 <input name="confirmPassword" type="password" required value={formData.confirmPassword} onChange={handleChange} className="input-field" placeholder="Confirm Password"/>
            )}
          </div>

          <div>
            <button type="submit" disabled={loading} className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-white disabled:bg-indigo-500/50 transition-all duration-300">
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
              </span>
              {loading ? 'Processing...' : (isLoginView ? 'Sign In' : 'Register')}
            </button>
          </div>
        </form>
      </div>
      <style>{`
        .input-field {
            appearance: none;
            position: relative;
            display: block;
            width: 100%;
            padding: 0.85rem;
            border-radius: 0.375rem;
            border: 1px solid #cbd5e1;
            background-color: #f1f5f9;
            color: #1e293b;
            outline: none;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        .input-field:focus {
            z-index: 10;
            border-color: #6366f1;
            box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.4);
        }
      `}</style>
    </div>
  );
};

export default AuthPage;