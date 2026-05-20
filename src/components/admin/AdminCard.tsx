'use client';

interface Props {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const padMap = { none: '', sm: 'p-4', md: 'p-5 sm:p-6', lg: 'p-6 sm:p-8' };

export function AdminCard({ children, className = '', padding = 'md' }: Props) {
  return (
    <div className={`rounded-2xl border border-[#52B788]/15 overflow-hidden ${padMap[padding]} ${className}`}
      style={{ background: 'rgba(255,255,255,0.04)' }}>
      {children}
    </div>
  );
}

export function AdminSectionHeader({ title, subtitle, action }: {
  title: string; subtitle?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h2 className="font-bold text-white font-display text-base sm:text-lg">{title}</h2>
        {subtitle && <p className="text-[#74C69D]/60 text-xs sm:text-sm mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

export function AdminInput({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <div>
      {label && <label className="block text-xs font-semibold text-[#74C69D]/80 mb-1.5">{label}</label>}
      <input
        {...props}
        className={`w-full px-4 py-2.5 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 text-white placeholder:text-[#74C69D]/30
          focus:outline-none focus:border-[#52B788]/60 focus:bg-[#52B788]/10 transition-all text-sm
          disabled:opacity-50 disabled:cursor-not-allowed ${props.className ?? ''}`}
      />
    </div>
  );
}

export function AdminTextarea({ label, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <div>
      {label && <label className="block text-xs font-semibold text-[#74C69D]/80 mb-1.5">{label}</label>}
      <textarea
        {...props}
        className={`w-full px-4 py-2.5 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 text-white placeholder:text-[#74C69D]/30
          focus:outline-none focus:border-[#52B788]/60 focus:bg-[#52B788]/10 transition-all text-sm resize-none
          disabled:opacity-50 ${props.className ?? ''}`}
      />
    </div>
  );
}

export function AdminSelect({ label, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <div>
      {label && <label className="block text-xs font-semibold text-[#74C69D]/80 mb-1.5">{label}</label>}
      <select
        {...props}
        className={`w-full px-4 py-2.5 rounded-xl border border-[#52B788]/20 bg-[#0D1F16] text-white
          focus:outline-none focus:border-[#52B788]/60 transition-all text-sm
          disabled:opacity-50 ${props.className ?? ''}`}
      >
        {children}
      </select>
    </div>
  );
}

export function AdminButton({ variant = 'primary', children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}) {
  const styles = {
    primary:   'bg-[#40916C] hover:bg-[#52B788] text-white shadow-lg shadow-[#40916C]/20',
    secondary: 'border border-[#52B788]/30 text-[#74C69D] hover:bg-[#52B788]/10 hover:border-[#52B788]/60',
    danger:    'border border-red-500/30 text-red-400 hover:bg-red-500/10',
    ghost:     'text-[#74C69D]/60 hover:text-[#74C69D] hover:bg-[#52B788]/10',
  }[variant];

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
        transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function AdminBadge({ status }: { status: 'pending' | 'confirmed' | 'cancelled' }) {
  const styles = {
    pending:   'bg-amber-500/15 text-amber-400 border-amber-500/20',
    confirmed: 'bg-[#52B788]/15 text-[#74C69D] border-[#52B788]/20',
    cancelled: 'bg-red-500/15 text-red-400 border-red-500/20',
  }[status];
  const labels = { pending: 'Menunggu', confirmed: 'Dikonfirmasi', cancelled: 'Dibatalkan' };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${styles}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"/>
      {labels[status]}
    </span>
  );
}
