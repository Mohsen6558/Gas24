import { motion, AnimatePresence } from 'motion/react';
import {
  Flame,
  Car,
  Gift,
  Smartphone,
  Monitor,
  ChevronDown,
  CheckCircle2,
  Menu,
  X,
  Trophy,
  HelpCircle,
  LayoutDashboard,
  Zap,
  Users,
  MapPin,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { appUrl, type Province } from './province.ts';

// Section ids double as the menu anchors.
const NAV = [
  { label: 'جوایز', href: '#جوایز' },
  { label: 'راهکارها', href: '#راهکارها' },
  { label: 'اپلیکیشن', href: '#اپلیکیشن' },
];

const Header = ({ p }: { p: Province }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled || isMenuOpen ? 'bg-white/70 backdrop-blur-xl py-3 border-b border-brand-border' : 'bg-transparent py-6'}`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-accent rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/10">
            <Flame size={22} fill="currentColor" />
          </div>
          <span className="text-xl font-black tracking-tight text-brand-primary">گرمای پایدار</span>
        </div>

        <nav className="hidden md:flex items-center gap-10">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="text-sm font-semibold transition-all hover:text-brand-accent text-brand-muted">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <a
            href={appUrl(p)}
            className="hidden md:block px-6 py-2.5 bg-brand-primary text-white rounded-xl font-bold text-sm hover:bg-brand-accent transition-all shadow-sm"
          >
            ورود به سامانه
          </a>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'بستن منو' : 'منو'}
            aria-expanded={isMenuOpen}
            className="md:hidden p-2 text-brand-accent"
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 right-0 bg-white shadow-xl p-6 md:hidden flex flex-col gap-4"
          >
            {NAV.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setIsMenuOpen(false)} className="text-slate-700 font-medium py-2 border-b border-slate-100">
                {item.label}
              </a>
            ))}
            <a
              href={appUrl(p)}
              className="w-full py-4 bg-brand-accent text-white rounded-2xl font-bold shadow-lg mt-2 text-center"
            >
              ورود به اپلیکیشن
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

const Hero = ({ p }: { p: Province }) => {
  const greeting = p.greeting ?? `هم‌استانی‌های عزیز استان ${p.name}`;
  return (
    <section className="relative min-h-[95vh] pt-40 pb-20 overflow-hidden flex items-center">
      {p.heroImage && (
        <div className="absolute inset-0 z-0">
          <img src={p.heroImage} alt="" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-surface via-transparent to-brand-surface" />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center lg:text-right"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-brand-border text-brand-muted text-xs font-bold mb-8 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse shrink-0" />
            کمپین استانی صرفه‌جویی انرژی ۱۴۰۵ - ویژه {p.badge}
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-brand-primary leading-[1.1] mb-8 tracking-tighter">
            گرما برای {p.heroPlace}، <br />
            <span className="text-brand-accent">پاداش برای شما.</span>
          </h1>

          <p className="text-lg text-brand-muted mb-12 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
            {greeting}، با اپلیکیشن «گرمای پایدار» در کاهش مصرف گاز استان پیشگام شوید، گازیوم به دست آورید و در قرعه‌کشی ویژه {p.heroPlace} شرکت کنید.
          </p>

          <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
            <a
              href={appUrl(p)}
              className="px-10 py-5 bg-brand-primary text-white rounded-2xl font-bold text-lg hover:bg-brand-accent transition-all shadow-xl shadow-brand-primary/10 flex items-center justify-center gap-3"
            >
              نصب و شرکت در پویش
              <ChevronDown size={20} className="-rotate-90 opacity-60" />
            </a>
            <a
              href="#جوایز"
              className="px-10 py-5 bg-white text-brand-primary border border-brand-border rounded-2xl font-bold text-lg hover:bg-brand-surface transition-all flex items-center justify-center"
            >
              مشاهده جوایز
            </a>
          </div>

          {p.stats && (
            <div className="mt-12 flex items-center justify-center lg:justify-start gap-6">
              <div className="flex -space-x-3 space-x-reverse">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-xl border-2 border-white bg-slate-100 flex items-center justify-center text-brand-muted shadow-sm">
                    <Users size={18} />
                  </div>
                ))}
              </div>
              <div className="text-right">
                <p className="text-brand-primary text-sm font-bold leading-none mb-1.5">{p.stats[0]}</p>
                <p className="text-brand-muted text-[11px] font-bold">{p.stats[1]}</p>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative"
        >
          <div className="relative z-10 w-[85%] mx-auto">
            <div className="bg-brand-primary p-2 rounded-[3.5rem] shadow-[0_40px_100px_rgba(15,23,42,0.15)] border-[8px] border-white ring-1 ring-brand-border">
              <div className="rounded-[2.8rem] overflow-hidden aspect-[9/19] bg-white relative">
                <img src="https://gas24.ir/media/app%20(1).png" className="w-full h-full object-cover" alt="نمای اپلیکیشن گرمای پایدار" />
              </div>
            </div>

            {/* sample figures on the app mock-up */}
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -right-8 top-[15%] minimal-card backdrop-blur-xl bg-white/80 !p-4 !rounded-2xl shadow-xl z-20 flex gap-4 items-center"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-brand-accent">
                <Flame size={20} fill="currentColor" />
              </div>
              <div>
                <div className="text-[10px] text-brand-muted font-bold">صرفه‌جویی شما</div>
                <div className="font-bold text-brand-primary">۴۸۰ متر مکعب</div>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -left-12 bottom-[20%] minimal-card backdrop-blur-xl bg-white/80 !p-4 !rounded-2xl shadow-xl z-20 flex gap-4 items-center"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                <Zap size={20} fill="currentColor" />
              </div>
              <div>
                <div className="text-[10px] text-brand-muted font-bold">موجودی گازیوم</div>
                <div className="font-bold text-brand-primary">۱۲,۵۰۰ واحد</div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const MockupSection = () => {
  const mockups = [
    { url: 'https://gas24.ir/media/app%20(1).png', title: 'پیشخوان هوشمند', desc: 'نمای کلی وضعیت مصرف و پاداش‌های شگفت‌انگیز شما' },
    { url: 'https://gas24.ir/media/app%20(4).png', title: 'تحلیل و پایش', desc: 'نمودار مقایسه‌ای و تحلیل هوشمند مصرف متر مکعبی' },
    { url: 'https://gas24.ir/media/app%20(5).png', title: 'جوایز گازیوم', desc: 'ویترین پاداش‌ها و گردونه شانس برای مشترکین فعال' },
    { url: 'https://gas24.ir/media/app%20(3).png', title: 'راهنما و آموزش', desc: 'آموزش‌های کاربردی برای کاهش هزینه‌ها و مصرف انرژی' },
    { url: 'https://gas24.ir/media/app%20(2).png', title: 'مدیریت اشتراک‌ها', desc: 'ثبت و پایش چندین اشتراک گاز به صورت همزمان' },
  ];

  return (
    <section id="اپلیکیشن" className="section-padding bg-white relative overflow-hidden scroll-mt-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <h2 className="text-4xl font-black mb-6 tracking-tight">هوشمندی در مدیریت انرژی</h2>
          <p className="text-brand-muted font-medium">سادگی، زیبایی و قدرت در یک اپلیکیشن حرفه‌ای برای فرداهای روشن‌تر.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          {mockups.map((img, idx) => (
            <motion.div
              key={img.url}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="relative aspect-[9/19] rounded-[10px] overflow-hidden border border-brand-border bg-brand-surface group shadow-sm hover:shadow-2xl hover:shadow-brand-primary/5 transition-all duration-500"
            >
              <img src={img.url} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" alt={img.title} />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-primary/90 via-brand-primary/20 to-transparent flex flex-col justify-end p-8 text-white text-right">
                <h3 className="font-bold text-lg mb-2">{img.title}</h3>
                <p className="text-xs opacity-80 leading-relaxed font-medium">{img.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const FeaturesDetail = ({ p }: { p: Province }) => {
  const items = [
    { title: 'تبدیل گازیوم به جایزه', desc: 'هر واحد صرفه‌جویی معادل یک «گازیوم» است. آن‌ها را جمع کنید و در فروشگاه جوایز، تبدیل به کالاهای ارزشمند کنید.', icon: <Zap className="text-brand-accent" /> },
    { title: 'تحلیل هوشمند و گام‌های پیش رو', desc: 'نه تنها مصرف خود را می‌بینید، بلکه به شما می‌گوییم چه کارهای ساده‌ای برای کاهش بیشتر قبض‌تان می‌توانید انجام دهید.', icon: <LayoutDashboard className="text-blue-500" /> },
    // same amount the app shows on the invite card (Profile)
    { title: 'دعوت از دوستان و هدیه ورودی', desc: 'دوستانتان را به چالش صرفه‌جویی دعوت کنید و با ثبت‌نام هر نفر، ۱۰۰ گازیوم هدیه بگیرید.', icon: <Gift className="text-orange-400" /> },
    { title: 'محتوای آموزشی تعاملی', desc: 'ویدیوها و مقالات کوتاه برای یادگیری ترفندهایی که هیچ‌جا به گوشتان نخورده است.', icon: <Monitor className="text-emerald-500" /> },
  ];

  return (
    <section className="section-padding bg-brand-surface relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-20 items-center">
        <div>
          <span className="text-brand-accent font-bold text-xs tracking-widest bg-brand-accent/5 px-4 py-2 rounded-lg mb-6 inline-block">چرا اپلیکیشن ما؟</span>
          <h2 className="text-5xl font-black text-brand-primary mb-8 leading-tight tracking-tighter">قابلیت‌هایی که <br />مصرف شما را متحول می‌کند</h2>
          <p className="text-brand-muted text-lg leading-relaxed mb-10 font-medium">ما فقط یک اپلیکیشن پایش نیستیم؛ ما یک پلتفرم پاداش‌دهی هستیم که به ازای هر ذره صرفه‌جویی، به شما ارزش واقعی برمی‌گردانیم.</p>
          <a href={appUrl(p)} className="inline-flex px-10 py-5 bg-brand-primary text-white rounded-2xl font-bold items-center gap-3 hover:bg-brand-accent transition-all shadow-xl shadow-brand-primary/10">
            کشف تمام امکانات
            <ChevronDown size={20} className="-rotate-90 opacity-60" />
          </a>
        </div>
        <div className="grid sm:grid-cols-2 gap-8">
          {items.map((item, idx) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="minimal-card flex flex-col items-start text-right gap-6"
            >
              <div className="w-12 h-12 rounded-xl bg-brand-surface flex items-center justify-center border border-brand-border">
                {item.icon}
              </div>
              <div>
                <h3 className="font-bold text-brand-primary mb-3 text-lg tracking-tight">{item.title}</h3>
                <p className="text-sm text-brand-muted leading-relaxed font-medium">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const TipsGrid = () => {
  const tips = [
    { title: 'دمای رفاه ۱۸-۲۱ درجه', emoji: '🌡️', color: 'border-red-100 bg-red-50/30' },
    { title: 'پرده‌های ضخیم', emoji: '🖼️', color: 'border-orange-100 bg-orange-50/30' },
    { title: 'لباس مناسب منزل', emoji: '🧣', color: 'border-amber-100 bg-amber-50/30' },
    { title: 'بستن دریچه کولر', emoji: '❄️', color: 'border-blue-100 bg-blue-50/30' },
    { title: 'نصب درزگیر در و پنجره', emoji: '🚪', color: 'border-indigo-100 bg-indigo-50/30' },
    { title: 'خاموشی وسایل اضافی', emoji: '💡', color: 'border-emerald-100 bg-emerald-50/30' },
    { title: 'شیرهای ترموستاتیک', emoji: '🔧', color: 'border-sky-100 bg-sky-50/30' },
  ];

  return (
    <section id="راهکارها" className="section-padding bg-white scroll-mt-20">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <h2 className="text-4xl font-black mb-16 tracking-tight">راهکارهای ساده، پاداش‌های بزرگ</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
          {tips.map((tip, idx) => (
            <motion.div
              key={tip.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              viewport={{ once: true }}
              className={`group p-6 rounded-[2rem] border ${tip.color} transition-all duration-300 hover:-translate-y-2 flex flex-col items-center justify-center gap-4`}
            >
              <div className="text-4xl mb-2 grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all">{tip.emoji}</div>
              <p className="text-xs font-bold leading-tight text-brand-primary">{tip.title}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const PrizesSection = ({ p }: { p: Province }) => {
  const prizes = [
    { title: 'خودرو ۲۰۷ اتوماتیک', icon: <Car size={40} />, subtitle: 'جایزه ویژه نهایی سال ۱۴۰۵', color: 'bg-brand-primary' },
    { title: 'شمش و صندوق طلا', icon: <Gift size={40} />, subtitle: 'برندگان خوش‌شانس استانی', color: 'bg-orange-600' },
    { title: 'بسته‌های گازیوم هدیه', icon: <Zap size={40} />, subtitle: 'هزاران هدیه برای صرفه‌جویان', color: 'bg-brand-accent' },
  ];

  return (
    <section id="جوایز" className="section-padding bg-brand-surface scroll-mt-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-8 mb-20">
          <div className="text-center md:text-right max-w-xl">
            <h2 className="text-5xl font-black mb-6 tracking-tighter">پاداش‌های ماندگار</h2>
            <p className="text-brand-muted text-lg font-medium leading-relaxed">هر متر مکعب صرفه‌جویی، شانس شما را برای دریافت جوایز ارزشمند افزایش می‌دهد.</p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-white border border-brand-border flex items-center justify-center text-brand-accent shadow-sm animate-bounce">
            <Trophy size={32} />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-10">
          {prizes.map((prize) => (
            <motion.div
              key={prize.title}
              whileHover={{ y: -12 }}
              className={`relative overflow-hidden p-10 rounded-[3rem] text-white ${prize.color} shadow-2xl shadow-brand-primary/10 transition-all duration-500`}
            >
              <div className="mb-8 opacity-60">{prize.icon}</div>
              <h3 className="text-3xl font-black mb-3 tracking-tight">{prize.title}</h3>
              <p className="opacity-70 text-sm mb-10 font-medium leading-relaxed">{prize.subtitle}</p>
              <a href={appUrl(p, 'rewards')} className="block w-full py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl text-sm font-bold text-center transition-all border border-white/10">
                مشاهده جزئیات قرعه‌کشی
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const LotterySection = ({ p }: { p: Province }) => {
  const steps = ['با صرفه‌جویی گازیوم جمع کنید', 'گردونه را در اپلیکیشن بچرخانید', 'امتیاز ویژه یا کد تخفیف ببرید'];

  return (
    <section className="bg-brand-primary py-32 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] border border-white/20 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/20 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-white/20 rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div className="text-center lg:text-right">
            <span className="inline-block px-4 py-1.5 rounded-lg bg-brand-accent/20 text-brand-accent text-xs font-bold mb-6 border border-brand-accent/20">چالش هفتگی</span>
            <h2 className="text-5xl font-black text-white mb-8 leading-tight tracking-tighter">گردونه شانس گازیوم</h2>
            <p className="text-lg text-white/60 mb-12 leading-relaxed font-light">
              با گازیوم‌هایی که از صرفه‌جویی متر مکعبی گاز به دست آورده‌اید، گردونه را بچرخانید و برنده امتیازهای ویژه و کدهای تخفیف شوید.
            </p>

            <ol className="grid gap-3 mb-12 max-w-md mx-auto lg:mx-0 text-right">
              {steps.map((step, i) => (
                <li key={step} className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 backdrop-blur-md">
                  <span className="w-8 h-8 shrink-0 rounded-lg bg-brand-accent text-white font-black flex items-center justify-center">
                    {['۱', '۲', '۳'][i]}
                  </span>
                  <span className="text-white/80 text-sm font-bold">{step}</span>
                </li>
              ))}
            </ol>

            <a href={appUrl(p, 'rewards')} className="px-12 py-5 bg-white text-brand-primary rounded-2xl font-bold text-xl shadow-2xl inline-flex items-center justify-center gap-3 hover:bg-brand-accent hover:text-white transition-all group">
              <Zap className="text-brand-accent group-hover:text-white transition-colors" />
              همین حالا بچرخون
            </a>
          </div>

          <div className="flex justify-center relative">
            <div className="relative w-[300px] h-[300px] sm:w-[340px] sm:h-[340px] md:w-[480px] md:h-[480px] flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-white/10 p-4">
                <div className="w-full h-full rounded-full border border-white/5 flex items-center justify-center animate-spin-slow">
                  {['🎁', '💎', '🔥', '🪙', '✨', '🎫', '⭐', '🎈'].map((emoji, i) => (
                    <div key={emoji} className="absolute inset-0 flex items-start justify-center" style={{ transform: `rotate(${i * 45}deg)` }}>
                      <div className="mt-12 text-3xl opacity-40">{emoji}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-48 h-48 md:w-64 md:h-64 rounded-full bg-white flex flex-col items-center justify-center text-brand-primary shadow-[0_0_80px_rgba(255,255,255,0.2)] z-10 border-[12px] border-brand-primary">
                <div className="text-4xl mb-2">🎈</div>
                <div className="font-black text-2xl">بزن بریم!</div>
                <div className="text-[10px] font-bold text-brand-muted opacity-60">۱۰۰ گازیوم برای هر دور</div>
              </div>
            </div>

            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute top-0 right-0 bg-white p-5 rounded-2xl shadow-xl border border-brand-border text-right min-w-[200px]"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                  <CheckCircle2 size={16} />
                </div>
                <span className="text-[10px] text-brand-muted font-bold">جایزه هر دور</span>
              </div>
              <div className="text-brand-primary font-black text-lg">امتیاز یا کد تخفیف</div>
              <div className="text-brand-accent text-[10px] font-bold">برنده بعدی می‌تواند شما باشید</div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

const CitiesSection = ({ p }: { p: Province }) => (
  <section className="section-padding bg-white relative overflow-hidden">
    <div className="max-w-7xl mx-auto px-6 relative z-10">
      <div className="text-center mb-24 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-green-50 text-green-600 text-[10px] font-black mb-6 border border-green-100">
          <MapPin size={12} />
          شهرهای استان {p.name}
        </div>
        <h2 className="text-5xl font-black text-brand-primary mb-8 tracking-tighter">همدلی در {p.citiesTitle}</h2>
        <p className="text-brand-muted text-lg font-medium leading-relaxed">
          پویش گرمای پایدار در همه این شهرها برگزار می‌شود؛ صرفه‌جویی هر خانه، گرمای خانه هم‌استانی‌ها را پایدار نگه می‌دارد.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        {p.cities.map((name, idx) => (
          <motion.div
            key={name}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.03 }}
            viewport={{ once: true }}
            className="px-8 py-4 bg-brand-surface border border-brand-border rounded-2xl flex items-center gap-4 transition-all hover:bg-white hover:shadow-xl hover:shadow-brand-primary/5 cursor-default group"
          >
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="font-bold text-brand-primary group-hover:text-brand-accent transition-colors">{name}</span>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

const Footer = ({ p }: { p: Province }) => {
  const links = [
    { label: 'ورود به اپلیکیشن گرمای پایدار', href: appUrl(p) },
    { label: 'جوایز و قرعه‌کشی', href: '#جوایز' },
    { label: 'راهکارهای صرفه‌جویی', href: '#راهکارها' },
    { label: 'پویش در سایر استان‌ها', href: 'https://gas24.ir/' },
  ];

  return (
    <footer className="bg-brand-primary text-white py-24 pb-32 md:pb-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-20 mb-24">
          <div className="md:col-span-2 text-center md:text-right">
            <div className="flex items-center justify-center md:justify-start gap-4 mb-8">
              <div className="w-12 h-12 bg-brand-accent rounded-2xl flex items-center justify-center">
                <Flame size={28} fill="currentColor" />
              </div>
              <span className="text-3xl font-black tracking-tight">گرمای پایدار</span>
            </div>
            <p className="text-white/40 max-w-sm mb-10 leading-relaxed mx-auto md:mx-0 font-medium">
              پویش «گرمای پایدار» ویژه استان {p.name} با هدف ترویج فرهنگ بهینه مصرف گاز در {p.footerPlace} برگزار می‌شود. هر واحد صرفه‌جویی شما، تضمین گرمای خانه هم‌استانی‌های عزیز است.
            </p>
          </div>

          <div className="text-center md:text-right">
            <h4 className="font-black mb-8 text-white/90">دسترسی سریع</h4>
            <ul className="space-y-4 text-white/40 text-sm font-bold tracking-tight">
              {links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="hover:text-brand-accent transition-colors">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="text-center md:text-right">
            <h4 className="font-black mb-8 text-white/90">ارتباط پایدار</h4>
            <div className="space-y-4 text-white/40 text-sm flex flex-col items-center md:items-start font-bold">
              <div className="flex items-center gap-3">
                <HelpCircle size={18} className="text-brand-accent shrink-0" />
                <span>سامانه پاسخگویی استانی ({p.name}) ۲۴ ساعته</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-12 border-t border-white/5 text-center text-[10px] text-white/20 font-bold tracking-widest">
          <p>© ۱۴۰۵ تمامی حقوق برای شرکت فناوران پیشرو محفوظ است.</p>
        </div>
      </div>
    </footer>
  );
};

export default function App({ province }: { province: Province }) {
  const [showSticky, setShowSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowSticky(window.scrollY > 800);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen">
      <Header p={province} />
      <Hero p={province} />
      <FeaturesDetail p={province} />
      <MockupSection />
      <TipsGrid />
      <PrizesSection p={province} />
      <CitiesSection p={province} />
      <LotterySection p={province} />
      <Footer p={province} />

      {/* Sticky mobile CTA */}
      <AnimatePresence>
        {showSticky && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="md:hidden fixed bottom-6 left-6 right-6 z-50"
          >
            <a href={appUrl(province)} className="w-full py-5 bg-brand-primary text-white rounded-2xl font-black text-lg shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all">
              <Smartphone size={22} className="opacity-60" />
              ورود به سامانه پویش
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
