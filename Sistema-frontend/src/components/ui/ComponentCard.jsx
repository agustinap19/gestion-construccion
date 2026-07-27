import React from "react";

const ComponentCard = ({ title, desc, children, className = "", ...props }) => {
  return (
    <div
      className={`rounded-3xl border border-white/10 bg-[#0d0f1a] shadow-xl overflow-hidden ${className}`}
      {...props}
    >
      {(title || desc) && (
        <div className="border-b border-white/10 px-6 py-5">
          {title && <h3 className="text-base font-semibold text-white">{title}</h3>}
          {desc && <p className="mt-1 text-sm text-white/50">{desc}</p>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};

export default ComponentCard;
