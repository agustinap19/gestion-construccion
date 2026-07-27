import React, { useEffect, useRef } from "react";
import { X } from "../icons/Icons";

const Modal = ({
  isOpen,
  onClose,
  children,
  className = "",
  showCloseButton = true,
}) => {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const contentClasses = "relative flex w-full flex-col rounded-3xl bg-[#0d0f1a] border border-white/10 shadow-2xl shadow-violet-900/20 sm:max-w-lg";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-5">
      <div
        className="absolute inset-0 bg-[#0a0a0a]/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />
      <div
        ref={modalRef}
        className={`${contentClasses} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
};

export default Modal;
