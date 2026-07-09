import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import ExpenseModal from '../components/ExpenseModal';
import SettleUpModal from '../components/SettleUpModal';
import SubscriptionModal from '../components/SubscriptionModal';
import BalancesList from '../components/BalancesList';
import ExpenseHistory from '../components/ExpenseHistory';
import SubscriptionList from '../components/SubscriptionList';
import NotificationBell from '../components/NotificationBell';
import { Copy, Check, RefreshCw, UserMinus, LogOut, Users, ShieldAlert, Plus, CheckCircle, Receipt, ArrowRightLeft, Calendar } from 'lucide-react';

const Dashboard = () => {
  const { 
    user, 
    logout, 
    regenerateJoinCode, 
    removeMember, 
    leaveRoom, 
    refreshUser
  } = useAuth();
  
  // Modals state
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [isSubOpen, setIsSubOpen] = useState(false);
  
  const [expenseToEdit, setExpenseToEdit] = useState(null);
  const [settleRecipientId, setSettleRecipientId] = useState('');
  const [settleAmount, setSettleAmount] = useState('');

  // UI helpers
  const [copied, setCopied] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [leaveLoading, setLeaveLoading] = useState(false);

  const [timeLeft, setTimeLeft] = useState(30);

  // Auto-refresh room details on mount
  useEffect(() => {
    refreshUser();
  }, []);

  // Auto-regenerate secure numeric OTP code every 30 seconds
  useEffect(() => {
    if (!user?.room || user?.room?.role !== 'admin') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          regenerateJoinCode();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [user?.room?.id]);

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
        setTimeLeft(30); // reset visual ticking clock
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

  // Actions Callbacks
  const triggerSettleModal = (recipientId, amount) => {
    setSettleRecipientId(recipientId);
    setSettleAmount(amount.toString());
    setIsSettleOpen(true);
  };

  const triggerEditExpenseModal = (expense) => {
    setExpenseToEdit(expense);
    setIsExpenseOpen(true);
  };

  const triggerAddExpenseModal = () => {
    setExpenseToEdit(null);
    setIsExpenseOpen(true);
  };

  const triggerAddSettleModal = () => {
    setSettleRecipientId('');
    setSettleAmount('');
    setIsSettleOpen(true);
  };

  const room = user?.room;
  const members = room?.members || [];
  const isAdmin = room?.role === 'admin';

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Navbar */}
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 select-none">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brandIndigo to-brandPurple flex items-center justify-center font-extrabold text-white text-xl shadow-lg glow-blue select-none">
            F
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-brandIndigo via-brandPurple to-brandBlue bg-clip-text text-transparent text-glow">
              FlatSplit Pro
            </h1>
            <p className="text-slate-500 text-xs">Smart Shared Expense Tracker</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          {/* Phase 3 Alerts bell */}
          <NotificationBell />

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

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Room Profile, Invitation, and Member roster (Bento Layout) */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Room Summary card */}
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

          {/* Invitation details */}
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
              <div className="space-y-3 pt-1 select-none animate-fade-in">
                {/* Visual ticking progress bar */}
                <div className="w-full bg-slate-950/40 rounded-full h-1.5 border border-glassBorder overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full transition-all duration-1000 ease-linear"
                    style={{ width: `${(timeLeft / 30) * 100}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
                  <span>SECURE OTP MODE</span>
                  <span className="text-indigo-400 animate-pulse">Auto-regen in {timeLeft}s</span>
                </div>

                <Button
                  variant="outline"
                  onClick={handleRegenerateCode}
                  loading={loadingCode}
                  className="py-2.5 text-xs text-slate-400 hover:text-slate-200 mt-2"
                >
                  <RefreshCw size={14} className={loadingCode ? 'animate-spin' : ''} />
                  Force Regenerate Code
                </Button>
              </div>
            )}
          </GlassCard>

          {/* Room Roster */}
          <GlassCard className="animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center justify-between mb-4 select-none">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-brandIndigo" />
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Room Members ({members.length})</h3>
              </div>
            </div>

            <div className="space-y-2.5 pr-1 max-h-40 overflow-y-auto">
              {members.map((member) => (
                <div 
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-glassBorder hover:border-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-slate-800 border border-glassBorder flex items-center justify-center font-bold text-indigo-400 text-xs select-none">
                      {member.full_name?.charAt(0).toUpperCase() || 'M'}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-200 text-xs leading-none">{member.full_name}</span>
                        {member.id === user.id && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-slate-800 text-slate-500 select-none">You</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">{member.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {member.role === 'admin' ? (
                      <span className="text-[9px] py-0.5 px-2 rounded bg-indigo-500/10 text-indigo-300 font-bold border border-indigo-500/15 select-none uppercase tracking-wider">
                        Admin
                      </span>
                    ) : (
                      <span className="text-[9px] py-0.5 px-2 rounded bg-slate-800/80 text-slate-400 font-bold select-none uppercase tracking-wider">
                        Room
                      </span>
                    )}

                    {isAdmin && member.id !== user.id && (
                      <button
                        onClick={() => handleRemoveMember(member.id, member.full_name)}
                        disabled={actionLoading === member.id}
                        className="p-1.5 rounded-lg bg-red-950/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 border border-red-500/10 transition-colors cursor-pointer"
                        title={`Evict ${member.full_name}`}
                      >
                        <UserMinus size={12} className={actionLoading === member.id ? 'animate-pulse' : ''} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Right Section: Balances, Subscriptions, and Bills History (Bento Layout) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4 select-none">
            <button
              onClick={triggerAddExpenseModal}
              className="py-3 px-4 rounded-xl font-bold bg-gradient-to-r from-brandIndigo to-indigo-500 text-white flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform shadow-lg shadow-indigo-500/10 cursor-pointer text-sm"
            >
              <Plus size={18} />
              Add Room Bill
            </button>
            
            <button
              onClick={triggerAddSettleModal}
              className="py-3 px-4 rounded-xl font-bold bg-gradient-to-r from-brandPurple to-purple-500 text-white flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform shadow-lg shadow-purple-500/10 cursor-pointer text-sm"
            >
              <ArrowRightLeft size={18} />
              Settle Roommate
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Left Sub-column: Balances and Subscriptions (Stacked) */}
            <div className="md:col-span-1 space-y-6">
              
              {/* Balances Card */}
              <GlassCard className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center gap-2 mb-4 select-none">
                  <ArrowRightLeft size={18} className="text-brandIndigo" />
                  <h3 className="text-lg font-bold text-slate-200">Balances Summary</h3>
                </div>
                <BalancesList onSettleClick={triggerSettleModal} />
              </GlassCard>

              {/* Subscriptions Card */}
              <GlassCard className="animate-fade-in" style={{ animationDelay: '0.12s' }}>
                <div className="flex items-center gap-2 mb-4 select-none">
                  <Calendar size={18} className="text-brandIndigo" />
                  <h3 className="text-lg font-bold text-slate-200">Subscription Splits</h3>
                </div>
                <SubscriptionList onAddClick={() => setIsSubOpen(true)} />
              </GlassCard>

            </div>

            {/* Right Sub-column: Shared Bills (Full vertical height) */}
            <div className="md:col-span-1 space-y-6">
              <GlassCard className="h-full animate-fade-in" style={{ animationDelay: '0.15s' }}>
                <div className="flex items-center gap-2 mb-4 select-none">
                  <Receipt size={18} className="text-brandIndigo" />
                  <h3 className="text-lg font-bold text-slate-200">Shared Bills & Logs</h3>
                </div>
                <ExpenseHistory onEditClick={triggerEditExpenseModal} />
              </GlassCard>
            </div>

          </div>
        </div>

      </div>

      {/* Modals Mounting */}
      <ExpenseModal 
        isOpen={isExpenseOpen} 
        onClose={() => setIsExpenseOpen(false)} 
        expenseToEdit={expenseToEdit} 
      />

      <SettleUpModal 
        isOpen={isSettleOpen} 
        onClose={() => setIsSettleOpen(false)} 
        defaultRecipientId={settleRecipientId}
        defaultAmount={settleAmount}
      />

      <SubscriptionModal
        isOpen={isSubOpen}
        onClose={() => setIsSubOpen(false)}
      />
    </div>
  );
};

export default Dashboard;
