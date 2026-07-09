import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';
import Input from '../components/Input';
import Button from '../components/Button';
import { PlusCircle, Users, DoorOpen, LogOut } from 'lucide-react';

const RoomSetup = () => {
  const { createRoom, joinRoom, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('create'); // create / join
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!roomName.trim()) {
      setError('Please provide a name for your room.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await createRoom(roomName);
      navigate('/'); // Moves user to dashboard
    } catch (err) {
      setError(err.message || 'Failed to create room.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setError('Please provide a join code.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await joinRoom(joinCode);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to join room.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logout header */}
        <div className="flex justify-between items-center mb-6 px-1 select-none">
          <span className="text-sm font-semibold text-slate-400">Step 2: Room Connection</span>
          <button 
            onClick={logout} 
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-semibold transition-colors"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>

        <GlassCard>
          <div className="flex justify-center text-brandIndigo mb-4 animate-pulse">
            <DoorOpen size={48} />
          </div>

          <h2 className="text-2xl font-bold text-slate-100 text-center mb-1 select-none">
            Get Connected
          </h2>
          <p className="text-slate-400 text-xs text-center mb-6 select-none">
            To start tracking balances, create a new room or join an existing flat.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {/* Tabs */}
          <div className="flex bg-slate-950/60 p-1.5 rounded-xl border border-glassBorder mb-6 select-none">
            <button
              onClick={() => {
                setActiveTab('create');
                setError('');
              }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${activeTab === 'create' ? 'bg-brandIndigo text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <PlusCircle size={16} />
              Create Room
            </button>
            <button
              onClick={() => {
                setActiveTab('join');
                setError('');
              }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${activeTab === 'join' ? 'bg-brandIndigo text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Users size={16} />
              Join Room
            </button>
          </div>

          {/* TAB CONTENT: CREATE */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateRoom} className="space-y-4 animate-fade-in">
              <Input
                label="Room / Flat Name"
                id="roomName"
                placeholder="e.g. Apartment 404, Alpha Flat"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                disabled={loading}
              />
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                className="mt-6"
              >
                Create Room
              </Button>
            </form>
          )}

          {/* TAB CONTENT: JOIN */}
          {activeTab === 'join' && (
            <form onSubmit={handleJoinRoom} className="space-y-4 animate-fade-in">
              <Input
                label="Enter Join Code"
                id="joinCode"
                placeholder="e.g. FLATSPLIT99"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                disabled={loading}
              />
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                className="mt-6"
              >
                Join Room
              </Button>
            </form>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default RoomSetup;
