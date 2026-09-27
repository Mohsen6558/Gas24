/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import provincesData from './provinces.json';
import { 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Flame, 
  Home, 
  Building2, 
  Wind, 
  Thermometer, 
  Droplets, 
  DoorOpen, 
  Square, 
  MapPin, 
  Phone, 
  User,
  Info,
  AlertCircle,
  FileText,
  Send,
  Sun,
  ShieldCheck,
  Layout,
  Maximize
} from 'lucide-react';

// --- Utilities ---

const toPersianDigits = (str: string | number) => {
  if (str === null || str === undefined) return "";
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return str.toString().replace(/\d/g, (x) => persianDigits[parseInt(x)]);
};

const toEnglishDigits = (str: string) => {
  return str.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
            .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
};

const formatNumber = (num: string | number) => {
  if (num === null || num === undefined || num === "") return "";
  const cleaned = toEnglishDigits(num.toString()).replace(/,/g, '');
  if (isNaN(Number(cleaned)) && cleaned !== "") return toPersianDigits(num);
  
  const parts = cleaned.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return toPersianDigits(parts.join("."));
};

// --- Types & Constants ---

interface FormData {
  // Intro
  started: boolean;
  // Section 0
  fullName: string;
  phoneNumber: string;
  identificationType: 'gas' | 'postal';
  gasSubscriptionNumber: string;
  postalCode: string;
  province: string;
  city: string;
  habitationType: 'آپارتمان' | 'خانه ویلایی' | '';
  areaSize: string;
  // Section 1
  buildYear: string;
  materials: string;
  wallThickness: string;
  unitPosition: 'همکف' | 'میانی' | 'آخر/پنت‌هاوس' | '';
  sunLightPosition: string[];
  exposureToAir: string[];
  ceilingInsulation: 'دارد' | 'ندارد' | 'نمی‌دانم' | '';
  roofStatus: string;
  floorType: string;
  windowsCount: string;
  sunlightIntensity: string;
  // Section 2
  windowType: string;
  windowSealHealth: string;
  airLeakTest: string;
  coldWindDirection: string[];
  thickCurtains: boolean | null;
  crackedGlass: boolean | null;
  // Section 3
  entryDoorType: string;
  doorSealingStrip: boolean | null;
  standardBalconyDoor: boolean | null;
  windPenetrationDoors: string;
  // Section 4
  packagePipeInsulation: string;
  pipePath: string;
  hotWaterPathLength: string;
  radiatorLeak: boolean | null;
  roomWithoutRadiator: boolean | null;
  radiatorDistribution: string;
  radiatorCountAdequacy: string;
  // Section 5
  heatingSystemType: string;
  deviceCapacityAdequacy: string;
  deviceAge: string;
  annualServiceDone: boolean | null;
  flameQuality: string;
  chimneyStatus: string[];
  gasInletPressureAdequacy: boolean | null;
  packageInstallLocation: string;
  // Section 6
  hotWaterSource: string;
  tempSetting: string;
  hotWaterPipeLength: string;
  hotWaterArrivalTime: string;
  hotWaterPipeInsulation: boolean | null;
  jointLeak: boolean | null;
  // Section 7
  gasHeaterExists: boolean;
  gasHeaterType: string;
  gasHeaterChimney: string;
  gasHeaterCapacityAdequacy: string;
  gasHeaterPlacement: string;
  odsPerformance: string;
  gasHeaterFlameHealth: string;
  // Section 8
  airIngressWindows: string;
  airIngressDoor: string;
  unstandardVentilationOpen: boolean | null;
  underDoorGap: boolean | null;
  unblockedFalseCeiling: boolean | null;
  externalWallCrack: boolean | null;
  // Section 9
  fanWithoutReturnValve: boolean | null;
  coldAirFromDucts: boolean | null;
  jointKitchenVentilation: boolean | null;
  hotAirExitSkyLight: string;
  // Section 10
  climateRegion: string;
  windIntensity: string;
  prevailingWindDirection: string;
  // Final
  additionalComments: string;
  submitted: boolean;
}

const PROVINCES = Object.values(provincesData);
const PROVINCES_MAP = provincesData as Record<string, string>;

const INITIAL_DATA: FormData = {
  started: false,
  fullName: '',
  phoneNumber: '',
  identificationType: 'gas',
  gasSubscriptionNumber: '',
  postalCode: '',
  province: '',
  city: '',
  habitationType: '',
  areaSize: '',
  buildYear: '',
  materials: '',
  wallThickness: '',
  unitPosition: '',
  sunLightPosition: [],
  exposureToAir: [],
  ceilingInsulation: '',
  roofStatus: '',
  floorType: '',
  windowsCount: '',
  sunlightIntensity: '',
  windowType: '',
  windowSealHealth: '',
  airLeakTest: '',
  coldWindDirection: [],
  thickCurtains: null,
  crackedGlass: null,
  entryDoorType: '',
  doorSealingStrip: null,
  standardBalconyDoor: null,
  windPenetrationDoors: '',
  packagePipeInsulation: '',
  pipePath: '',
  hotWaterPathLength: '',
  radiatorLeak: null,
  roomWithoutRadiator: null,
  radiatorDistribution: '',
  radiatorCountAdequacy: '',
  heatingSystemType: '',
  deviceCapacityAdequacy: '',
  deviceAge: '',
  annualServiceDone: null,
  flameQuality: '',
  chimneyStatus: [],
  gasInletPressureAdequacy: null,
  packageInstallLocation: '',
  hotWaterSource: '',
  tempSetting: '',
  hotWaterPipeLength: '',
  hotWaterArrivalTime: '',
  hotWaterPipeInsulation: null,
  jointLeak: null,
  gasHeaterExists: false,
  gasHeaterType: '',
  gasHeaterChimney: '',
  gasHeaterCapacityAdequacy: '',
  gasHeaterPlacement: '',
  odsPerformance: '',
  gasHeaterFlameHealth: '',
  airIngressWindows: '',
  airIngressDoor: '',
  unstandardVentilationOpen: null,
  underDoorGap: null,
  unblockedFalseCeiling: null,
  externalWallCrack: null,
  fanWithoutReturnValve: null,
  coldAirFromDucts: null,
  jointKitchenVentilation: null,
  hotAirExitSkyLight: '',
  climateRegion: '',
  windIntensity: '',
  prevailingWindDirection: '',
  additionalComments: '',
  submitted: false,
};

