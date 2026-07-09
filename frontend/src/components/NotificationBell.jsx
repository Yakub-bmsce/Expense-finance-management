import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, Check, Trash2, Calendar, DollarSign, MessageSquare } from 'lucide-react';

const NotificationBell = () => {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => setIsOpen(!isOpen);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
    } catch (err) {
      console.error(err);
    }
  };

  const handleItemClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await markNotificationRead(notif.id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Styled icons matching notification type
  const getIcon = (type) => {
    if (type === 'bill_added') {
      return (
        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">
          <DollarSign size={14} />
        </div>
      );
    }
    if (type === 'settlement') {
      return (
        <div className="p-2 rounded-lg bg-green-500/10 text-green-400 border border-green-500/15">
          <Check size={14} />
        </div>
      );
    }
    if (type === 'debt_reminder') {
      return (
        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/15">
          <Bell size={14} className="animate-swing" />
        </div>
      );
    }
    return (
      <div className="p-2 rounded-lg bg-slate-800 text-slate-400 border border-slate-700/20">
        <MessageSquare size={14} />
      </div>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Icon */}
      <button
        onClick={handleToggle}
        className="relative p-2.5 rounded-xl bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-glassBorder transition-colors active:scale-95 cursor-pointer flex items-center justify-center"
      >
        <Bell size={16} className={unreadCount > 0 ? 'animate-swing' : ''} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-indigo-500 text-white font-extrabold text-[9px] rounded-full flex items-center justify-center border-2 border-slate-950 shadow-md">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 max-h-96 overflow-y-auto bg-slate-900/90 border border-glassBorder rounded-2xl shadow-2xl backdrop-blur-md z-50 animate-fade-in p-4 space-y-3 flex flex-col no-scrollbar">
          
          <div className="flex items-center justify-between border-b border-glassBorder pb-2 select-none">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-200">Alerts feed</span>
              {unreadCount > 0 && (
                <span className="py-0.5 px-1.5 rounded bg-indigo-500/10 text-indigo-400 text-[9px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] font-bold text-brandIndigo hover:text-indigo-400 cursor-pointer uppercase transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto pr-0.5 max-h-64 no-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 select-none">
                No alerts yet. Room updates will appear here!
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`p-2.5 rounded-xl border flex gap-3 transition-colors ${notif.is_read ? 'bg-slate-950/20 border-glassBorder/40 text-slate-400' : 'bg-indigo-500/[0.02] border-indigo-500/10 text-slate-200 hover:bg-indigo-500/[0.04]'}`}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className={`text-[11px] font-bold leading-none ${notif.is_read ? 'text-slate-400' : 'text-slate-200'}`}>
                        {notif.title}
                      </span>
                      <span className="text-[8px] text-slate-500 font-medium">
                        {notif.created_at ? new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-snug break-words">
                      {notif.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
