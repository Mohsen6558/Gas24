import { motion } from 'motion/react';
import { Twitter, Linkedin, Github, ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-50 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-12 pb-16 border-bottom border-slate-200">
          <div className="lg:w-1/3">
            <div className="flex items-center gap-3 mb-6">
              <img 
                src="https://gas24.ir/media/content/loginlogo.png" 
                alt="Logo" 
                className="h-10 w-auto"
              />
              <span className="text-xl font-bold text-slate-800">ایده خلاقان سبز آرتا</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              ارائه دهنده <span className="font-bold text-slate-500">راهکارهای هوشمند مدیریت انرژی</span> در پارک علم و فناوری اردبیل.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-12 lg:w-2/3">
            <div>
              <h4 className="font-bold text-slate-800 mb-6 text-sm">دسترسی</h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-primary transition-colors">خانه</a></li>
                <li><a href="#about" className="hover:text-primary transition-colors">درباره ما</a></li>
                <li><a href="#contact" className="hover:text-primary transition-colors">تماس</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-800 mb-6 text-sm">خدمات</h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-primary transition-colors">اتوماسیون</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">تحلیل داده</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">مانیتورینگ</a></li>
              </ul>
            </div>
            <div className="col-span-2 lg:col-span-1">
              <h4 className="font-bold text-slate-800 mb-6 text-sm">دمو</h4>
              <button className="flex items-center gap-2 text-primary font-bold text-sm hover:gap-3 transition-all">
                درخواست دمو
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="pt-10 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-slate-500 text-sm">
            © 2026 کلیه حقوق برای شرکت ایده خلاقان سبز آرتا محفوظ است.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-slate-400 hover:text-primary transition-colors"><Linkedin className="h-5 w-5" /></a>
            <a href="#" className="text-slate-400 hover:text-primary transition-colors"><Twitter className="h-5 w-5" /></a>
            <a href="#" className="text-slate-400 hover:text-primary transition-colors"><Github className="h-5 w-5" /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