const YesNoSelector = ({ value, onChange, label, helper, onSelect }: { value: boolean | null, onChange: (val: boolean) => void, label: React.ReactNode, helper?: React.ReactNode, onSelect?: (val: boolean) => void }) => (
  <FormField label={label} helper={helper}>
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={() => {
          onChange(true);
          onSelect?.(true);
        }}
        className={`p-4 rounded-xl border text-sm font-bold transition-all flex justify-between items-center ${value === true ? 'border-primary-orange bg-primary-light text-primary-orange' : 'border-gray-100 bg-bg-gray text-gray-500'}`}
      >
        بله
        {value === true && <CheckCircle2 size={16} />}
      </button>
      <button
        onClick={() => {
          onChange(false);
          onSelect?.(false);
        }}
        className={`p-4 rounded-xl border text-sm font-bold transition-all flex justify-between items-center ${value === false ? 'border-primary-orange bg-primary-light text-primary-orange' : 'border-gray-100 bg-bg-gray text-gray-500'}`}
      >
        خیر
        {value === false && <CheckCircle2 size={16} />}
      </button>
    </div>
  </FormField>
);

const OptionSelector = ({ options, value, onChange, label, helper, required, className = "", onSelect }: { options: string[], value: string, onChange: (val: string) => void, label: React.ReactNode, helper?: React.ReactNode, required?: boolean, className?: string, onSelect?: (val: string) => void }) => {
  if (options.length <= 3) {
    return (
      <FormField label={label} helper={helper} required={required} className={className}>
        <div className="grid grid-cols-1 gap-2">
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => {
                onChange(opt);
                onSelect?.(opt);
              }}
              className={`p-4 rounded-xl border text-sm font-bold text-right flex justify-between items-center transition-all ${value === opt ? 'border-primary-orange bg-primary-light text-primary-orange' : 'border-gray-100 bg-bg-gray text-gray-500'}`}
            >
              <span className="flex-1 text-right">{opt}</span>
              {value === opt && <CheckCircle2 size={16} className="shrink-0" />}
            </button>
          ))}
        </div>
      </FormField>
    );
  }

  return (
    <FormField label={label} helper={helper} required={required} className={className}>
      <div className="relative">
        <select 
          value={value} 
          onChange={e => {
            const val = e.target.value;
            onChange(val);
            if (val) onSelect?.(val);
          }} 
          className="input-minimal appearance-none pr-4 pl-10"
        >
          <option value="">انتخاب کنید...</option>
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          <ChevronLeft size={16} className="-rotate-90" />
        </div>
      </div>
    </FormField>
  );
};

// --- Sub-components ---

const SectionCard = ({ children, title, icon: Icon, description, stepNumber }: { children: React.ReactNode, title: string, icon?: any, description?: React.ReactNode, stepNumber: number }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="minimal-card rounded-3xl p-6 md:p-10 mb-6"
  >
    <div className="flex items-center gap-4 mb-8">
      <div className="w-12 h-12 bg-primary-light rounded-2xl flex items-center justify-center text-primary-orange shrink-0">
        {Icon && <Icon size={24} />}
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {description && <div className="text-xs text-gray-400 mt-1 font-medium">{description}</div>}
      </div>
    </div>
    <div className="space-y-6">
      {children}
    </div>
  </motion.div>
);

const FormField = ({ label, children, required, helper, className = "" }: { label: React.ReactNode, children: React.ReactNode, required?: boolean, helper?: React.ReactNode, className?: string }) => (
  <div className={`flex flex-col gap-2.5 ${className}`}>
    <label className="text-[13px] font-bold text-gray-700 flex items-center gap-1.5 px-1">
      {label}
      {required && <span className="text-red-400">*</span>}
    </label>
    {helper && <div className="text-[11px] text-gray-400 px-1 leading-relaxed">{helper}</div>}
    {children}
  </div>
);

