import { motion } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: 'خانه', href: '#' },
    { name: 'محصولات', href: '#products' },
    { name: 'نوآوری', href: '#innovation' },
    { name: 'درباره ما', href: '#about' },
    { name: 'تماس با ما', href: '#contact' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass" id="header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center gap-3">
            <img 
              src="https://gas24.ir/media/content/loginlogo.png" 
              alt="Logo" 
              className="h-10 w-auto"
            />
            <span className="text-xl font-bold text-slate-800 hidden md:block">
              ایده خلاقان سبز آرتا
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 text-slate-600 font-medium">
            {navItems.map((item) => (
              <a 
                key={item.href} 
                href={item.href} 
                className="hover:text-primary transition-colors duration-200"
              >
                {item.name}
              </a>
            ))}
          </nav>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-slate-600 p-2"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <motion.div 
        initial={false}
        animate={isOpen ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
        className="md:hidden overflow-hidden bg-white border-t border-slate-100"
      >
        <div className="flex flex-col gap-4 p-6 text-slate-600">
          {navItems.map((item) => (
            <a 
              key={item.href} 
              href={item.href} 
              className="hover:text-primary transition-colors duration-200"
              onClick={() => setIsOpen(false)}
            >
              {item.name}
            </a>
          ))}
        </div>
      </motion.div>
    </header>
  );
}
