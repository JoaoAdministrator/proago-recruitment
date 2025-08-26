// src/components/ui/dialog.jsx
import React from "react";

export function Dialog({ open, onOpenChange, children }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={() => onOpenChange(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl w-full max-w-lg p-4"
      >
        {children}
      </div>
    </div>
  );
}

export function DialogContent({ children }) {
  return <div>{children}</div>;
}

export function DialogHeader({ children }) {
  return <div className="mb-2">{children}</div>;
}

export function DialogTitle({ children }) {
  return <h3 className="font-semibold text-lg mb-1">{children}</h3>;
}

export function DialogDescription({ children }) {
  return <p className="text-sm text-muted-foreground mb-2">{children}</p>;
}

export function DialogFooter({ children }) {
  return <div className="mt-4 flex justify-end gap-2">{children}</div>;
}
