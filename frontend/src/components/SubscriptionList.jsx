import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, Trash2, Tag, AlertCircle, Plus } from 'lucide-react';
import Button from './Button';

const SubscriptionList = ({ onAddClick }) => {
  const { user, subscriptions, deleteSubscription } = useAuth();
  
  const isAdmin = user?.room?.role === 'admin';

  const handleDelete = async (id, name) => {
    if (window.confirm(`Stop tracking the recurring bill: "${name}"?`)) {
      try {
        await deleteSubscription(id);
      } catch (err) {
        alert(err.message || 'Failed to remove subscription');
      }
    }
  };

  // Calculate total monthly burn rate
  const calculateBurnRate = () => {
    let total = 0;
    subscriptions.forEach(sub => {
      const amt = parseFloat(sub.amount);
      if (sub.billing_cycle === 'weekly') {
        total += amt * (365 / 7 / 12);
      } else if (sub.billing_cycle === 'yearly') {
        total += amt / 12;
      } else {
        total += amt;
      }
    });
    return total;
  };

  const burnRate = calculateBurnRate();
  const roomMembersCount = user?.room?.members?.length || 1;
  const myEstimatedShare = burnRate / roomMembersCount;

  return (
    <div className="space-y-6">
      
      {/* Burn Rate Stats Card */}
      <div className="p-4 rounded-2xl bg-indigo-500/[0.03] border border-brandIndigo/25 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block select-none">Room Monthly Burn-Rate</span>
          <span className="text-2xl font-black text-slate-200 tracking-tight">
            ${burnRate.toFixed(2)}/mo
          </span>
          <span className="text-[10px] text-slate-500 block mt-1 select-none">
            Your estimated share: ${myEstimatedShare.toFixed(2)}/mo
          </span>
        </div>

        <button
          onClick={onAddClick}
          className="p-2.5 rounded-xl bg-brandIndigo text-white hover:bg-indigo-500 border border-indigo-400/20 active:scale-95 transition-all shadow-md shadow-indigo-500/10 cursor-pointer flex items-center justify-center"
          title="Track Subscription"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Subscriptions roster list */}
      <div>
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 select-none">Tracked Subscriptions</h4>
        {subscriptions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 border border-glassBorder rounded-xl bg-slate-900/10 select-none">
            No recurring bills tracked yet.
          </div>
        ) : (
          <div className="space-y-2 pr-1 max-h-52 overflow-y-auto">
            {subscriptions.map((sub) => {
              const isPayer = sub.payer_id === user?.id;
              const canDelete = isPayer || isAdmin;

              return (
                <div 
                  key={sub.id}
                  className="p-3.5 rounded-xl bg-slate-900/30 border border-glassBorder hover:border-slate-800 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">
                      <Calendar size={14} />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-200 block leading-tight">{sub.name}</span>
                      <span className="text-[9.5px] text-slate-500 select-none">
                        Paid by {isPayer ? 'You' : sub.payer_name} &bull; Next: {sub.next_billing_date}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 select-none">
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-slate-200 block">
                        ${parseFloat(sub.amount).toFixed(2)}
                      </span>
                      <span className="text-[8px] uppercase tracking-wider font-bold text-slate-500 block">
                        {sub.billing_cycle}
                      </span>
                    </div>

                    {canDelete && (
                      <button
                        onClick={() => handleDelete(sub.id, sub.name)}
                        className="p-1.5 rounded-lg bg-red-950/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 border border-red-500/10 transition-colors cursor-pointer"
                        title="Remove subscription"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default SubscriptionList;
