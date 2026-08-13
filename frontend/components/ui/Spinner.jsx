export default function Spinner({ className = "" }) {
  return (
    <div className={`flex items-center justify-center py-16 ${className}`}>
      <div className="h-8 w-8 border-2 border-ink/20 border-t-burgundy rounded-full animate-spin" />
    </div>
  );
}
