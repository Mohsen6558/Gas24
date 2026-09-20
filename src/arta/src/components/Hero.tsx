import { motion } from 'motion/react';
import { Zap, Cpu, Cloud, Database, Network, Activity, Wifi, Globe } from 'lucide-react';

export default function Hero() {
  const floatingIcons = [
    { Icon: Cpu, color: 'text-primary', top: '10%', left: '15%', delay: 0 },
    { Icon: Cloud, color: 'text-sky-500', top: '15%', right: '10%', delay: 1 },
    { Icon: Wifi, color: 'text-emerald-500', bottom: '15%', left: '20%', delay: 2 },
    { Icon: Database, color: 'text-amber-500', top: '40%', left: '5%', delay: 1.5 },
    { Icon: Network, color: 'text-indigo-500', bottom: '25%', right: '15%', delay: 0.5 },
    { Icon: Globe, color: 'text-rose-500', top: '12%', left: '40%', delay: 2.5 },
  ];

  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden gradient-bg" id="hero">
      {/* Floating Animated Icons */}
      {floatingIcons.map((item, idx) => (
        <motion.div
          key={idx}
          className={`absolute hidden lg:block ${item.color} opacity-20`}
          style={{ top: item.top, left: item.left, right: item.right, bottom: item.bottom }}
          animate={{ 
            y: [0, -20, 0],
            rotate: [0, 10, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 5 + Math.random() * 2,
            repeat: Infinity,
            delay: item.delay,
            ease: "easeInOut"
          }}
        >
          <item.Icon size={48} />
        </motion.div>
      ))}

      {/* Floating Blobs */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl floating"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-secondary/5 rounded-full blur-3xl floating" style={{ animationDelay: '-3s' }}></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col"
          >
            <h1 className="text-5xl lg:text-7xl font-extrabold leading-tight text-slate-900 mb-8">
              پیشرو در <span className="text-primary">هوشمندسازی</span> <br/> شبکه گاز ایران
            </h1>
            <p className="text-xl text-slate-500 mb-10 max-w-lg leading-relaxed">
              شرکت <span className="font-bold text-slate-700">دانش‌بنیان ایده خلاقان سبز آرتا</span>، با تکیه بر توان متخصصان داخلی، آینده مدیریت انرژی را با <span className="font-bold text-primary">هوش مصنوعی</span> و <span className="font-bold text-secondary">اینترنت اشیا (IoT)</span> بازنویسی می‌کند.
            </p>
            <div className="flex flex-wrap gap-6">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-10 py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/20"
              >
                درباره ما
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-10 py-4 bg-secondary text-white font-bold rounded-2xl hover:bg-secondary/90 transition-all shadow-xl shadow-secondary/20"
              >
                تماس با ما
              </motion.button>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, rotate: -2 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="relative"
          >
            <div className="relative rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white/50 backdrop-blur-sm z-10 bg-white/20">
              <img 
                src="https://gas24.ir/media/content/arta.jpg" 
                alt="Ideh Khaleghan Sabz Arta Technology" 
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent"></div>
            </div>
            
            {/* Minimal Stat Card Overlay */}
            <motion.div 
              initial={{ x: 50, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute -bottom-6 -right-6 md:-right-12 bg-white p-6 rounded-3xl shadow-2xl fantasy-glow border border-slate-100 z-20"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">+۱۰۰</div>
                  <div className="text-xs text-slate-500 font-bold">پروژه فعال</div>
                </div>
              </div>
            </motion.div>

            {/* Orbiting Decor Icons */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-10 border-2 border-dashed border-primary/20 rounded-full pointer-events-none"
            >
              <div className="absolute top-0 left-1/2 -ml-3 w-6 h-6 bg-secondary rounded-full blur-sm"></div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
