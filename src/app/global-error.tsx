'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body style={{ background:'#0D1F16',margin:0,padding:'1rem',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui,sans-serif' }}>
        <div style={{ textAlign:'center',maxWidth:'420px',width:'100%' }}>
          <div style={{ width:'80px',height:'80px',borderRadius:'16px',background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.3)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 1.5rem',fontSize:'2.5rem' }}>
            🚨
          </div>
          <h2 style={{ color:'white',fontSize:'1.5rem',fontWeight:'bold',marginBottom:'0.75rem' }}>Kesalahan Sistem</h2>
          <p style={{ color:'rgba(116,198,157,0.6)',fontSize:'0.875rem',marginBottom:'2rem',lineHeight:'1.6' }}>
            Terjadi kesalahan kritis pada aplikasi. Silakan muat ulang halaman atau kembali lagi nanti.
          </p>
          <div style={{ display:'flex',gap:'0.75rem',justifyContent:'center',flexWrap:'wrap' }}>
            <button onClick={reset}
              style={{ padding:'0.75rem 1.5rem',background:'#40916C',color:'white',border:'none',borderRadius:'12px',cursor:'pointer',fontWeight:'bold',fontSize:'0.875rem' }}>
              🔄 Muat Ulang
            </button>
            <button onClick={() => { window.location.href='/'; }}
              style={{ padding:'0.75rem 1.5rem',background:'transparent',color:'rgba(116,198,157,0.8)',border:'1px solid rgba(82,183,136,0.3)',borderRadius:'12px',cursor:'pointer',fontWeight:'bold',fontSize:'0.875rem' }}>
              🏠 Beranda
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
