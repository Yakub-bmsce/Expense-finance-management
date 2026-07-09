import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import GlassCard from './GlassCard';
import Input from './Input';
import Button from './Button';
import { X, DollarSign, Tag, Info, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react';

const ExpenseModal = ({ isOpen, onClose, expenseToEdit = null }) => {
  const { user, createExpense, updateExpense } = useAuth();
  
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('groceries');
  const [isPrivate, setIsPrivate] = useState(false);
  const [splitType, setSplitType] = useState('equal');
  
  // Splits tracking
  const [splits, setSplits] = useState([]); // Array of { userId, fullName, shareAmount, percentage, shares }
  const [excludedMembers, setExcludedMembers] = useState([]); // List of userIds excluded from equal split
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const roomMembers = user?.room?.members || [];

  // Reset/Load form on open
  useEffect(() => {
    if (isOpen) {
      if (expenseToEdit) {
        setDescription(expenseToEdit.description);
        setAmount(expenseToEdit.amount.toString());
        setCategory(expenseToEdit.category);
        setIsPrivate(expenseToEdit.is_private);
        setSplitType(expenseToEdit.splits?.length > 1 ? 'equal' : 'equal'); // default
        
        // Load splits
        const loadedSplits = roomMembers.map(m => {
          const matched = expenseToEdit.splits?.find(s => s.user_id === m.id);
          return {
            userId: m.id,
            fullName: m.full_name,
            shareAmount: matched ? matched.share_amount.toString() : '0',
            percentage: matched ? ((matched.share_amount / expenseToEdit.amount) * 100).toFixed(0) : '0',
            shares: '1'
          };
        });
        setSplits(loadedSplits);
      } else {
        setDescription('');
        setAmount('');
        setCategory('groceries');
        setIsPrivate(false);
        setSplitType('equal');
        setExcludedMembers([]);
        
        // Initialize splits template
        const initialSplits = roomMembers.map(m => ({
          userId: m.id,
          fullName: m.full_name,
          shareAmount: '',
          percentage: '',
          shares: '1'
        }));
        setSplits(initialSplits);
      }
      setError('');
    }
  }, [isOpen, expenseToEdit, user]);

  if (!isOpen) return null;

  const handleToggleExclude = (userId) => {
    if (excludedMembers.includes(userId)) {
      setExcludedMembers(prev => prev.filter(id => id !== userId));
    } else {
      if (excludedMembers.length + 1 >= roomMembers.length) {
        alert('You must include at least one member in the split.');
        return;
      }
      setExcludedMembers(prev => [...prev, userId]);
    }
  };

  const handleSplitValueChange = (userId, field, value) => {
    setSplits(prev => prev.map(s => {
      if (s.userId === userId) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  const validateForm = () => {
    if (!description.trim()) {
      setError('Please provide a description.');
      return false;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount.');
      return false;
    }

    if (!isPrivate) {
      if (splitType === 'unequal') {
        const sum = splits.reduce((acc, s) => acc + parseFloat(s.shareAmount || 0), 0);
        if (Math.abs(sum - parsedAmount) > 0.05) {
          setError(`Split sum ($${sum.toFixed(2)}) must equal total amount ($${parsedAmount.toFixed(2)})`);
          return false;
        }
      } else if (splitType === 'percentage') {
        const sum = splits.reduce((acc, s) => acc + parseFloat(s.percentage || 0), 0);
        if (Math.abs(sum - 100) > 0.1) {
          setError(`Percentages must sum to exactly 100% (currently ${sum}%)`);
          return false;
        }
      } else if (splitType === 'shares') {
        const sum = splits.reduce((acc, s) => acc + parseFloat(s.shares || 0), 0);
        if (sum <= 0) {
          setError('Shares must sum to greater than 0');
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    const payload = {
      description,
      amount: parseFloat(amount),
      category,
      isPrivate,
      splitType,
      splits,
      excludedMembers,
      receiptUrl: null
    };

    try {
      if (expenseToEdit) {
        await updateExpense(expenseToEdit.id, payload);
      } else {
        await createExpense(payload);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'groceries', label: 'Groceries / Food' },
    { value: 'rent', label: 'Apartment Rent' },
    { value: 'utilities', label: 'Electricity & Bills' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'others', label: 'Other Expense' }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-fade-in">
        <GlassCard className="relative overflow-visible p-6 md:p-8">
          
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-glassBorder transition-colors active:scale-95 cursor-pointer"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-3 mb-6 select-none">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-brandIndigo flex items-center justify-center font-bold">
              <DollarSign size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">
                {expenseToEdit ? 'Edit Room Expense' : 'Log New Expense'}
              </h2>
              <p className="text-slate-500 text-[11px]">
                {expenseToEdit ? 'Update transaction split sheets.' : 'Log shared bills or private items.'}
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Description"
                id="desc"
                placeholder="e.g. WiFi Bill, Milk & Eggs"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
              />
              <Input
                label="Amount Paid ($)"
                id="amt"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-300 select-none">Category</label>
                <select
                  className="glass-input h-[50px] py-0 cursor-pointer"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={loading}
                >
                  {categories.map(c => (
                    <option key={c.value} value={c.value} className="bg-slate-900">{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Private toggle */}
              <div className="flex flex-col justify-end">
                <div 
                  onClick={() => setIsPrivate(p => !p)}
                  className="flex items-center justify-between glass-input h-[50px] cursor-pointer select-none hover:border-glassBorderActive"
                >
                  <div className="flex items-center gap-1.5">
                    <Info size={14} className="text-slate-400" />
                    <span className="text-sm font-semibold text-slate-300">Private Expense</span>
                  </div>
                  {isPrivate ? (
                    <ToggleRight size={28} className="text-brandIndigo" />
                  ) : (
                    <ToggleLeft size={28} className="text-slate-500" />
                  )}
                </div>
              </div>
            </div>

            {/* SPLIT OPTIONS (Only if not private) */}
            {!isPrivate && user?.room && (
              <div className="pt-4 border-t border-glassBorder space-y-4 animate-fade-in">
                <div className="flex items-center justify-between select-none">
                  <label className="text-sm font-bold text-slate-300">Split Method</label>
                  <div className="flex gap-1 bg-slate-950/60 p-1 rounded-lg border border-glassBorder">
                    {['equal', 'unequal', 'percentage', 'shares'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSplitType(type)}
                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all duration-200 ${splitType === type ? 'bg-brandIndigo text-white' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Equal Split: list members with checkboxes to exclude them */}
                {splitType === 'equal' && (
                  <div className="space-y-2 animate-fade-in select-none">
                    <span className="text-xs text-slate-400 block mb-1">Select roommates to INCLUDE:</span>
                    <div className="grid grid-cols-2 gap-2">
                      {roomMembers.map((member) => {
                        const isExcluded = excludedMembers.includes(member.id);
                        return (
                          <div
                            key={member.id}
                            onClick={() => handleToggleExclude(member.id)}
                            className={`p-2.5 rounded-xl border cursor-pointer text-xs font-semibold flex items-center justify-between transition-all duration-200 ${!isExcluded ? 'border-brandIndigo/50 bg-indigo-500/5 text-indigo-300' : 'border-glassBorder text-slate-500 hover:border-white/5'}`}
                          >
                            <span>{member.full_name}</span>
                            <span className={`h-2.5 w-2.5 rounded-full ${!isExcluded ? 'bg-brandIndigo' : 'bg-slate-800'}`}></span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Custom split values lists */}
                {splitType !== 'equal' && (
                  <div className="space-y-3 animate-fade-in max-h-40 overflow-y-auto pr-1">
                    {splits.map((s) => (
                      <div key={s.userId} className="flex items-center justify-between gap-4 p-2 rounded-xl bg-slate-900/30 border border-glassBorder">
                        <span className="text-xs font-semibold text-slate-300">{s.fullName}</span>
                        <div className="w-28 flex items-center">
                          {splitType === 'unequal' && (
                            <div className="relative w-full">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                              <input
                                type="number"
                                placeholder="0.00"
                                value={s.shareAmount}
                                onChange={(e) => handleSplitValueChange(s.userId, 'shareAmount', e.target.value)}
                                className="w-full text-right bg-slate-950/40 border border-glassBorder rounded-lg py-1 px-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brandIndigo"
                              />
                            </div>
                          )}
                          {splitType === 'percentage' && (
                            <div className="relative w-full flex items-center gap-1.5">
                              <input
                                type="number"
                                placeholder="0"
                                value={s.percentage}
                                onChange={(e) => handleSplitValueChange(s.userId, 'percentage', e.target.value)}
                                className="w-full text-right bg-slate-950/40 border border-glassBorder rounded-lg py-1 px-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brandIndigo"
                              />
                              <span className="text-slate-500 text-xs font-semibold">%</span>
                            </div>
                          )}
                          {splitType === 'shares' && (
                            <div className="relative w-full flex items-center gap-1.5">
                              <input
                                type="number"
                                placeholder="1"
                                value={s.shares}
                                onChange={(e) => handleSplitValueChange(s.userId, 'shares', e.target.value)}
                                className="w-full text-right bg-slate-950/40 border border-glassBorder rounded-lg py-1 px-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brandIndigo"
                              />
                              <span className="text-slate-500 text-xs font-semibold">share(s)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="mt-6"
            >
              {expenseToEdit ? 'Save Changes' : 'Log Expense'}
            </Button>
          </form>
        </GlassCard>
      </div>
    </div>
  );
};

export default ExpenseModal;
