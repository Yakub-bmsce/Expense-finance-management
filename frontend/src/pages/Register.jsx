import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';
import Input from '../components/Input';
import Button from '../components/Button';

const Register = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formLoading, setFormLoading] = useState(false);
  
  const { register, error: authError } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const tempErrors = {};
    if (!fullName.trim()) {
      tempErrors.fullName = 'Full name is required';
    }
    if (!email) {
      tempErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      tempErrors.email = 'Please enter a valid email address';
    }
    if (!password) {
      tempErrors.password = 'Password is required';
    } else if (password.length < 6) {
      tempErrors.password = 'Password must be at least 6 characters';
    }
    if (password !== confirmPassword) {
      tempErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setFormLoading(true);
    try {
      await register(email, password, fullName);
      navigate('/'); // Routes user to onboarding (handled by App gating)
    } catch (err) {
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-brandIndigo via-brandPurple to-brandBlue bg-clip-text text-transparent mb-2 select-none text-glow">
            FlatSplit Pro
          </h1>
          <p className="text-slate-400 text-sm select-none">
            Smart Shared Expense Tracking for Modern Living
          </p>
        </div>

        <GlassCard>
          <h2 className="text-2xl font-bold text-slate-100 mb-6 text-center select-none">
            Create Account
          </h2>

          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-sm text-center animate-fade-in">
              {authError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                label="Full Name"
                id="fullName"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                error={errors.fullName}
                disabled={formLoading}
              />
            </div>

            <div>
              <Input
                label="Email Address"
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                disabled={formLoading}
              />
            </div>

            <div>
              <Input
                label="Password"
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                disabled={formLoading}
              />
            </div>

            <div>
              <Input
                label="Confirm Password"
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={errors.confirmPassword}
                disabled={formLoading}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={formLoading}
              className="mt-6"
            >
              Sign Up
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-400 select-none">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-brandIndigo hover:underline"
            >
              Sign in
            </Link>
          </p>
        </GlassCard>
      </div>
    </div>
  );
};

export default Register;
