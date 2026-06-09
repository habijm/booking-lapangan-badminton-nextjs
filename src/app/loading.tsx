export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ background: '#0D1F16' }}>
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-[#40916C] flex items-center justify-center shadow-lg"
          style={{ boxShadow: '0 0 40px rgba(64,145,108,0.4)' }}>
          <span className="text-4xl">🏸</span>
        </div>
        <div className="absolute inset-0 rounded-2xl animate-ping opacity-30"
          style={{ background: 'rgba(64,145,108,0.5)' }}/>
      </div>

      <div className="flex items-center gap-3">
        <span className="inline-block w-5 h-5 border-2 rounded-full animate-spin"
          style={{ borderColor: 'rgba(82,183,136,0.2)', borderTopColor: '#52B788' }}/>
        <span className="text-sm font-medium" style={{ color: 'rgba(116,198,157,0.7)' }}>Memuat...</span>
      </div>

      <div className="space-y-2.5 w-64">
        {[100, 75, 88, 60].map((w, i) => (
          <div key={i} className="h-2 rounded-full animate-pulse"
            style={{ width: `${w}%`, background: 'rgba(82,183,136,0.1)', animationDelay: `${i * 0.12}s` }}/>
        ))}
      </div>
    </div>
  );
}
