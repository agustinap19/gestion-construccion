import React from 'react';

const FloatingInput = ({ 
    label, 
    id, 
    name, 
    type = "text", 
    value, 
    onChange, 
    required = false,
    icon,
    rightIcon,
    onRightIconClick,
    error = false,
    disabled = false
}) => {
    return (
        <div className="relative mb-5 w-full">
            <div className="relative flex items-center">
                {/* Left Icon */}
                {icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10">
                        {icon}
                    </div>
                )}
                
                {/* Input */}
                <input
                    type={type}
                    id={id || name}
                    name={name}
                    value={value}
                    onChange={onChange}
                    required={required}
                    disabled={disabled}
                    className={`peer w-full rounded-xl bg-transparent border px-4 pb-2.5 pt-5 text-sm text-slate-900 dark:text-white placeholder-transparent focus:outline-none transition-all duration-300
                        ${icon ? 'pl-10' : ''}
                        ${rightIcon ? 'pr-10' : ''}
                        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                        ${error 
                            ? 'border-red-500 focus:border-red-500 focus:shadow-[0_0_10px_rgba(239,68,68,0.3)]' 
                            : 'border-slate-300 dark:border-white/10 focus:border-emerald-600 dark:focus:border-purple-500 focus:shadow-[0_0_15px_rgba(5,150,105,0.3)] dark:focus:shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:border-slate-400 dark:hover:border-white/20'
                        }
                        [&:not(:placeholder-shown)]:scale-100
                    `}
                    placeholder=" "
                />
                
                {/* Floating Label */}
                <label
                    htmlFor={id || name}
                    className={`absolute text-sm duration-300 transform -translate-y-3.5 scale-75 top-4 z-10 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3.5 peer-[:not(:placeholder-shown)]:scale-75 peer-[:not(:placeholder-shown)]:-translate-y-3.5 peer-autofill:scale-75 peer-autofill:-translate-y-3.5 cursor-text select-none
                        ${icon ? 'left-10' : 'left-4'}
                        ${error ? 'text-red-500 dark:text-red-400 peer-focus:text-red-500 dark:peer-focus:text-red-400' : 'text-slate-500 dark:text-slate-400 peer-focus:text-emerald-600 dark:peer-focus:text-purple-400'}
                    `}
                >
                    {label}
                </label>

                {/* Right Icon / Button */}
                {rightIcon && (
                    <button
                        type="button"
                        onClick={onRightIconClick}
                        disabled={disabled}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white focus:outline-none transition-colors"
                        tabIndex="-1"
                    >
                        {rightIcon}
                    </button>
                )}
            </div>
        </div>
    );
};

export default FloatingInput;