const MainButton = ({ 
  onClick, 
  children, 
  variant = 'primary', 
  disabled = false,
  className = "" 
}: { 
  onClick?: () => void, 
  children: React.ReactNode, 
  variant?: 'primary' | 'secondary' | 'outline',
  disabled?: boolean,
  className?: string
}) => {
  const base = "tap-target px-8 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 active:scale-95 text-sm";
  const variants = {
    primary: "bg-primary-orange text-white shadow-lg shadow-orange-100",
    secondary: "bg-bg-gray text-gray-500 hover:bg-gray-100",
    outline: "border-2 border-primary-orange text-primary-orange"
  };
  
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${base} ${variants[variant]} ${disabled ? 'opacity-30 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

const STEPS_LABELS = [
  "مشخصات فردی",
  "موقعیت منزل",
  "نوع و متراژ بنا",
  "عمر ساختمان",
  "جنس و ضخامت دیوار",
  "موقعیت واحد در طبقات",
  "نورگیری و آفتاب",
  "وضعیت عایق سقف",
  "پوشش کف منزل",
  "تعداد و نوع پنجره",
  "درزگیری پنجره‌ها",
  "سلامت شیشه و پرده",
  "نوع درب ورودی",
  "درزگیری درب‌ها",
  "سیستم گرمایش",
  "عایق‌بندی لوله‌ها",
  "وضعیت رادیاتورها",
  "سلامت فنی دستگاه",
  "منبع آب گرم",
  "اتلاف در آب گرم",
  "بخاری گازی",
  "درزگیری و باد سرد",
  "عوامل محیطی",
  "یادداشت نهایی"
];

// --- Main App Component ---

export default function App() {
  const [data, setData] = useState<FormData>(INITIAL_DATA);
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobileFromUrl, setIsMobileFromUrl] = useState(false);
  const [isGasNoFromUrl, setIsGasNoFromUrl] = useState(false);
  const totalSteps = 24;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fullName = params.get('name');
    const mobile = params.get('mobile');
    const gasNo = params.get('gas_no');
    const postal = params.get('postal');

    if (mobile) setIsMobileFromUrl(true);
    if (gasNo) setIsGasNoFromUrl(true);

    if (fullName || mobile || gasNo || postal) {
      setData(prev => ({
        ...prev,
        fullName: fullName || prev.fullName,
        phoneNumber: mobile || prev.phoneNumber,
        gasSubscriptionNumber: gasNo || prev.gasSubscriptionNumber,
        postalCode: postal || prev.postalCode,
        identificationType: 'gas'
      }));
    }
  }, []);

  const nextStep = () => {
    let next = step + 1;
    
    // Skip central heating questions if not applicable
    if (next === 15 && data.heatingSystemType === 'بخاری (بدون سیستم مرکزی)') {
      next = 18; // Skip to "System hot water"
    }
    
    setStep(s => Math.min(next, totalSteps));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const prevStep = () => {
    let prev = step - 1;
    
    // Skip central heating questions when going back
    if (prev === 17 && data.heatingSystemType === 'بخاری (بدون سیستم مرکزی)') {
      prev = 14; // Go back to Heating System Type
    }

    setStep(s => Math.max(prev, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateData = (field: keyof FormData, value: any, options: { autoNext?: boolean } = {}) => {
    setData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-advance logic
      if (options.autoNext) {
        setTimeout(() => {
          setStep(currentStep => {
            // Check if step is valid with NEW data context
            const isValid = checkValidityForData(currentStep, newData);
            if (isValid) {
              let next = currentStep + 1;
              if (next === 15 && newData.heatingSystemType === 'بخاری (بدون سیستم مرکزی)') {
                next = 18;
              }
              window.scrollTo({ top: 0, behavior: 'smooth' });
              return Math.min(next, totalSteps);
            }
            return currentStep;
          });
        }, 400); // 400ms delay to see the selection
      }
      
      return newData;
    });
  };

  const toggleArrayItem = (field: keyof FormData, value: string) => {
    const currentArray = data[field] as string[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    updateData(field, newArray);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Find the province key
      const provinceEntry = Object.entries(PROVINCES_MAP).find(([key, val]) => val === data.province);
      const provinceKey = provinceEntry ? provinceEntry[0] : 'base';
      const externalUrl = `https://${provinceKey}.gas24.ir/api/index.php/ws-optimize/submit-declaration`;
      const { submitted, ...formData } = data;

      const response = await fetch(externalUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setStep(24);
      } else {
        const errorText = await response.text().catch(() => '');
        alert(`خطا در ثبت اطلاعات: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('خطا در برقراری ارتباط با سرور مقصد.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkValidityForData = (stepIndex: number, currentData: FormData) => {
    const d = currentData;
    switch (stepIndex) {
      case 0:
        return !!(d.fullName && d.phoneNumber.length >= 10 && d.gasSubscriptionNumber);
      case 1: return !!(d.province && d.city);
      case 2: return !!(d.habitationType && d.areaSize);
      case 3: return !!d.buildYear;
      case 4: return !!(d.materials && d.wallThickness);
      case 5: return !!d.unitPosition;
      case 6: return true;
      case 7: return !!d.ceilingInsulation;
      case 8: return !!d.floorType;
      case 9: return !!(d.windowsCount && d.windowType);
      case 10: return !!d.windowSealHealth;
      case 11: return d.thickCurtains !== null && d.crackedGlass !== null;
      case 12: return !!d.entryDoorType;
      case 13: return d.doorSealingStrip !== null && d.standardBalconyDoor !== null && !!d.windPenetrationDoors;
      case 14: return !!(d.heatingSystemType && d.deviceAge);
      case 15: return !!(d.packagePipeInsulation && d.pipePath);
      case 16: return d.radiatorLeak !== null && d.roomWithoutRadiator !== null && !!d.hotWaterPathLength;
      case 17: return !!d.flameQuality && d.annualServiceDone !== null;
      case 18: return !!d.hotWaterSource && !!d.tempSetting;
      case 19: return !!d.hotWaterArrivalTime && d.hotWaterPipeInsulation !== null && d.jointLeak !== null;
      case 20: return d.gasHeaterExists !== null && (!d.gasHeaterExists || (!!d.gasHeaterType && !!d.gasHeaterChimney));
      case 21: return !!d.airIngressDoor && d.unstandardVentilationOpen !== null && d.underDoorGap !== null;
      case 22: return !!d.windIntensity && d.externalWallCrack !== null;
      default: return true;
    }
  };

  const isStepValid = () => checkValidityForData(step, data);

  if (!data.started && step === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-primary-light rounded-[32px] flex items-center justify-center mx-auto mb-10 text-primary-orange">
            <Flame size={48} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-6">پویش گرمای پایدار</h1>
          <div className="space-y-6 text-gray-400 leading-relaxed mb-8 text-sm font-medium">
            <p>بررسی هوشمند وضعیت مصرف انرژی و سیستم‌های گرمایشی ساختمان شما برای بهینه‌سازی مصرف گاز.</p>
            <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 text-right leading-loose">
              <p className="text-blue-700 text-xs font-bold">
                این پرسشنامه جهت تحلیل الگوهای مصرف و اجرای طرح‌های بهینه‌سازی انرژی در ساختمان‌های مسکونی تدوین شده است. همکاری شما در ارائه اطلاعات دقیق، گامی موثر در مدیریت منابع انرژی کشور خواهد بود.
              </p>
            </div>
          </div>
          <MainButton 
            className="w-full text-base py-5"
            onClick={() => {
              setData(d => ({ ...d, started: true }));
              setStep(0);
            }}
          >
            شروع پرسشنامه
            <ChevronLeft size={20} />
          </MainButton>
          <div className="mt-12 text-[11px] text-gray-300 font-medium">
            تهیه شده در شرکت فناوران پیشرو
          </div>
        </motion.div>
      </div>
    );
  }

  if (step === 24) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-4">سپاس از مشارکت شما</h2>
          <p className="text-gray-400 leading-loose text-sm font-medium">
            اطلاعات شما با موفقیت در سیستم ثبت گردید. همیاری شما گامی مؤثر در جهت بهینه‌سازی مصرف انرژی کشور است.
            <br />
            <span className="text-primary-orange font-bold mt-4 block">در صورت نیاز به‌زودی همکاران ما با شما تماس خواهند گرفت.</span>
          </p>
          <div className="bg-bg-gray p-6 rounded-3xl mt-8 mb-8 border border-border-soft text-right">
             <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
               <Flame size={18} className="text-primary-orange" />
               نکته انرژی:
             </h3>
             <p className="text-xs text-gray-500 leading-relaxed">
               بیش از ۶۰٪ مصرف گاز خانگی صرف گرمایش فضا می‌شود. با رعایت نکات این پرسشنامه می‌توانید تا ۳۰٪ در هزینه‌های خود صرفه‌جویی کنید.
             </p>
          </div>
          <MainButton 
            variant="secondary" 
            className="w-full"
            onClick={() => {
              setData(INITIAL_DATA);
              setStep(0);
            }}
          >
            بازگشت به ابتدا
          </MainButton>
        </motion.div>
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <SectionCard stepNumber={0} title="مشخصات فردی" icon={User} description={<>اطلاعات هویتی جهت ثبت در پایگاه داده و تحلیل <span className="font-bold text-gray-700 underline decoration-primary-orange/30">بهینه‌سازی انرژی</span>.</>}>
            <FormField label="نام و خانوادگی" required>
              <input type="text" value={data.fullName} onChange={e => updateData('fullName', e.target.value)} className="input-minimal" placeholder="مثلاً: علیرضا محمدی" />
            </FormField>
            
            <FormField label="شماره تماس" required helper={isMobileFromUrl ? <><span className="font-bold text-primary-orange">شماره تماس از طریق لینک دریافتی ثبت شده و قابل ویرایش نیست.</span></> : <>جهت <span className="font-bold text-gray-700">هماهنگی‌های بعدی</span> در صورت نیاز.</>}>
              <input 
                type="tel" 
                dir="ltr" 
                inputMode="numeric" 
                value={toPersianDigits(data.phoneNumber)} 
                onChange={e => updateData('phoneNumber', toEnglishDigits(e.target.value))} 
                className={`input-numeric text-right ${isMobileFromUrl ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-100 opacity-80' : ''}`} 
                placeholder="۰۹۱۲xxxxxxx" 
                disabled={isMobileFromUrl}
              />
            </FormField>

            <div className="space-y-4">
              <FormField label="شماره اشتراک گاز" required helper={isGasNoFromUrl ? <><span className="font-bold text-primary-orange">شماره اشتراک از طریق لینک دریافتی ثبت شده و قابل ویرایش نیست.</span></> : <>این شماره بر روی <span className="font-bold text-gray-700">قبض گاز</span> شما درج شده است.</>}>
                <input 
                  type="text" 
                  dir="ltr" 
                  inputMode="numeric"
                  value={toPersianDigits(data.gasSubscriptionNumber)} 
                  onChange={e => updateData('gasSubscriptionNumber', toEnglishDigits(e.target.value))} 
                  className={`input-numeric text-right ${isGasNoFromUrl ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-100 opacity-80' : ''}`} 
                  placeholder="مثلاً: ۱۲۳۴۵۶۷۸۹" 
                  disabled={isGasNoFromUrl}
                />
              </FormField>
            </div>
          </SectionCard>
        );
      case 1:
        return (
          <SectionCard stepNumber={1} title="موقعیت منزل" icon={MapPin} description="تعیین محدوده جغرافیایی جهت تحلیل شرایط آب و هوایی.">
            <div className="grid grid-cols-1 gap-4">
              <OptionSelector 
                label="استان" 
                required 
                options={PROVINCES}
                value={data.province}
                onChange={v => updateData('province', v, { autoNext: true })}
              />
              <FormField label="شهر" required>
                <input type="text" value={data.city} onChange={e => updateData('city', e.target.value)} className="input-minimal" placeholder="نام شهر" />
              </FormField>
            </div>
          </SectionCard>
        );
      case 2:
        return (
          <SectionCard stepNumber={2} title="نوع و متراژ بنا" icon={Home} description="اندازه منزل تاثیر مستقیم بر میزان انرژی مورد نیاز دارد.">
            <FormField label="نوع محل سکونت" required>
              <div className="grid grid-cols-2 gap-3">
                {['آپارتمان', 'خانه ویلایی'].map((opt: any) => (
                  <button key={opt} onClick={() => updateData('habitationType', opt, { autoNext: true })} className={`p-4 rounded-2xl border-2 transition-all font-bold flex flex-col items-center justify-center gap-2 text-xs ${data.habitationType === opt ? 'border-primary-orange bg-primary-light text-primary-orange' : 'border-transparent bg-bg-gray text-gray-400'}`}>
                    {opt === 'آپارتمان' ? <Building2 size={24} /> : <Home size={24} />}
                    {opt}
                  </button>
                ))}
              </div>
            </FormField>
            <FormField label="متراژ تقریبی واحد (مترمربع)" required helper={<>مجموع مساحت تمام <span className="font-bold text-gray-700">اتاق‌ها و پذیرایی</span>.</>}>
              <div className="relative">
                <input type="text" dir="ltr" inputMode="numeric" value={formatNumber(data.areaSize)} onChange={e => updateData('areaSize', toEnglishDigits(e.target.value).replace(/,/g, ''))} className="input-numeric text-right pl-14" placeholder="مثلاً: ۸۵" />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 font-bold text-xs">m²</span>
              </div>
            </FormField>
          </SectionCard>
        );
      case 3:
        return (
          <SectionCard stepNumber={3} title="عمر ساختمان" icon={FileText} description="ساختمان‌های قدیمی معمولاً اتلاف انرژی بیشتری دارند.">
            <FormField label="سال ساخت" required helper={<>اگر سال دقیق را نمی‌دانید، عدد <span className="font-bold text-gray-700">تقریبی</span> وارد کنید.</>}>
              <input type="text" dir="ltr" inputMode="numeric" value={toPersianDigits(data.buildYear)} onChange={e => updateData('buildYear', toEnglishDigits(e.target.value))} placeholder="مثلاً: ۱۳۹۵" className="input-numeric" />
            </FormField>
          </SectionCard>
        );
      case 4:
        return (
          <SectionCard stepNumber={4} title="جنس و ضخامت دیوار" icon={Home} description="دیوارها مثل لباس ساختمان هستند.">
            <OptionSelector 
              label="جنس دیوارهای بیرونی" 
              required 
              helper={<>دیوارهای <span className="font-bold text-gray-700">سفالی یا آجری</span> گرما را بهتر از بلوک سیمانی حفظ می‌کنند.</>}
              options={['آجر (قدیمی)', 'سفال (معمولی)', 'بلوک سیمانی', 'پیش‌ساخته یا عایق‌دار']}
              value={data.materials}
              onChange={v => updateData('materials', v, { autoNext: true })}
            />
            <OptionSelector 
              label="ضخامت دیوار بیرونی" 
              required 
              helper={<>دیوار پهن‌تر مثل یک <span className="font-bold text-gray-700">عایق طبیعی</span> عمل می‌کند.</>}
              options={['نازک (کمتر از ۲۰ سانت)', 'معمولی (۲۰ تا ۳۵ سانت)', 'بسیار ضخیم']}
              value={data.wallThickness}
              onChange={v => updateData('wallThickness', v, { autoNext: true })}
            />
          </SectionCard>
        );
      case 5:
        return (
          <SectionCard stepNumber={5} title="موقعیت واحد در طبقات" icon={Building2} description="طبقات اول و آخر چالش‌های دمایی بیشتری دارند.">
            <FormField label="واحد شما در کدام طبقه است؟" required helper={<>طبقات <span className="font-bold text-gray-700">اول (روی پیلوت)</span> و <span className="font-bold text-gray-700">آخر (زیر پشت‌بام)</span> معمولاً <span className="font-bold text-orange-600">سردتر</span> هستند.</>}>
              <div className="grid grid-cols-1 gap-2">
                {['اول (روی پیلوت)', 'طبقات میانی', 'آخر (زیر پشت‌بام)'].map((opt: any) => (
                  <button key={opt} onClick={() => updateData('unitPosition', opt, { autoNext: true })} className={`p-4 rounded-xl border text-sm font-bold text-right flex justify-between items-center ${data.unitPosition === opt ? 'border-primary-orange bg-primary-light text-primary-orange' : 'border-gray-100 bg-bg-gray text-gray-500'}`}>
                    {opt}
                    {data.unitPosition === opt && <CheckCircle2 size={16} />}
                  </button>
                ))}
              </div>
            </FormField>
          </SectionCard>
        );
      case 6:
        return (
          <SectionCard stepNumber={6} title="نورگیری و آفتاب" icon={Sun} description="نور خورشید منبع گرمای رایگان در زمستان است.">
            <FormField label="کدام سمت منزل شما آفتاب‌گیر است؟" helper="می‌توانید چند گزینه را همزمان انتخاب کنید.">
              <div className="grid grid-cols-2 gap-2">
                {['شمال (سرد)', 'جنوب (آفتاب‌گیر)', 'شرق', 'غرب'].map((opt: any) => (
                  <button key={opt} onClick={() => toggleArrayItem('sunLightPosition', opt)} className={`p-3 rounded-lg border text-xs font-bold transition-all ${data.sunLightPosition.includes(opt) ? 'border-primary-orange bg-primary-light text-primary-orange' : 'border-gray-100 bg-bg-gray text-gray-500'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </FormField>
          </SectionCard>
        );
      case 7:
        return (
          <SectionCard stepNumber={7} title="وضعیت عایق سقف" icon={ShieldCheck} description="جلوگیری از فرار گرما از سقف (مخصوص طبقات آخر).">
            <OptionSelector 
              label="آیا سقف منزل عایق حرارتی دارد؟" 
              required 
              helper={<>عایقی مثل <span className="font-bold text-gray-700">پشم شیشه</span> یا <span className="font-bold text-gray-700">یونولیت</span> در پشت‌بام یا سقف کاذب.</>}
              options={['بله، عایق دارد', 'خیر، ندارد', 'اطلاعی ندارم']}
              value={data.ceilingInsulation === 'دارد' ? 'بله، عایق دارد' : data.ceilingInsulation === 'ندارد' ? 'خیر، ندارد' : data.ceilingInsulation === 'نمی‌دانم' ? 'اطلاعی ندارم' : ''}
              onChange={v => {
                const map: any = { 'بله، عایق دارد': 'دارد', 'خیر، ندارد': 'ندارد', 'اطلاعی ندارم': 'نمی‌دانم' };
                updateData('ceilingInsulation', map[v] || '', { autoNext: true });
              }}
            />
          </SectionCard>
        );
      case 8:
        return (
          <SectionCard stepNumber={8} title="پوشش کف منزل" icon={Layout} description="جنس کف تاثیر زیادی در احساس سرما از پا دارد.">
            <OptionSelector 
              label="پوشش غالب کف منزل" 
              required 
              helper={<>کدام یک بخش بیشتری از خانه را پوشانده است؟ <span className="font-bold text-gray-700">پارکت یا موکت</span> به گرم‌تر ماندن خانه کمک می‌کنند.</>}
              options={['سرامیک یا سنگ (سرد)', 'پارکت یا لمینت', 'موکت کامل', 'فرش زیاد']}
              value={data.floorType}
              onChange={v => updateData('floorType', v, { autoNext: true })}
            />
          </SectionCard>
        );
      case 9:
        return (
          <SectionCard stepNumber={9} title="تعداد و نوع پنجره" icon={Square} description="پنجره‌ها مهم‌ترین نقطه تبادل حرارت با بیرون هستند.">
            <FormField label="تعداد کل پنجره‌ها" required helper={<>تعداد تقریبی <span className="font-bold text-gray-700">پنجره‌های رو به فضای آزاد</span>.</>}>
              <input type="text" inputMode="numeric" value={toPersianDigits(data.windowsCount)} onChange={e => updateData('windowsCount', toEnglishDigits(e.target.value))} className="input-numeric" placeholder="تعداد را وارد کنید" />
            </FormField>
            <OptionSelector 
              label="نوع پنجره" 
              required 
              helper={<><span className="font-bold text-gray-700">پنجره‌های دوجداره PVC</span> بهترین عملکرد عایق را دارند.</>}
              options={['آلومینیوم قدیمی (تک‌جداره)', 'آهن قدیمی', 'دوجداره (PVC/UPVC)', 'دوجداره آلومینیومی']}
              value={data.windowType}
              onChange={v => updateData('windowType', v, { autoNext: true })}
            />
          </SectionCard>
        );
      case 10:
        return (
          <SectionCard stepNumber={10} title="درزگیری پنجره‌ها" icon={Maximize} description="حتی پنجره دوجداره اگر خوب نصب نشود، باد سرد را عبور می‌دهد.">
            <FormField label="وضعیت درزگیر پنجره‌ها" required helper={<>آیا <span className="font-bold text-gray-700">نوار درزگیر</span> دور پنجره‌ها سالم است؟</>}>
              <div className="grid grid-cols-1 gap-2">
                {['کاملاً کیپ است', 'کمی باد می‌آید', 'درزهای بزرگ دارد'].map(opt => (
                   <button key={opt} onClick={() => updateData('windowSealHealth', opt, { autoNext: true })} className={`p-4 rounded-xl border text-sm font-bold text-right flex justify-between items-center ${data.windowSealHealth === opt ? 'border-primary-orange bg-primary-light text-primary-orange' : 'border-gray-100 bg-bg-gray text-gray-500'}`}>
                    {opt}
                    {data.windowSealHealth === opt && <CheckCircle2 size={16} />}
                  </button>
                ))}
              </div>
            </FormField>
          </SectionCard>
        );
      case 11:
        return (
          <SectionCard stepNumber={11} title="سلامت شیشه و پرده" icon={ShieldCheck} description="جزئیاتی که در ظاهر ساده‌اند اما تاثیر بزرگی دارند.">
            <div className="space-y-4">
              <YesNoSelector 
                label="استفاده از پرده‌های ضخیم" 
                helper={<><span className="font-bold text-gray-700">پرده ضخیم</span> مثل یک لایه عایق جلوی هدررفت گرما از شیشه را می‌گیرد.</>}
                value={data.thickCurtains} 
                onChange={v => updateData('thickCurtains', v, { autoNext: true })} 
              />
              <YesNoSelector 
                label="شکستگی یا ترک شیشه‌ها" 
                helper={<>حتی یک ترک کوچک مثل یک <span className="font-bold text-orange-600">مجرای خروج دائمی گرما</span> عمل می‌کند.</>}
                value={data.crackedGlass} 
                onChange={v => updateData('crackedGlass', v, { autoNext: true })} 
              />
            </div>
          </SectionCard>
        );
      case 12:
        return (
          <SectionCard stepNumber={12} title="نوع درب ورودی" icon={DoorOpen} description="درب اصلی ساختمان محل ورود بخش زیادی از هوای سرد است.">
            <FormField label="جنس و نوع درب" required helper={<>درب‌های <span className="font-bold text-gray-700">ضدسرقت</span> به دلیل وجود عایق داخلی، تاثیر زیادی در حفظ گرما دارند.</>}>
              <div className="grid grid-cols-1 gap-2">
                {['ضدسرقت (عایق‌دار)', 'معمولی آهنی', 'معمولی چوبی'].map(opt => (
                  <button key={opt} onClick={() => updateData('entryDoorType', opt, { autoNext: true })} className={`p-4 rounded-xl border text-sm font-bold text-right flex justify-between items-center ${data.entryDoorType === opt ? 'border-primary-orange bg-primary-light text-primary-orange' : 'border-gray-100 bg-bg-gray text-gray-500'}`}>
                    {opt}
                    {data.entryDoorType === opt && <CheckCircle2 size={16} />}
                  </button>
                ))}
              </div>
            </FormField>
          </SectionCard>
        );
      case 13:
        return (
          <SectionCard stepNumber={13} title="درزگیری درب‌ها" icon={Maximize} description="بستن راه‌های نفوذ هوا از اطراف درب‌ها.">
            <div className="space-y-4">
              <YesNoSelector 
                label="نوار درزگیر دور درب ورودی" 
                helper="برای جلوگیری از ورود صدای محیط و باد سرد."
                value={data.doorSealingStrip} 
                onChange={v => updateData('doorSealingStrip', v, { autoNext: true })} 
              />
              <YesNoSelector 
                label="درب بالکن دوجداره است؟" 
                helper="درب بالکن اگر فلزی ساده باشد، منبع بزرگ سرماست."
                value={data.standardBalconyDoor} 
                onChange={v => updateData('standardBalconyDoor', v, { autoNext: true })} 
              />
            </div>
            <OptionSelector 
              label="احساس وزش باد از لای درب‌ها" 
              className="mt-4"
              options={['اصلاً', 'خیلی کم', 'کاملاً ملموس است']}
              value={data.windPenetrationDoors}
              onChange={v => updateData('windPenetrationDoors', v, { autoNext: true })}
            />
          </SectionCard>
        );
      case 14:
        return (
          <SectionCard stepNumber={14} title="سیستم گرمایش" icon={Flame} description="قلب تپنده گرمای خانه شما.">
            <FormField label="نوع سیستم گرمایشی اصلی" required helper={<>انتخاب <span className="font-bold text-gray-700">درست</span> سیستم به تحلیل دقیق‌تر کمک می‌کند.</>}>
              <div className="grid grid-cols-1 gap-2">
                {['پکیج دیواری', 'موتورخانه مرکزی', 'بخاری (بدون سیستم مرکزی)'].map(opt => (
                  <button key={opt} onClick={() => updateData('heatingSystemType', opt, { autoNext: true })} className={`p-4 rounded-xl border text-sm font-bold text-right flex justify-between items-center ${data.heatingSystemType === opt ? 'border-primary-orange bg-primary-light text-primary-orange' : 'border-gray-100 bg-bg-gray text-gray-500'}`}>
                    {opt}
                    {data.heatingSystemType === opt && <CheckCircle2 size={16} />}
                  </button>
                ))}
              </div>
            </FormField>
            <OptionSelector 
              label="عمر دستگاه (پکیج یا موتورخانه)" 
              required 
              className="mt-4" 
              helper={<>دستگاه‌های با <span className="font-bold text-orange-600">عمر بالا</span> معمولاً نیاز به اورهال دارند.</>}
              options={['کمتر از ۳ سال', '۳ تا ۷ سال', 'بیشتر از ۷ سال']}
              value={data.deviceAge}
              onChange={v => updateData('deviceAge', v, { autoNext: true })}
            />
          </SectionCard>
        );
      case 15:
        return (
          <SectionCard stepNumber={15} title="عایق‌بندی لوله‌ها" icon={Thermometer} description="حفظ دمای آب گرم در طول مسیر لوله‌کشی.">
            <OptionSelector 
              label="عایق بودن لوله‌های پکیج" 
              required 
              helper={<><span className="font-bold text-gray-700">فوم‌های سیاه رنگی</span> که دور لوله‌های زیر پکیج پیچیده می‌شوند.</>}
              options={['بله، عایق دارد', 'خیر، لوله‌ها باز است']}
              value={data.packagePipeInsulation}
              onChange={v => updateData('packagePipeInsulation', v, { autoNext: true })}
            />
            <OptionSelector 
              label="مسیر عبور لوله‌ها" 
              required 
              helper={<>لوله‌هایی که از <span className="font-bold text-red-600">فضای باز</span> رد می‌شوند زود سرد می‌شوند.</>}
              options={['از داخل دیوار (توکار)', 'از روی دیوار یا فضای باز']}
              value={data.pipePath}
              onChange={v => updateData('pipePath', v, { autoNext: true })}
            />
          </SectionCard>
        );
      case 16:
        return (
          <SectionCard stepNumber={16} title="وضعیت رادیاتورها" icon={Layout} description="بررسی سلامت سیستم پخش گرما در خانه.">
            <div className="space-y-4">
              <YesNoSelector 
                label="نشتی در شیر یا بدنه رادیاتور" 
                helper="نشتی کوچک باعث افت فشار پکیج و کارکرد بیشتر آن می‌شود."
                value={data.radiatorLeak} 
                onChange={v => updateData('radiatorLeak', v, { autoNext: true })} 
              />
              <YesNoSelector 
                label="وجود اتاق سرد و بدون رادیاتور" 
                helper="این اتاق‌ها مثل یک یخچال مرکزی بقیه خانه را سرد می‌کنند."
                value={data.roomWithoutRadiator} 
                onChange={v => updateData('roomWithoutRadiator', v, { autoNext: true })} 
              />
            </div>
            <OptionSelector 
              label="فاصله رادیاتورها از منبع گرمایش" 
              className="mt-4"
              options={['نزدیک (کمتر از ۵ متر)', 'متوسط', 'خیلی دور']}
              value={data.hotWaterPathLength}
              onChange={v => updateData('hotWaterPathLength', v, { autoNext: true })}
            />
          </SectionCard>
        );
      case 17:
        return (
          <SectionCard stepNumber={17} title="سلامت فنی دستگاه" icon={ShieldCheck} description="بررسی کیفیت احتراق و کارکرد سیستم.">
            <FormField label="رنگ شعله (هنگام کار کردن پکیج/بخاری)" helper={<>شعله <span className="font-bold text-blue-600">باید آبی باشد</span>. زرد بودن نشانه <span className="font-bold text-red-600 underline">خطر و اتلاف گاز</span> است.</>}>
              <div className="grid grid-cols-2 gap-2">
                {['آبی (سالم)', 'زرد یا نارنجی (نیاز به تعمیر)'].map(opt => (
                  <button key={opt} onClick={() => updateData('flameQuality', opt, { autoNext: true })} className={`p-4 rounded-xl border text-xs font-bold ${data.flameQuality === opt ? 'border-primary-orange bg-orange-50 text-primary-orange' : 'border-gray-100 bg-bg-gray text-gray-500'}`}>{opt}</button>
                ))}
              </div>
            </FormField>
            <div className="mt-4">
              <YesNoSelector 
                label="سرویس سالانه انجام شده است؟" 
                helper="سرویس دوره‌ای مصرف گاز را تا ۱۵٪ ناهش می‌دهد."
                value={data.annualServiceDone} 
                onChange={v => updateData('annualServiceDone', v, { autoNext: true })} 
              />
            </div>
          </SectionCard>
        );
      case 18:
        return (
          <SectionCard stepNumber={18} title="آب گرم مصرفی" icon={Droplets} description="بررسی نحوه تامین آب گرم برای شستشو و استحمام.">
            <FormField label="منبع تامین آب گرم" required>
              <div className="grid grid-cols-2 gap-2">
                {['پکیج', 'آبگرمکن دیواری', 'آبگرمکن ایستاده', 'موتورخانه'].map(opt => (
                  <button key={opt} onClick={() => updateData('hotWaterSource', opt, { autoNext: true })} className={`p-4 rounded-xl border text-xs font-bold ${data.hotWaterSource === opt ? 'border-primary-orange bg-primary-light text-primary-orange' : 'border-gray-100 bg-bg-gray text-gray-500'}`}>{opt}</button>
                ))}
              </div>
            </FormField>
            <OptionSelector 
              label="تنظیم دمای آب گرم" 
              className="mt-4"
              options={['پایین (ولرم)', 'متوسط', 'بالا (خیلی داغ)']}
              value={data.tempSetting}
              onChange={v => updateData('tempSetting', v, { autoNext: true })}
            />
          </SectionCard>
        );
      case 19:
        return (
          <SectionCard stepNumber={19} title="اتلاف در آب گرم" icon={Droplets} description="چقدر طول می‌کشد تا آب گرم به شیر برسد؟">
            <OptionSelector 
              label="زمان انتظار برای آب گرم" 
              helper={<>هر چه طولانی‌تر باشد، یعنی <span className="font-bold text-red-600">لوله‌ها عایق نیستند</span> و آب هدر می‌رود.</>}
              options={['سریع (زیر ۱۰ ثانیه)', 'متوسط', 'طولانی (بالای ۳۰ ثانیه)']}
              value={data.hotWaterArrivalTime}
              onChange={v => updateData('hotWaterArrivalTime', v, { autoNext: true })}
            />
            <div className="space-y-4 mt-4">
              <YesNoSelector 
                label="لوله‌های آب گرم عایق هستند؟" 
                helper={<><span className="font-bold text-gray-700">عایق بودن لوله‌ها</span> از سرد شدن سریع آب جلوگیری می‌کند.</>}
                value={data.hotWaterPipeInsulation} 
                onChange={v => updateData('hotWaterPipeInsulation', v, { autoNext: true })} 
              />
              <YesNoSelector 
                label="نشتی در اتصالات و شیرآلات" 
                helper={<><span className="font-bold text-red-600">چکه کردن آب گرم</span> یعنی هدررفت مستقیم گاز و آب.</>}
                value={data.jointLeak} 
                onChange={v => updateData('jointLeak', v, { autoNext: true })} 
              />
            </div>
          </SectionCard>
        );
      case 20:
        return (
          <SectionCard stepNumber={20} title="بخاری گازی" icon={Flame} description="بررسی ایمنی و کارایی بخاری‌های مستقل.">
            <YesNoSelector 
              label="آیا در منزل بخاری گازی دارید؟"
              value={data.gasHeaterExists}
              onChange={v => updateData('gasHeaterExists', v, { autoNext: true })}
            />
            
            {data.gasHeaterExists && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 mt-6 border-t border-border-soft pt-6">
                <OptionSelector 
                  label="نوع بخاری گازی"
                  options={['دودکش‌دار معمولی', 'شومینه گازی (پر مصرف)', 'بدون دودکش']}
                  value={data.gasHeaterType}
                  onChange={v => updateData('gasHeaterType', v, { autoNext: true })}
                />
                <OptionSelector 
                  label="وضعیت دودکش بخاری"
                  options={['استاندارد (H شکل)', 'نامطمئن']}
                  value={data.gasHeaterChimney}
                  onChange={v => updateData('gasHeaterChimney', v, { autoNext: true })}
                />
              </motion.div>
            )}
          </SectionCard>
        );
      case 21:
        return (
          <SectionCard stepNumber={21} title="درزگیری و باد سرد" icon={Wind} description="نقاط خروج گرما و ورود سرمای ناخواسته.">
             <OptionSelector 
               label="ورود باد از زیر درب ورودی"
               required
               options={['بسته است', 'کمی درز دارد', 'فاصله زیادی دارد']}
               value={data.airIngressDoor}
               onChange={v => updateData('airIngressDoor', v, { autoNext: true })}
             />
            <div className="space-y-4 mt-4">
              <YesNoSelector 
                label="دریچه کولر در زمستان باز است؟" 
                helper={<><span className="font-bold text-gray-700">دریچه‌های کولر</span> باید با فوم یا درپوش مخصوص <span className="font-bold text-orange-600">مسدود شوند</span>.</>}
                value={data.unstandardVentilationOpen} 
                onChange={v => updateData('unstandardVentilationOpen', v, { autoNext: true })} 
              />
              <YesNoSelector 
                label="درب اتاق‌ها درز زیرین دارد؟" 
                helper={<>این درزها باعث <span className="font-bold text-gray-700">خروج هوای گرم</span> به راهروهای سرد می‌شوند.</>}
                value={data.underDoorGap} 
                onChange={v => updateData('underDoorGap', v, { autoNext: true })} 
              />
            </div>
          </SectionCard>
        );
      case 22:
        return (
          <SectionCard stepNumber={22} title="شرایط محیطی" icon={MapPin} description="تاثیر اقلیم و باد بر دمای خانه شما.">
            <OptionSelector 
              label="وضعیت باد در منطقه شما"
              options={['معمولی', 'بادخیز', 'بسیار شدید']}
              value={data.windIntensity}
              onChange={v => updateData('windIntensity', v, { autoNext: true })}
            />
            <div className="mt-4">
              <YesNoSelector 
                label="آیا دیوارهای ساختمان ترک دارند؟" 
                helper={<><span className="font-bold text-gray-700">ترک‌های عمیق</span> باعث نفوذ سرما به لایه‌های میانی دیوار می‌شوند.</>}
                value={data.externalWallCrack} 
                onChange={v => updateData('externalWallCrack', v, { autoNext: true })} 
              />
            </div>
          </SectionCard>
        );
      case 23:
        return (
          <SectionCard stepNumber={23} title="یادداشت نهایی" icon={FileText} description="هر نکته دیگری که فکر می‌کنید مهم است.">
            <FormField label="توضیحات تکمیلی (اختیاری)">
              <textarea 
                value={data.additionalComments}
                onChange={e => updateData('additionalComments', e.target.value)}
                rows={4}
                className="input-minimal min-h-[120px] resize-none py-4"
                placeholder="مثلاً: طبقه اول بسیار سرد است یا پکیج مدام خاموش می‌شود..."
              />
            </FormField>
            <div className="bg-primary-light p-4 rounded-xl flex gap-3 text-primary-orange items-start text-xs border border-primary-orange/10 mt-4 leading-loose">
               <AlertCircle className="shrink-0 animate-pulse" size={16} />
               <p>اطلاعات شما محرمانه تلقی شده و صرفاً جهت تحلیل آماری پویش استفاده خواهد شد. با کلیک بر روی دکمه ثبت نهایی، فرایند تکمیل فرم به پایان می‌رسد.</p>
            </div>
          </SectionCard>
        );
      case 24:
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6 border-4 border-green-100">
              <CheckCircle2 size={48} className="text-green-500" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-3">اطلاعات با موفقیت ثبت شد</h2>
            <p className="text-gray-500 leading-relaxed max-w-sm mb-8">
              سپاس از شما! شماره تماس شما ({toPersianDigits(data.phoneNumber)}) به عنوان شناسه پرونده ثبت گردید. همکاران ما در صورت نیاز برای مراحل بعدی با شما تماس خواهند گرفت.
            </p>
            <MainButton onClick={() => window.location.reload()} className="px-8">
              بازگشت به ابتدای فرم
            </MainButton>
          </motion.div>
        );
      default:
        return null;
    }
  };

  if (step === 24) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="w-full max-w-xl">
          {renderStep()}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-gray flex flex-col">
      {/* Header & Minimal Progress */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-border-soft">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary-orange rounded-xl flex items-center justify-center shadow-lg shadow-orange-100">
              <Flame className="text-white" size={18} strokeWidth={3} />
            </div>
            <span className="font-black text-gray-900 text-sm">پویش گرمای پایدار</span>
          </div>
          <div className="text-[10px] font-black text-primary-orange bg-primary-light px-3 py-1.5 rounded-full border border-primary-orange/5 uppercase tracking-wider">
            مرحله {toPersianDigits(step + 1)} از {toPersianDigits(totalSteps)}
          </div>
        </div>
        <div className="w-full h-[2px] bg-border-soft">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(Math.min(step, totalSteps - 1) / (totalSteps - 1)) * 100}%` }}
            className="h-full bg-primary-orange"
          />
        </div>
      </header>

      {/* Main Content Area - Minimal Centered */}
      <main className="flex-1 flex flex-col items-center py-8 pb-32 px-4">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait">
            <div key={step}>
              {renderStep()}
            </div>
          </AnimatePresence>
        </div>
      </main>

      {/* Fixed Minimal Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-border-soft flex justify-center z-50">
        <div className="w-full max-w-xl flex gap-4">
          <MainButton 
            variant="secondary"
            onClick={prevStep}
            disabled={step === 0}
            className="flex-1"
          >
            <ChevronRight size={18} />
            قبلی
          </MainButton>
          
          <MainButton 
            onClick={step === 23 ? handleSubmit : nextStep}
            disabled={!isStepValid() || isSubmitting}
            className="flex-[2]"
          >
            {isSubmitting ? 'در حال ثبت...' : (step === 23 ? 'ثبت نهایی' : 'بعدی')}
            {step === 23 ? (isSubmitting ? null : <Send size={18} />) : <ChevronLeft size={18} />}
          </MainButton>
        </div>
      </div>
    </div>
  );
}
