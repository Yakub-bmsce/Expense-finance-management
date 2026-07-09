import React from 'react';

const Input = ({ 
  label, 
  error, 
  id, 
  type = 'text', 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-slate-300 select-none">
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        className={`glass-input w-full ${error ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500' : ''}`}
        {...props}
      />
      {error && (
        <span className="text-xs text-red-400 font-medium select-none mt-1 animate-fade-in">
          {error}
        </span>
      )}
    </div>
  );
};

export default Input;
