import React from "react";

const Select = ({
  id,
  value,
  onChange,
  disabled = false,
  className = "",
  children,
  ...props
}) => {
  return (
    <select
      id={id}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`h-11 w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm text-white shadow-inner focus:border-violet-500/50 focus:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all [&>option]:bg-[#0d0f1a] [&>option]:text-white ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </select>
  );
};

export default Select;
