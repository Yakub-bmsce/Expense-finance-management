import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import GlassCard from './GlassCard';
import Input from './Input';
import Button from './Button';
import { X, CheckCircle, ArrowRight } from 'lucide-react';

const SettleUpModal = ({ isOpen, onClose, defaultRecipientId = '', defaultAmount = '' }) => {
  const { user, settleUp } = useAuth();
  
  const [recipientId, setRecipientId] = useState('');
  const [amount, setAmount] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const roomMembers = user?.room?.members || [];
  const peers = roomMembers.filter(m => m.id !== user?.id);

  // Set defaults when opening
  useEffect(() => {
    if (isOpen) {
      setRecipientId(defaultRecipientId || (peers.length > 0 ? peers[0].id : ''));
      setAmount(defaultAmount || '');
      setError('');
      setSuccess(false);
    }
  }, [isOpen, defaultRecipientId, defaultAmount, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!recipientId) {
      setError('Please select a roommate.');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid payment amount.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await settleUp(recipientId, parsedAmount);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to settle up');
    } finally {
      setLoading(false);
    }
  };

  const recipientName = peers.find(p => p.id === recipientId)?.full_name || 'Roommate';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <GlassCard className="relative p-6 md:p-8">
          
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-glassBorder transition-colors active:scale-95 cursor-pointer"
            disabled={loading}
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-3 mb-6 select-none">
            <div className="h-10 w-10 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center font-bold">
              <CheckCircle size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Settle Balance</h2>
              <p className="text-slate-500 text-[11px]">Log a direct bank transfer or cash payment.</p>
            </div>
          </div>

          {success ? (
            <div className="text-center py-8 space-y-4 animate-fade-in select-none">
              <div className="flex justify-center text-green-400 animate-bounce">
                <CheckCircle size={56} />
              </div>
              <div>
                <p className="text-slate-200 font-bold text-lg">Payment Logged!</p>
                <p className="text-xs text-slate-400 mt-1">
                  Sent ₹{parseFloat(amount).toFixed(2)} to {recipientName}
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-sm text-center">
                  {error}
                </div>
              )}

              {peers.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs border border-glassBorder rounded-xl select-none">
                  No other roommates have joined this room yet.
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-300 select-none">Select Roommate</label>
                    <select
                      className="glass-input h-[50px] py-0 cursor-pointer"
                      value={recipientId}
                      onChange={(e) => setRecipientId(e.target.value)}
                      disabled={loading}
                    >
                      {peers.map(p => (
                        <option key={p.id} value={p.id} className="bg-slate-900">{p.full_name}</option>
                      ))}
                    </select>
                  </div>

                  <Input
                    label="Amount Paid (₹)"
                    id="settleAmt"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={loading}
                  />

                  <div className="pt-2 flex items-center justify-between text-xs text-slate-400 bg-slate-950/40 p-3 rounded-xl border border-glassBorder select-none">
                    <span className="font-semibold text-brandIndigo flex items-center gap-1">
                      {user?.full_name}
                      <ArrowRight size={12} />
                      {recipientName}
                    </span>
                    <span className="font-bold text-slate-300">
                      ₹{amount ? parseFloat(amount).toFixed(2) : '0.00'}
                    </span>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    loading={loading}
                    className="mt-6"
                  >
                    Confirm Settle Up
                  </Button>
                </>
              )}
            </form>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default SettleUpModal;
