
import React from 'react';
import { Reward, Winner, Transaction, ConsumptionData } from './types';
import { Wallet, Home, Gift, User, BookOpen, BarChart3 } from 'lucide-react';

export const COLORS = {
  primary: '#F97316',
  secondary: '#FACC15',
  accent: '#22C55E',
  bg: '#fcfcfc',
  dark: '#1E293B'
};

export const MOCK_CONSUMPTION: ConsumptionData[] = [
  { month: 'مهر', currentYear: 120, lastYear: 150 },
  { month: 'آبان', currentYear: 200, lastYear: 220 },
  { month: 'آذر', currentYear: 350, lastYear: 400 },
  { month: 'دی', currentYear: 480, lastYear: 550 },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', date: '۱۴۰۲/۱۰/۱۲', amount: 500, description: 'صرفه‌جویی آذر ماه', type: 'earn' },
  { id: '2', date: '۱۴۰۲/۱۰/۱۵', amount: -100, description: 'دریافت بن خرید رفاه', type: 'spend' },
  { id: '3', date: '۱۴۰۲/۱۰/۲۰', amount: 200, description: 'گردونه شانس', type: 'earn' },
  { id: '4', date: '۱۴۰۲/۱۰/۲۵', amount: 1000, description: 'پاداش دعوت از دوستان', type: 'earn' },
];

export const MOCK_REWARDS: Reward[] = [
  {
    id: '1',
    title: '۵۰ هزار تومان بن خرید از فروشگاه‌های رفاه',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400',
    requiredGazyom: 100,
    category: 'voucher',
    description: 'با دریافت این کد، می‌توانید برای هر خرید بالای ۲۰۰ هزار تومان ۵۰ هزار تومان تخفیف بگیرید.',
    terms: 'اعتبار تا پایان سال ۱۴۰۳. برای یک بار استفاده. تنها خرید از فروشگاه‌های رفاه سراسر کشور.'
  },
  {
    id: '2',
    title: '۱۰۰ هزار تومان بن خرید از رستوران پرپروک',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=400',
    requiredGazyom: 1000,
    category: 'voucher',
    description: 'لذت یک پیتزای داغ با تخفیف ویژه گازیوم در شعب پرپروک.',
    terms: 'مخصوص سفارش‌های حضوری و تلفنی.'
  },
  {
    id: '3',
    title: 'بسته اعتباری ۲۰ میلیون تومانی یک ماهه',
    image: 'https://images.unsplash.com/photo-1580519542036-c47de6196ba5?auto=format&fit=crop&q=80&w=400',
    requiredGazyom: 100000,
    category: 'cash',
    description: 'دریافت وام فوری بدون ضامن برای خرید کالا.',
    terms: 'نیاز به رتبه اعتباری طلایی.'
  },
  {
    id: '4',
    title: 'شارژ نقدی به میزان ۱۰۰ هزار تومان',
    image: 'https://images.unsplash.com/photo-1628717341663-0007b0ee2597?auto=format&fit=crop&q=80&w=400',
    requiredGazyom: 1000,
    category: 'cash',
    description: 'مبلغ به صورت نقد به کیف پول گازیوم شما واریز می‌شود.',
    terms: 'محدودیت دفعات دریافت: ۲ بار در ماه.'
  },
  {
    id: '5',
    title: '۵۰ هزار تومان بن خرید از دیجی کالا',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=400',
    requiredGazyom: 1000,
    category: 'voucher',
    description: 'خرید از بزرگترین فروشگاه اینترنتی ایران.',
    terms: 'بدون محدودیت حداقل خرید.'
  }
];

export const NAV_ITEMS = [
  { id: 'home', label: 'خانه', icon: <Home size={22} /> },
  { id: 'rewards', label: 'جوایز', icon: <Gift size={22} /> },
  { id: 'analysis', label: 'تحلیل مصرف', icon: <BarChart3 size={22} /> },
  { id: 'edu', label: 'آموزش', icon: <BookOpen size={22} /> },
  { id: 'profile', label: 'پروفایل', icon: <User size={22} /> }
];
