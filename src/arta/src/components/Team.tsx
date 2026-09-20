import { motion } from 'motion/react';
import { Users, Zap, Lightbulb, Rocket } from 'lucide-react';

export default function Team() {
  const highlights = [
    { title: 'جوان و مشتاق', icon: Zap, color: 'text-secondary' },
    { title: 'خلاق و نوآور', icon: Lightbulb, color: 'text-primary' },
    { title: 'چابک و سریع', icon: Rocket, color: 'text-secondary' },
  ];

  return (
    <section className="py-32 bg-white relative overflow-hidden" id="team">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -mr-64 animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[100px] -ml-48 animate-pulse"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex flex-col items-center text-center space-y-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl space-y-6"
          >
            <h2 className="text-4xl lg:text-6xl font-extrabold text-slate-900 leading-tight">
              تیم ما؛ <span className="text-primary relative inline-block">
                قلب تپنده
                <svg className="absolute -bottom-2 left-0 w-full h-2 text-secondary/30" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 25 0, 50 5 T 100 5" fill="none" stroke="currentColor" strokeWidth="4" />
                </svg>
              </span> نوآوری
            </h2>
            <p className="text-xl lg:text-2xl text-slate-500 leading-relaxed">
              ما مجموعه‌ای از <span className="font-bold text-slate-700">متخصصان جوان و خلاق</span> هستیم که با اشتیاقی بی‌پایان، مرزهای تکنولوژی را در صنعت گاز جابجا می‌کنیم. تیمی چابک که هر چالشی را به یک شاهکار مهندسی تبدیل می‌کند.
            </p>
          </motion.div>

          <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
             {/* Central Fantasy Orb */}
             <motion.div 
               animate={{ 
                 scale: [1, 1.1, 1],
                 rotate: [0, 5, -5, 0]
               }}
               transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
               className="w-72 h-72 bg-gradient-to-tr from-primary via-accent to-secondary rounded-[4rem] flex items-center justify-center relative z-10 floating-delayed shadow-[0_20px_50px_rgba(21,128,61,0.3)]"
             >
                <div className="absolute inset-2 border-2 border-white/20 rounded-[3.5rem]"></div>
                <Users className="h-32 w-32 text-white" />
             </motion.div>

             {/* Orbiting Elements */}
             {[Zap, Lightbulb, Rocket].map((Icon, idx) => (
               <motion.div
                 key={idx}
                 animate={{ rotate: 360 }}
                 transition={{ duration: 15 + idx * 5, repeat: Infinity, ease: "linear" }}
                 className="absolute inset-0 pointer-events-none"
               >
                 <motion.div 
                   style={{ top: '10%' }}
                   className="absolute left-1/2 -ml-6 w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-primary border border-slate-100"
                   animate={{ rotate: -360 }}
                   transition={{ duration: 15 + idx * 5, repeat: Infinity, ease: "linear" }}
                 >
                   <Icon size={24} />
                 </motion.div>
               </motion.div>
             ))}

             {/* Back Glow */}
             <div className="absolute inset-0 bg-primary/20 rounded-full blur-[80px] animate-pulse"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
            {highlights.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.2 }}
                className="minimal-card p-10 flex flex-col items-center fantasy-glow"
              >
                <div className={`w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-6 group-hover:bg-primary transition-colors`}>
                  <item.icon className={`h-8 w-8 ${item.color}`} />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm">استفاده از به‌روزترین متدهای دنیا</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
