import React from 'react';
import { useAuth } from '../context/AuthContext';
import { DollarSign, ArrowUpRight, ArrowDownLeft, ChevronRight, Check } from 'lucide-react';

const BalancesList = ({ onSettleClick }) => {
  const { user, balances, sendDebtReminder } = useAuth();
  
  const myUserId = user?.id;
  const userBalances = balances?.balances || [];
  const suggestedPayments = balances?.suggestedPayments || [];

  // Find current user's net position
  const myBalanceInfo = userBalances.find(b => b.userId === myUserId);
  const myNet = myBalanceInfo ? myBalanceInfo.netBalance : 0;

  // Filter peers
  const peerBalances = userBalances.filter(b => b.userId !== myUserId);

  return (
    <div className="space-y-6">
      
      {/* Net Position Header Card */}
      <div className={`p-6 rounded-2xl border-2 flex items-center justify-between transition-all duration-300 ${myNet > 0.01 ? 'border-green-500/20 bg-green-500/5' : myNet < -0.01 ? 'border-red-500/20 bg-red-500/5' : 'border-glassBorder bg-slate-900/20'}`}>
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block select-none">Your Net Balance</span>
          <span className={`text-4xl font-black tracking-tight ${myNet > 0.01 ? 'text-green-400' : myNet < -0.01 ? 'text-red-400' : 'text-slate-300'}`}>
            {myNet > 0.01 ? `+₹${myNet.toFixed(2)}` : myNet < -0.01 ? `-₹${Math.abs(myNet).toFixed(2)}` : '₹0.00'}
          </span>
          <span className="text-xs text-slate-500 block mt-1 select-none">
            {myNet > 0.01 ? 'Overall, you are owed money' : myNet < -0.01 ? 'Overall, you owe money' : 'All settled up! No active debts.'}
          </span>
        </div>
        
        <div className={`p-3.5 rounded-full ${myNet > 0.01 ? 'bg-green-500/10 text-green-400' : myNet < -0.01 ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-500'}`}>
          {myNet > 0.01 ? <ArrowUpRight size={28} /> : myNet < -0.01 ? <ArrowDownLeft size={28} /> : <Check size={28} />}
        </div>
      </div>

      {/* Suggested Settle Ups */}
      <div>
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 select-none">Suggested Settle Ups</h4>
        {suggestedPayments.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500 border border-glassBorder rounded-xl select-none">
            No payments required. Everyone is even!
          </div>
        ) : (
          <div className="space-y-2">
            {suggestedPayments.map((p, idx) => {
              const isPayer = p.fromUserId === myUserId;
              const isRecipient = p.toUserId === myUserId;
              const isInvolved = isPayer || isRecipient;

              return (
                <div 
                  key={idx}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${isInvolved ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-slate-900/20 border-glassBorder'}`}
                >
                  <div className="flex items-center gap-1.5 font-medium select-none">
                    <span className={isPayer ? 'text-indigo-300 font-bold' : 'text-slate-300'}>{p.fromUserName}</span>
                    <span className="text-slate-500">owes</span>
                    <span className={isRecipient ? 'text-green-400 font-bold' : 'text-slate-300'}>{p.toUserName}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-200 text-sm">
                      ₹{p.amount.toFixed(2)}
                    </span>
                    
                    {isPayer && (
                      <button
                        onClick={() => onSettleClick(p.toUserId, p.amount)}
                        className="py-1.5 px-3 rounded-lg bg-brandIndigo text-white font-bold text-[10px] hover:bg-indigo-500 transition-colors cursor-pointer flex items-center gap-1 uppercase select-none"
                      >
                        Settle
                        <ChevronRight size={10} />
                      </button>
                    )}

                    {isRecipient && (
                      <button
                        onClick={async (e) => {
                          const btn = e.currentTarget;
                          btn.disabled = true;
                          const originalText = btn.innerText;
                          btn.innerText = 'Reminded!';
                          try {
                            await sendDebtReminder(p.fromUserId, p.amount);
                          } catch (err) {
                            alert(err.message || 'Failed to send reminder');
                            btn.innerText = originalText;
                            btn.disabled = false;
                          }
                        }}
                        className="py-1.5 px-3 rounded-lg border border-amber-500/30 bg-amber-500/5 text-amber-400 font-bold text-[10px] hover:bg-amber-500/10 transition-colors cursor-pointer select-none uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Remind
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Room Roster balances list */}
      <div>
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 select-none">Roommate Balance Sheet</h4>
        <div className="space-y-2 pr-1 max-h-40 overflow-y-auto">
          {peerBalances.map((b) => (
            <div 
              key={b.userId}
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/30 border border-glassBorder hover:border-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-slate-800 border border-glassBorder flex items-center justify-center font-bold text-slate-400 text-xs select-none">
                  {b.fullName?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-200 block leading-tight">{b.fullName}</span>
                  <span className="text-[10px] text-slate-500 select-none">Paid: ₹{b.totalPaid.toFixed(0)} | Owed: ₹{b.totalOwed.toFixed(0)}</span>
                </div>
              </div>

              <span className={`text-xs font-mono font-bold ${b.netBalance > 0.01 ? 'text-green-400' : b.netBalance < -0.01 ? 'text-red-400' : 'text-slate-500'}`}>
                {b.netBalance > 0.01 ? `+₹${b.netBalance.toFixed(2)}` : b.netBalance < -0.01 ? `-₹${Math.abs(b.netBalance).toFixed(2)}` : 'Settled'}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default BalancesList;
