"use client";

export default function Input({ label, className = "", textarea = false, ...props }) {
  const Field = textarea ? "textarea" : "input";
  return (
    <label className="block mb-4">
      {label && (
        <span className="block text-xs tracking-widest uppercase text-ink/60 mb-2">{label}</span>
      )}
      <Field
        className={`w-full border border-ink/20 bg-paper px-4 py-3 text-sm focus:outline-none focus:border-burgundy transition-colors ${
          textarea ? "min-h-[120px] resize-y" : ""
        } ${className}`}
        {...props}
      />
    </label>
  );
}
