
import React from 'react';
import { NAV_ITEMS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      
      <aside className="hidden md:flex flex-col w-64 bg-white border-l border-slate-200 sticky top-0 h-screen z-40 shadow-sm">
        <div className="p-8">
          <h1 className="text-xl font-black text-orange-600 flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg"></div>
            گازیوم
          </h1>
        </div>
        
        <nav className="flex-grow px-4 space-y-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-black text-sm transition-all ${
                activeTab === item.id 
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' 
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100">
          <div className="bg-slate-50 p-4 rounded-xl text-[10px] font-bold text-slate-400 text-center leading-relaxed">
            نسخه دسکتاپ گازیوم ۱.۰.۲<br/>
            مدیریت هوشمند انرژی
          </div>
        </div>
      </aside>

      
      <main className="flex-grow w-full max-w-7xl mx-auto md:px-8 px-4 py-6 pb-24 md:pb-12">
        {children}
      </main>
      
      
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] flex justify-around items-center px-2 py-3 z-50">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === item.id ? 'text-orange-500 scale-110' : 'text-slate-400'
            }`}
          >
            {item.icon}
            <span className="text-[10px] font-bold">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
