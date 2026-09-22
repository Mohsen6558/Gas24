import { motion } from 'motion/react';
import { Database, LineChart, Cpu } from 'lucide-react';

export default function About() {
  return (
    <section className="py-24 bg-white" id="about">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-primary font-bold tracking-wider uppercase text-sm mb-4 block">
              درباره ما
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6">
              مستقر در پارک علم و فناوری استان اردبیل
            </h2>
            <div className="space-y-6 text-slate-600 leading-relaxed text-lg">
              <p>
                ما در ایده خلاقان سبز آرتا، با بهره‌گیری از فضای تحقیقاتی و نوآورانه <span className="font-bold text-slate-800">پارک علم و فناوری اردبیل</span>، به دنبال تحول در نحوه مدیریت داده‌های انرژی هستیم.
              </p>
              <p>
                تخصص ما در توسعه نرم‌افزارهای <span className="font-bold text-primary">اندازه‌گیری هوشمند گاز</span>، <span className="font-bold text-primary">اتوماسیون قرائت کنتور</span> و <span className="font-bold text-primary">تحلیل داده‌های کلان</span> برای شرکت‌های خدمات‌رسان است.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="flex flex-col gap-1">
                <span className="text-4xl font-bold text-primary tracking-tighter">98%</span>
                <span className="text-slate-500 text-sm font-bold">دقت قرائت</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-4xl font-bold text-secondary tracking-tighter">100+</span>
                <span className="text-slate-500 text-sm font-bold">پروژه موفق</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-4xl font-bold text-primary tracking-tighter">20+</span>
                <span className="text-slate-500 text-sm font-bold">شرکت گاز استانی</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-4xl font-bold text-secondary tracking-tighter">24/7</span>
                <span className="text-slate-500 text-sm font-bold">پشتیبانی هوشمند</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative p-8 bg-slate-50 rounded-[40px] overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center">
                  <Database className="h-12 w-12 text-primary" />
                </div>
                <div className="h-60 bg-gradient-to-br from-secondary/20 to-secondary/5 rounded-2xl flex items-center justify-center">
                   <LineChart className="h-12 w-12 text-secondary" />
                </div>
              </div>
              <div className="space-y-4 pt-12">
                <div className="h-60 bg-gradient-to-br from-secondary/20 to-secondary/5 rounded-2xl flex items-center justify-center">
                   <Cpu className="h-12 w-12 text-secondary" />
                </div>
                <div className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center">
                   <div className="text-primary font-bold text-xl">Cloud AI</div>
                </div>
              </div>
            </div>
            
            {/* Overlay Pattern */}
            <div className="absolute inset-0 border-[32px] border-white rounded-[40px] pointer-events-none"></div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
