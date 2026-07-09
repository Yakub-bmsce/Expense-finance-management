import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Onboarding from './pages/Onboarding';
import RoomSetup from './pages/RoomSetup';
import Dashboard from './pages/Dashboard';

// Gated Route for Dashboard (User must be logged in, onboarded, and in a room)
const DashboardRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.onboarded) return <Navigate to="/onboarding" replace />;
  if (!user.room) return <Navigate to="/room-setup" replace />;

  return children;
};

// Gated Route for Onboarding (User must be logged in, but NOT onboarded yet)
const OnboardingRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.onboarded) return <Navigate to="/" replace />;

  return children;
};

// Gated Route for Room Setup (User must be logged in and onboarded, but NOT in a room yet)
const RoomSetupRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.onboarded) return <Navigate to="/onboarding" replace />;
  if (user.room) return <Navigate to="/" replace />;

  return children;
};

// Anonymous Route (Logged in users redirected to Dashboard)
const AnonymousRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;

  return children;
};

// Simple visual session check loader
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-darkbg text-slate-100 font-sans select-none">
    <div className="flex flex-col items-center gap-3">
      <svg className="animate-spin h-8 w-8 text-brandIndigo" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span className="text-xs text-slate-400 font-semibold tracking-wide">Syncing FlatSplit Pro...</span>
    </div>
  </div>
);

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public / Anonymous Routes */}
          <Route path="/login" element={
            <AnonymousRoute>
              <Login />
            </AnonymousRoute>
          } />
          <Route path="/register" element={
            <AnonymousRoute>
              <Register />
            </AnonymousRoute>
          } />
          <Route path="/forgot-password" element={
            <AnonymousRoute>
              <ForgotPassword />
            </AnonymousRoute>
          } />

          {/* Onboarding Wizard Gate */}
          <Route path="/onboarding" element={
            <OnboardingRoute>
              <Onboarding />
            </OnboardingRoute>
          } />

          {/* Room Setup Gate */}
          <Route path="/room-setup" element={
            <RoomSetupRoute>
              <RoomSetup />
            </RoomSetupRoute>
          } />

          {/* Core Dashboard */}
          <Route path="/" element={
            <DashboardRoute>
              <Dashboard />
            </DashboardRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
