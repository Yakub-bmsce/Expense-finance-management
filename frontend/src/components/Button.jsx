import React from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  type = 'button', 
  className = '', 
  loading = false, 
  disabled = false, 
  ...props 
}) => {
  const baseStyle = "w-full py-3 px-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-darkbg";
  
  const variants = {
    primary: "bg-gradient-to-r from-brandIndigo to-brandBlue text-white hover:from-indigo-500 hover:to-blue-500 active:scale-[0.98] shadow-lg shadow-indigo-500/20 focus:ring-brandIndigo",
    secondary: "bg-slate-800 text-slate-100 hover:bg-slate-700 active:scale-[0.98] focus:ring-slate-700",
    accent: "bg-gradient-to-r from-brandPurple to-brandIndigo text-white hover:from-purple-500 hover:to-indigo-500 active:scale-[0.98] shadow-lg shadow-purple-500/20 focus:ring-brandPurple",
    outline: "border border-glassBorder text-slate-300 hover:bg-white/5 active:scale-[0.98] focus:ring-white/10"
  };

  return (
    <button
      type={type}
      className={`${baseStyle} ${variants[variant]} ${loading || disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : children}
    </button>
  );
};

export default Button;
