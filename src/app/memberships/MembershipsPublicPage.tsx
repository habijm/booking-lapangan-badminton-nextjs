'use client';

import Navbar from '@/components/Navbar';
import { CourtSettings } from '@/lib/config';
import { MembershipPlan } from '@/types/booking';

interface Props { settings: CourtSettings; plans: MembershipPlan[] }

export default function MembershipsPublicPage({ settings, plans }: Props) {
  const wa = (plan: MembershipPlan) =>
    `https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(
      `Halo, saya ingin mendaftar:\n\n🎫 *${plan.name}*\n• ${plan.hours_per_session} jam/sesi\n• ${plan.sessions_per_week}x seminggu\n• ${plan.sessions_per_week * 4} sesi/bulan\n• Rp ${plan.price.toLocaleString('id')}/bulan\n\nMohon info lebih lanjut.`
    )}`;

  const perSessionPrice = (plan: MembershipPlan) =>
    Math.round(plan.price / (plan.sessions_per_week * 4));

  const regularPrice = (plan: MembershipPlan) =>
    plan.hours_per_session * settings.price_per_hour * plan.sessions_per_week * 4;

  const savings = (plan: MembershipPlan) =>
    regularPrice(plan) - plan.price;

  return (
    <div className="min-h-screen" style={{ background: '#0D1F16' }}>
      <Navbar settings={settings}/>

      {/* Hero */}
      <section className="relative pt-24 pb-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/3 w-96 h-96 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, rgba(64,145,108,0.5) 0%, transparent 70%)' }}/>
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#52B788]/30 bg-[#52B788]/10 text-[#74C69D] text-xs font-semibold mb-4">
            🎫 Paket Langganan Bulanan
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white font-display leading-tight mb-4">
            Hemat Lebih Banyak<br/>
            <span style={{ backgroundImage:'linear-gradient(135deg,#74C69D,#40916C)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              dengan Berlangganan
            </span>
          </h1>
          <p className="text-[#A8D5BC]/60 text-sm sm:text-base max-w-xl mx-auto">
            Dapatkan jadwal tetap setiap minggu dan harga lebih hemat dibanding booking satuan.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-2 gap-6">
            {plans.map((plan, i) => {
              const save    = savings(plan);
              const perSess = perSessionPrice(plan);
              const isGold  = plan.sessions_per_week >= 2;
              return (
                <div key={plan.id}
                  className={`rounded-2xl border-2 overflow-hidden relative ${
                    isGold ? 'border-yellow-500/40' : 'border-[#52B788]/30'
                  }`}
                  style={{ background: isGold ? 'linear-gradient(135deg,#1a2d10,#0D1F16)' : 'linear-gradient(135deg,#0f2a1a,#0D1F16)' }}>

                  {/* Popular badge */}
                  {isGold && (
                    <div className="absolute top-4 right-4 text-[10px] font-bold px-2.5 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-400">
                      ⭐ Populer
                    </div>
                  )}

                  <div className="p-6">
                    {/* Plan icon & name */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${
                        isGold ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-[#52B788]/15 border border-[#52B788]/25'
                      }`}>
                        {isGold ? '🥇' : '🥈'}
                      </div>
                      <div>
                        <h3 className="font-bold text-white font-display text-lg">{plan.name}</h3>
                        <p className="text-[#74C69D]/50 text-xs">{plan.description}</p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-5">
                      <div className="flex items-end gap-2">
                        <span className={`text-4xl font-bold font-display ${isGold ? 'text-yellow-400' : 'text-white'}`}>
                          Rp {plan.price.toLocaleString('id')}
                        </span>
                        <span className="text-[#74C69D]/40 text-sm mb-1">/bulan</span>
                      </div>
                      <div className="flex gap-3 mt-2 text-xs">
                        <span className="text-[#74C69D]/50">
                          Rp {perSess.toLocaleString('id')}/sesi
                        </span>
                        {save > 0 && (
                          <span className="text-[#52B788] font-bold">
                            Hemat Rp {save.toLocaleString('id')}
                          </span>
                        )}
                      </div>
                      {save > 0 && (
                        <div className="mt-1 text-[11px] text-[#74C69D]/30 line-through">
                          Harga normal: Rp {regularPrice(plan).toLocaleString('id')}
                        </div>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-2.5 mb-6">
                      {[
                        `${plan.sessions_per_week}x sesi per minggu`,
                        `${plan.hours_per_session} jam per sesi`,
                        `${plan.sessions_per_week * 4} sesi per bulan`,
                        'Jadwal tetap setiap minggu',
                        'Konfirmasi via WhatsApp',
                        'Berlaku 1 bulan penuh',
                      ].map((f, fi) => (
                        <li key={fi} className="flex items-center gap-2.5 text-sm text-[#A8D5BC]/70">
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${
                            isGold ? 'bg-yellow-500/20 text-yellow-400' : 'bg-[#52B788]/20 text-[#52B788]'
                          }`}>✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <a href={wa(plan)} target="_blank" rel="noopener noreferrer"
                      className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                        isGold
                          ? 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-lg shadow-yellow-500/20'
                          : 'bg-[#40916C] hover:bg-[#52B788] text-white shadow-lg shadow-[#40916C]/20'
                      }`}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.556 4.116 1.528 5.847L0 24l6.337-1.508A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.807 9.807 0 01-5.001-1.366l-.36-.213-3.727.977.995-3.635-.234-.373A9.773 9.773 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z"/>
                      </svg>
                      Daftar via WhatsApp
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* FAQ */}
          <div className="mt-10 rounded-2xl border border-[#52B788]/15 p-6" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <h3 className="font-bold text-white font-display text-lg mb-5">❓ Pertanyaan Umum</h3>
            <div className="space-y-4">
              {[
                { q:'Bagaimana cara mendaftar?',      a:'Klik tombol "Daftar via WhatsApp", admin akan membantu menentukan jadwal dan proses pembayaran.' },
                { q:'Apakah jadwal bisa diubah?',     a:'Jadwal tetap per minggu. Perubahan dapat diajukan ke admin minimal 2 hari sebelumnya.' },
                { q:'Bagaimana jika berhalangan hadir?', a:'Sesi yang tidak digunakan tidak bisa dipindah ke bulan berikutnya. Hubungi admin untuk info lebih lanjut.' },
                { q:'Kapan masa berlaku mulai?',      a:'Masa berlaku dimulai dari tanggal yang disepakati dengan admin, berlaku 1 bulan penuh.' },
              ].map((item, i) => (
                <div key={i} className="border-b border-[#52B788]/10 pb-4 last:border-0 last:pb-0">
                  <div className="font-medium text-white text-sm mb-1.5">{item.q}</div>
                  <div className="text-xs text-[#74C69D]/50 leading-relaxed">{item.a}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#52B788]/10 px-4 py-6" style={{ background: 'rgba(0,0,0,0.3)' }}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#40916C] flex items-center justify-center"><span>🏸</span></div>
            <div className="text-sm font-bold text-white font-display">{settings.court_name}</div>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#74C69D]/40">
            <a href="/" className="hover:text-[#74C69D] transition-colors">← Jadwal Lapangan</a>
            <a href={`https://wa.me/${settings.whatsapp_number}`} target="_blank" rel="noopener noreferrer"
              className="text-[#52B788] hover:text-[#74C69D] transition-colors font-medium">WhatsApp Admin ↗</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
