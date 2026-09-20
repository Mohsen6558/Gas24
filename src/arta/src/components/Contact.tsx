import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

export default function Contact() {
  return (
    <section className="py-24 bg-white overflow-hidden border-t border-slate-100" id="contact">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-3xl lg:text-5xl font-extrabold mb-8 text-slate-900">در تماس باشید</h2>
          <p className="text-slate-500 text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
            آماده شروع پروژه‌ای جدید هستید یا سوالی دارید؟ تیم <span className="font-bold text-primary">ایده خلاقان سبز آرتا</span> آماده شنیدن نظرات شماست.
          </p>

          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <div className="flex flex-col items-center p-8 bg-slate-50 rounded-3xl border border-slate-100 hover:border-primary/20 transition-all">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                <MapPin className="h-7 w-7 text-primary" />
              </div>
              <h4 className="font-bold text-slate-900 mb-2 text-lg">آدرس مرکزی</h4>
              <p className="text-slate-500 text-sm">اردبیل – شهرک نادری، گلسار ۴، پ۵۴۸، ط۱</p>
              <p className="text-primary text-xs font-extrabold mt-2">پارک علم و فناوری استان اردبیل</p>
            </div>

            <div className="flex flex-col items-center p-8 bg-slate-50 rounded-3xl border border-slate-100 hover:border-secondary/20 transition-all">
              <div className="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center mb-4">
                <Phone className="h-7 w-7 text-secondary" />
              </div>
              <h4 className="font-bold text-slate-900 mb-2 text-lg">تماس مستقیم</h4>
              <p className="text-slate-500 text-xl font-bold tracking-wider" dir="ltr">۰۴۵-۳۳۷۸۰۳۷۳</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
