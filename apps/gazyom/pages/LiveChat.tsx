
import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, Send, User, MessageCircle, MoreVertical, Paperclip, Smile } from 'lucide-react';
import { toPersianDigits } from '../services/geminiService';

const LiveChat: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [messages, setMessages] = useState([
    { id: 1, text: 'سلام! چطور می‌توانم در مورد پویش گازیوم به شما کمک کنم؟', sender: 'support', time: '۱۰:۰۰' },
    { id: 2, text: 'سوال من در مورد نحوه محاسبه امتیازهای ماه آذر است.', sender: 'user', time: '۱۰:۰۲' },
    { id: 3, text: 'امتیازهای آذرماه پس از صدور قبض نهایی و تایید کنتور توسط مامور شرکت گاز به حساب شما واریز می‌شود. معمولاً تا ۴۸ ساعت بعد از صدور قبض طول می‌کشد.', sender: 'support', time: '۱۰:۰۵' },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const now = new Date();
    const time = toPersianDigits(`${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`);
    setMessages([...messages, { id: Date.now(), text: input, sender: 'user', time }]);
    setInput('');
  };

  return (
    <div className="fixed inset-0 bg-white z-[80] flex flex-col animate-in slide-in-from-left duration-500">
      
      <header className="p-4 flex items-center justify-between border-b border-slate-100 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 bg-slate-50 rounded-[7px] active:scale-90 transition-all text-slate-500">
            <ChevronRight size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                <User size={20} />
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="flex flex-col">
              <h3 className="text-xs font-black text-slate-800">پشتیبانی گازیوم</h3>
              <span className="text-[9px] text-green-600 font-bold">پاسخگوی آنلاین</span>
            </div>
          </div>
        </div>
        <button className="p-2 text-slate-400">
          <MoreVertical size={20} />
        </button>
      </header>

      
      <div 
        ref={scrollRef}
        className="flex-grow overflow-y-auto p-6 space-y-6 bg-slate-50/50"
      >
        <div className="text-center">
          <span className="text-[9px] bg-slate-200 text-slate-500 px-3 py-1 rounded-full font-bold">امروز</span>
        </div>

        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}
          >
            <div className={`max-w-[80%] space-y-1 ${msg.sender === 'user' ? 'order-1' : 'order-1'}`}>
              <div className={`p-4 text-xs font-medium leading-relaxed shadow-sm ${
                msg.sender === 'user' 
                  ? 'bg-blue-600 text-white rounded-l-[15px] rounded-br-[15px]' 
                  : 'bg-white text-slate-700 rounded-r-[15px] rounded-bl-[15px] border border-slate-100'
              }`}>
                {msg.text}
              </div>
              <p className={`text-[8px] font-bold text-slate-400 ${msg.sender === 'user' ? 'text-left' : 'text-right'}`}>
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      
      <div className="p-4 bg-white border-t border-slate-100 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <button className="p-2 text-slate-300 hover:text-slate-500 transition-colors">
            <Paperclip size={20} />
          </button>
          <div className="flex-grow relative">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="پیام خود را اینجا بنویسید..."
              className="w-full bg-slate-50 border border-slate-200 rounded-[12px] py-3 px-10 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">
               <Smile size={18} />
            </button>
          </div>
          <button 
            onClick={handleSend}
            disabled={!input.trim()}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              input.trim() ? 'bg-blue-600 text-white shadow-lg active:scale-90' : 'bg-slate-100 text-slate-300'
            }`}
          >
            <Send size={18} className="rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveChat;
