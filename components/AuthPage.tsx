
import React, { useState } from 'react';
import { login, register } from '../services/api';
import { User, AuthData } from '../types';

interface AuthPageProps {
  onLoginSuccess: (token: string, user: User) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    first_name: '',
    last_name: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-slate-800 rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-white">
            {isLoginView ? 'Sign In' : 'Create Account'}
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            {isLoginView ? 'Or ' : 'Already have an account? '}
            <button
              onClick={() => {
                setIsLoginView(!isLoginView);
                setError(null);
              }}
              className="font-medium text-indigo-400 hover:text-indigo-300"
            >
              {isLoginView ? 'create an account' : 'sign in'}
            </button>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
          <div className="rounded-md shadow-sm -space-y-px">
            {!isLoginView && (
              <>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <input name="first_name" type="text" required value={formData.first_name} onChange={handleChange} className="input-field rounded-t-md" placeholder="First Name"/>
                  <input name="last_name" type="text" required value={formData.last_name} onChange={handleChange} className="input-field rounded-t-md" placeholder="Last Name"/>
                </div>
                <input name="username" type="text" required value={formData.username} onChange={handleChange} className="input-field rounded-none" placeholder="Username"/>
              </>
            )}
            <input name="email" type="email" autoComplete="email" required value={formData.email} onChange={handleChange} className={`input-field ${isLoginView ? 'rounded-t-md' : 'rounded-none'}`} placeholder="Email address"/>
            <input name="password" type="password" autoComplete="current-password" required value={formData.password} onChange={handleChange} className="input-field rounded-b-md" placeholder="Password"/>
          </div>

          <div>
            <button type="submit" disabled={loading} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-800 disabled:bg-indigo-400">
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
            padding: 0.75rem;
            border: 1px solid #4a5568;
            background-color: #2d3748;
            color: white;
            outline: none;
            transition: border-color 0.2s;
        }
        .input-field:focus {
            z-index: 10;
            border-color: #6366f1;
        }
      `}</style>
    </div>
  );
};

export default AuthPage;
