import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import GlassCard from './GlassCard';
import Input from './Input';
import Button from './Button';
import { X, Calendar, DollarSign } from 'lucide-react';

const SubscriptionModal = ({ isOpen, onClose }) => {
  const { createSubscription } = useAuth();
  
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('utilities');
  const [billingCycle, setBillingCycle] = useState('monthly');
  
  // Set default next billing date to 1 month from today
  const getDefaultNextBillingDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().split('T')[0];
  };
  const [nextBillingDate, setNextBillingDate] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setAmount('');
      setCategory('utilities');
      setBillingCycle('monthly');
      setNextBillingDate(getDefaultNextBillingDate());
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a subscription name.');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (!nextBillingDate) {
      setError('Please specify the next billing date.');
      return;
    }

    setLoading(true);
    setError('');

    const payload = {
      name,
      amount: parsedAmount,
      category,
      billingCycle,
      nextBillingDate
    };

    try {
      await createSubscription(payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save subscription');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'utilities', label: 'Utilities / WiFi' },
    { value: 'entertainment', label: 'Streaming / Entertainment' },
    { value: 'rent', label: 'Apartment Rent' },
    { value: 'groceries', label: 'Groceries Feed' },
    { value: 'others', label: 'Others' }
  ];

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
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-brandIndigo flex items-center justify-center font-bold">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Track Subscription</h2>
              <p className="text-slate-500 text-[11px]">Auto-creates shared room bills upon billing dates.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <Input
              label="Subscription Name"
              id="subName"
              placeholder="e.g. Netflix, WiFi Fiber"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Amount / Cycle ($)"
                id="subAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
              />

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-300 select-none">Cycle</label>
                <select
                  className="glass-input h-[50px] py-0 cursor-pointer"
                  value={billingCycle}
                  onChange={(e) => setBillingCycle(e.target.value)}
                  disabled={loading}
                >
                  <option value="weekly" className="bg-slate-900">Weekly</option>
                  <option value="monthly" className="bg-slate-900">Monthly</option>
                  <option value="yearly" className="bg-slate-900">Yearly</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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

              <Input
                label="Next Billing Date"
                id="nextBilling"
                type="date"
                value={nextBillingDate}
                onChange={(e) => setNextBillingDate(e.target.value)}
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="mt-6"
            >
              Track Subscription
            </Button>
          </form>
        </GlassCard>
      </div>
    </div>
  );
};

export default SubscriptionModal;
