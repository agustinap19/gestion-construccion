import React from "react";

const Button = ({
  children,
  size = "md",
  variant = "primary",
  startIcon,
  endIcon,
  onClick,
  className = "",
  disabled = false,
  type = "button",
  fullWidth = false,
  ...props
}) => {
  const sizeClasses = {
    sm: "px-4 py-2 text-xs rounded-xl",
    md: "px-6 py-2.5 text-sm rounded-xl",
    lg: "px-8 py-3 text-base rounded-2xl",
  };

  const variantClasses = {
    primary:
      "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-900/30 hover:from-violet-500 hover:to-purple-500 disabled:from-violet-900/40 disabled:to-purple-900/40 disabled:text-white/40 disabled:shadow-none border border-white/10",
    outline:
      "bg-white/[0.05] border border-white/10 text-white/80 hover:bg-white/[0.1] hover:text-white hover:border-white/20 disabled:bg-transparent disabled:border-white/5 disabled:text-white/30",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 font-medium transition-all ${sizeClasses[size]} ${variantClasses[variant]} ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      } ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {startIcon && <span className="flex items-center">{startIcon}</span>}
      {children}
      {endIcon && <span className="flex items-center">{endIcon}</span>}
    </button>
  );
};

export default Button;
