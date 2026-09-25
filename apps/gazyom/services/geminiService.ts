
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


export const toPersianDigits = (n: number | string | undefined | null): string => {
  if (n === undefined || n === null) return "";
  return n.toString().replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)]);
};


export const getEnergyTips = async (reductionPercentage: number) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `یک جمله انگیزشی بسیار کوتاه، صمیمی و قهرمانانه برای تشویق کاربر به کاهش مصرف گاز بگو. کاربر تا الان ${reductionPercentage}٪ صرفه‌جویی کرده است. جمله باید حس غرور ملی و مسئولیت‌پذیری به کاربر بدهد. فقط و فقط یک جمله کوتاه فارسی بدون هیچ توضیح اضافی.`,
      config: {
        maxOutputTokens: 50,
      },
    });
    return response.text?.trim() || "تو قهرمان گرمای خانه‌های ایرانی هستی، با همین اراده ادامه بده!";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "هر درجه کاهش دمای خانه، یک لبخند بر لبان آیندگان است.";
  }
};


export const getWeatherAdvice = async (lat?: number, lon?: number) => {
  try {
    const date = new Date().toLocaleDateString('fa-IR');
    const locationPrompt = lat && lon ? `مختصات جغرافیایی: ${lat}, ${lon}` : "موقعیت فعلی ایران";
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `امروز ${date} است. با توجه به ${locationPrompt}، وضعیت تقریبی آب و هوا را حدس بزن و یک توصیه هوشمندانه برای مدیریت مصرف گاز بگو. 
      فرمت پاسخ فقط به این صورت باشد (بدون متن اضافی):
      {"temp": "عدد دما به سانتی‌گراد", "status": "وضعیت جوی کوتاه", "advice": "توصیه مصرف گاز در یک جمله کوتاه"}`,
      config: {
        responseMimeType: "application/json"
      }
    });

    const data = JSON.parse(response.text || "{}");
    return {
      temp: data.temp || "۲۰",
      status: data.status || "صاف",
      advice: data.advice || "در ساعات آفتابی پرده‌ها را باز بگذارید."
    };
  } catch (error) {
    console.error("Weather Advice Error:", error);
    return {
      temp: "۱۵",
      status: "نیمه ابری",
      advice: "با پوشیدن لباس گرم، یک درجه دمای بخاری را کم کنید."
    };
  }
};
