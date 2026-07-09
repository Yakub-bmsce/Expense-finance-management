import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import GlassCard from '../components/GlassCard';
import Input from '../components/Input';
import Button from '../components/Button';
import { Mail, CheckCircle, ArrowLeft } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Email is required');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await axios.post('/api/auth/forgot-password', { email });
      setMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-brandIndigo via-brandPurple to-brandBlue bg-clip-text text-transparent mb-2 select-none text-glow">
            FlatSplit Pro
          </h1>
        </div>

        <GlassCard>
          <div className="flex items-center gap-2 mb-6">
            <Link to="/login" className="text-slate-400 hover:text-slate-200 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h2 className="text-2xl font-bold text-slate-100 select-none">
              Reset Password
            </h2>
          </div>

          {message ? (
            <div className="text-center py-6 space-y-4">
              <div className="flex justify-center text-green-400 animate-bounce">
                <CheckCircle size={48} />
              </div>
              <p className="text-slate-200 font-medium">
                {message}
              </p>
              <p className="text-sm text-slate-400">
                You can close this tab or return to the login page.
              </p>
              <div className="pt-4">
                <Link to="/login">
                  <Button variant="secondary">Back to Login</Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-slate-400 text-sm mb-6 select-none">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              {error && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-sm text-center">
                  {error}
                </div>
              )}

              <div>
                <Input
                  label="Email Address"
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={error}
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                loading={loading}
                className="mt-6"
              >
                Send Reset Link
              </Button>
            </form>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default ForgotPassword;
