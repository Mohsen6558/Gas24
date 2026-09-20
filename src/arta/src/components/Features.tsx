import { motion } from 'motion/react';
import { Cloud, Cpu, BarChart3, ShieldCheck } from 'lucide-react';
import { ReactNode } from 'react';

interface TechItem {
  title: string;
  description: ReactNode;
  icon: any;
  color: string;
}

const technologies: TechItem[] = [
  {
    title: 'یکپارچه‌سازی IoT',
    description: <>اتصال هوشمند تجهیزات و کنتورها برای جمع‌آوری <span className="font-bold text-slate-700">داده‌های لحظه‌ای</span> با بالاترین استانداردهای امنیتی.</>,
    icon: Cpu,
    color: 'text-primary'
  },
  {
    title: 'سیستم‌های ابری',
    description: <>زیرساخت قابل اعتماد و <span className="font-bold text-slate-700">مقیاس‌پذیر</span> برای ذخیره‌سازی و پردازش داده‌ها در هر زمان و مکان.</>,
    icon: Cloud,
    color: 'text-secondary'
  },
  {
    title: 'تحلیل داده فرادرنگ',
    description: <>مانیتورینگ دقیق و لحظه‌ای <span className="font-bold text-slate-700">مصرف گاز</span> برای بهینه‌سازی توزیع و کاهش هدررفت انرژی.</>,
    icon: BarChart3,
    color: 'text-primary'
  },
  {
    title: 'تشخیص خطا با هوش مصنوعی',
    description: <>الگوریتم‌های <span className="font-bold text-slate-700">یادگیری ماشین</span> برای شناسایی ناهنجاری‌ها و پیش‌بینی خرابی‌های احتمالی.</>,
    icon: ShieldCheck,
    color: 'text-secondary'
  },
];

export default function Features() {
  return (
    <section className="py-24 bg-white" id="innovation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-3xl lg:text-4xl font-bold text-slate-900 mt-4"
          >
            پیشرو در فناوری‌های نوین
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {technologies.map((tech, index) => (
            <motion.div
              key={tech.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ scale: 1.05, rotate: 1 }}
              className="minimal-card p-8 fantasy-glow cursor-pointer"
            >
              <tech.icon className={`h-10 w-10 ${tech.color} mb-6`} />
              <h3 className="text-lg font-bold text-slate-900 mb-3">{tech.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                {tech.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
