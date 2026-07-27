import React from "react";

const InputField = ({
  type = "text",
  id,
  value,
  onChange,
  placeholder,
  disabled = false,
  className = "",
  ...props
}) => {
  return (
    <input
      type={type}
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`h-11 w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm text-white shadow-inner placeholder:text-white/30 focus:border-violet-500/50 focus:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      } ${className}`}
      {...props}
    />
  );
};

export default InputField;
