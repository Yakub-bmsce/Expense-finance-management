import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import { Copy, Check, RefreshCw, UserMinus, LogOut, Users, ShieldAlert, Sparkles } from 'lucide-react';

const Dashboard = () => {
  const { user, logout, regenerateJoinCode, removeMember, leaveRoom, refreshUser } = useAuth();
  
  const [copied, setCopied] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // stores user ID being removed
  const [leaveLoading, setLeaveLoading] = useState(false);

  // Auto-refresh room details on mount
  useEffect(() => {
    refreshUser();
  }, []);

  const handleCopyCode = () => {
    if (user?.room?.join_code) {
      navigator.clipboard.writeText(user.room.join_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerateCode = async () => {
    if (window.confirm('Are you sure you want to regenerate the join code? Any old invitation codes will stop working immediately.')) {
      setLoadingCode(true);
      try {
        await regenerateJoinCode();
      } catch (err) {
        alert(err.message || 'Failed to regenerate code');
      } finally {
        setLoadingCode(false);
      }
    }
  };

  const handleRemoveMember = async (userId, memberName) => {
    if (window.confirm(`Are you sure you want to evict ${memberName} from this room?`)) {
      setActionLoading(userId);
      try {
        await removeMember(userId);
      } catch (err) {
        alert(err.message || 'Failed to remove member');
      } finally {
        setActionLoading(null);
      }
    }
  };

  const handleLeaveRoom = async () => {
    const confirmationMsg = user?.room?.role === 'admin' 
      ? 'Warning: You are an Admin. If you leave, admin privileges will automatically transfer to the next member. If you are the last member, the room will be deleted. Do you want to proceed?'
      : 'Are you sure you want to leave this room?';

    if (window.confirm(confirmationMsg)) {
      setLeaveLoading(true);
      try {
        await leaveRoom();
      } catch (err) {
        alert(err.message || 'Failed to leave room');
      } finally {
        setLeaveLoading(false);
      }
    }
  };

  const room = user?.room;
  const members = room?.members || [];
  const isAdmin = room?.role === 'admin';

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Navbar */}
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 mb-10 select-none">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brandIndigo to-brandPurple flex items-center justify-center font-extrabold text-white text-xl shadow-lg glow-blue select-none">
            F
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-brandIndigo via-brandPurple to-brandBlue bg-clip-text text-transparent text-glow">
              FlatSplit Pro
            </h1>
            <p className="text-slate-500 text-xs">Room Dashboard &bull; Phase 1 Sandbox</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-900/60 py-1.5 px-3 rounded-xl border border-glassBorder">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-ping"></div>
            <span className="text-xs text-slate-300 font-semibold">{user?.full_name}</span>
          </div>

          <Button 
            variant="outline" 
            onClick={logout}
            className="py-2 px-3 text-xs w-auto border-red-500/20 text-red-400 hover:bg-red-500/5 hover:border-red-500/40"
          >
            <LogOut size={14} />
            Logout
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: Room Profile & Invitation (Bento Cell 1) */}
        <div className="md:col-span-1 space-y-6">
          
          {/* Room Summary */}
          <GlassCard className="flex flex-col justify-between h-auto gap-6 animate-fade-in">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider select-none">Active Room</span>
                {isAdmin ? (
                  <span className="text-xs py-1 px-2.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold select-none flex items-center gap-1">
                    <ShieldAlert size={12} />
                    Admin Access
                  </span>
                ) : (
                  <span className="text-xs py-1 px-2.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/30 font-bold select-none">
                    Member Role
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight leading-tight">
                  {room?.name || 'Unnamed Room'}
                </h2>
                <p className="text-xs text-slate-400 mt-1 select-none">Created at: {room?.created_at ? new Date(room.created_at).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-glassBorder flex flex-col gap-3">
              <Button
                variant="outline"
                onClick={handleLeaveRoom}
                loading={leaveLoading}
                className="text-xs py-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/5 hover:border-red-500/30"
              >
                Leave this Room
              </Button>
            </div>
          </GlassCard>

          {/* Invitation details (Bento Cell 2) */}
          <GlassCard className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 select-none">Invite Roommates</h3>
            
            <p className="text-xs text-slate-400 mb-4 select-none">
              Share this secure code with your flatmates. Once they sign up, they can enter it to join this room.
            </p>

            <div className="bg-slate-950/80 rounded-xl p-3.5 border border-glassBorder flex items-center justify-between mb-4">
              <code className="text-lg font-mono font-bold text-white tracking-widest px-1">
                {room?.join_code || '------'}
              </code>
              <button
                onClick={handleCopyCode}
                className="p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-slate-200 border border-glassBorder transition-all duration-200 active:scale-95"
                title="Copy Join Code"
              >
                {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>
            </div>

            {isAdmin && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={handleRegenerateCode}
                  loading={loadingCode}
                  className="py-2.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  <RefreshCw size={14} className={loadingCode ? 'animate-spin' : ''} />
                  Regenerate Join Code
                </Button>
                <p className="text-[10px] text-slate-500 mt-2 text-center select-none">
                  Regenerating invalidates the old code immediately.
                </p>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Right Column: Member Roster (Bento Cell 3 - Wide) */}
        <div className="md:col-span-2">
          <GlassCard className="h-full flex flex-col justify-between animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <div>
              <div className="flex items-center justify-between mb-6 select-none">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-brandIndigo">
                    <Users size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-200">Room Members ({members.length})</h3>
                </div>
              </div>

              <div className="space-y-3">
                {members.map((member) => (
                  <div 
                    key={member.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-900/40 border border-glassBorder hover:border-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="h-10 w-10 rounded-lg bg-slate-800 border border-glassBorder flex items-center justify-center font-bold text-indigo-400 select-none">
                        {member.full_name?.charAt(0).toUpperCase() || 'M'}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200 text-sm">{member.full_name}</span>
                          {member.id === user.id && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 font-semibold select-none">You</span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 block">{member.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {member.role === 'admin' ? (
                        <span className="text-xs py-1 px-2.5 rounded-lg bg-indigo-500/10 text-indigo-300 font-semibold border border-indigo-500/10 select-none">
                          Admin
                        </span>
                      ) : (
                        <span className="text-xs py-1 px-2.5 rounded-lg bg-slate-800/80 text-slate-400 font-semibold select-none">
                          Roommate
                        </span>
                      )}

                      {/* Admin eviction controls */}
                      {isAdmin && member.id !== user.id && (
                        <button
                          onClick={() => handleRemoveMember(member.id, member.full_name)}
                          disabled={actionLoading === member.id}
                          className="p-2 rounded-lg bg-red-950/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 border border-red-500/10 transition-colors cursor-pointer"
                          title={`Evict ${member.full_name}`}
                        >
                          <UserMinus size={14} className={actionLoading === member.id ? 'animate-pulse' : ''} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Micro-Interaction Highlight in Dashboard */}
            <div className="mt-8 p-4 rounded-xl bg-gradient-to-r from-brandIndigo/5 to-brandPurple/5 border border-glassBorder flex items-center justify-between select-none">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-purple-400 animate-pulse" />
                <span className="text-xs text-slate-400 font-medium">FlatSplit Pro is ready for Phase 2: Expenses & Splitting.</span>
              </div>
              <span className="text-[10px] font-bold text-brandIndigo uppercase tracking-wider">Awaiting Phase 2</span>
            </div>
          </GlassCard>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
