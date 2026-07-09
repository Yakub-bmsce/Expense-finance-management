import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Filter, Trash2, Edit3, ChevronDown, ChevronUp, Tag, ShieldAlert, EyeOff, CheckCircle2 } from 'lucide-react';

const ExpenseHistory = ({ onEditClick }) => {
  const { user, expenses, deleteExpense } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedExpense, setExpandedExpense] = useState(null); // stores ID of expanded row
  const [deleteLoading, setDeleteLoading] = useState(null);

  const isAdmin = user?.room?.role === 'admin';

  const handleDelete = async (id) => {
    if (window.confirm('Delete this expense? An audit trace will be maintained in the database.')) {
      setDeleteLoading(id);
      try {
        await deleteExpense(id);
      } catch (err) {
        alert(err.message || 'Failed to delete expense');
      } finally {
        setDeleteLoading(null);
      }
    }
  };

  const handleToggleExpand = (id) => {
    setExpandedExpense(prev => (prev === id ? null : id));
  };

  // Filter logic
  const filteredExpenses = expenses.filter(exp => {
    // 1. Category filter
    if (activeCategory === 'private') {
      if (!exp.is_private) return false;
    } else if (activeCategory === 'payments') {
      if (exp.category !== 'payment') return false;
    } else if (activeCategory !== 'all') {
      if (exp.category !== activeCategory || exp.is_private) return false;
    }

    // 2. Search filter
    if (searchQuery.trim()) {
      return exp.description.toLowerCase().includes(searchQuery.toLowerCase());
    }

    return true;
  });

  const categories = [
    { value: 'all', label: 'All Bills' },
    { value: 'groceries', label: 'Groceries' },
    { value: 'rent', label: 'Rent' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'entertainment', label: 'Fun' },
    { value: 'payments', label: 'Payments' },
    { value: 'private', label: 'Private' }
  ];

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 select-none">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search bills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-input pl-10 py-2.5 w-full text-sm"
          />
        </div>

        {/* Category Selector dropdown/scroll */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
          {categories.map(c => (
            <button
              key={c.value}
              onClick={() => setActiveCategory(c.value)}
              className={`py-2 px-3.5 rounded-xl border text-xs font-bold whitespace-nowrap transition-all duration-300 cursor-pointer ${activeCategory === c.value ? 'bg-brandIndigo text-white border-brandIndigo' : 'bg-slate-900/30 border-glassBorder text-slate-400 hover:border-white/5'}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Roster of expenses */}
      {filteredExpenses.length === 0 ? (
        <div className="py-12 text-center text-slate-500 border border-glassBorder rounded-2xl bg-slate-900/20 select-none">
          <p className="text-xs">No expenses found matching the filters.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {filteredExpenses.map((exp) => {
            const isPayer = exp.payer_id === user?.id;
            const canModify = isPayer || isAdmin;
            const isPayment = exp.category === 'payment';
            const isExpanded = expandedExpense === exp.id;

            return (
              <div 
                key={exp.id}
                className={`rounded-xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-brandIndigo/40 bg-indigo-500/[0.02]' : 'border-glassBorder hover:border-slate-800 bg-slate-900/20'}`}
              >
                
                {/* Main Row */}
                <div 
                  onClick={() => handleToggleExpand(exp.id)}
                  className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-white/[0.01] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Icon based on category */}
                    <div className={`p-2.5 rounded-lg border ${isPayment ? 'bg-green-500/10 border-green-500/20 text-green-400' : exp.is_private ? 'bg-slate-800 border-glassBorder text-slate-400' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'}`}>
                      {isPayment ? <CheckCircle2 size={16} /> : <Tag size={16} />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-200 text-sm">{exp.description}</span>
                        {exp.is_private && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 flex items-center gap-0.5 select-none font-bold">
                            <EyeOff size={8} />
                            Private
                          </span>
                        )}
                        {!isPayment && !exp.is_private && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/10 font-bold uppercase tracking-wider select-none">
                            {exp.category}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Paid by {isPayer ? 'You' : exp.payer_name} &bull; {exp.created_at ? new Date(exp.created_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`font-mono font-bold text-sm ${isPayment ? 'text-green-400' : 'text-slate-200'}`}>
                      ₹{parseFloat(exp.amount).toFixed(2)}
                    </span>
                    <button className="text-slate-500 hover:text-slate-300">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-glassBorder animate-fade-in space-y-4 bg-slate-950/20 select-none">
                    
                    {/* Splits Details */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Split Breakdown</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {exp.splits?.map((split) => (
                          <div 
                            key={split.id}
                            className="flex justify-between items-center p-2 rounded-lg bg-slate-900/30 border border-glassBorder/60 text-xs"
                          >
                            <span className="font-medium text-slate-300">{split.user_name}</span>
                            <span className="font-mono font-semibold text-slate-400">
                              ₹{parseFloat(split.share_amount).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions Panel */}
                    {canModify && !isPayment && (
                      <div className="flex justify-end gap-2 pt-2 border-t border-glassBorder/40">
                        {isPayer && (
                          <Button
                            variant="outline"
                            onClick={() => onEditClick(exp)}
                            className="py-1.5 px-3 text-[10px] w-auto flex items-center gap-1 uppercase"
                          >
                            <Edit3 size={12} />
                            Edit
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => handleDelete(exp.id)}
                          loading={deleteLoading === exp.id}
                          className="py-1.5 px-3 text-[10px] w-auto border-red-500/20 text-red-400 hover:bg-red-500/5 hover:border-red-500/30 flex items-center gap-1 uppercase"
                        >
                          <Trash2 size={12} />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ExpenseHistory;
