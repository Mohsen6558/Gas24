
export enum UserLevel {
  Bronze = 'برنزی',
  Silver = 'نقره‌ای',
  Gold = 'طلایی',
  Diamond = 'الماسی'
}

export interface Subscription {
  number: string;
  name: string;
}

export interface Reward {
  id: string;
  title: string;
  image: string;
  requiredGazyom: number;
  category: 'cash' | 'voucher' | 'digital' | 'lottery';
  
  categoryLabel?: string;
  description: string;
  terms: string;
  
  rewardId?: number;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  type: 'earn' | 'spend';
}


export interface MyRewardClaimedItem {
  id: string;
  title: string;
  image: string;
  date: string;
  
  codeCopy: string;
  
  codeLabel: string;
  status: 'active' | 'used';
}

export interface Winner {
  id: string;
  firstName: string;
  lastName: string;
  city: string;
  prize: string;
}

export interface ConsumptionData {
  month: string;
  currentYear: number;
  lastYear: number;
}



export interface LeaderboardEntry {
  rank: number;
  mobNo: string;
  isMe: boolean;
  token: number;
}


export interface LeaderboardSummary {
  myRank: number;
  myToken: number;
  totalUsers: number;
  totalTokensAll: number;
  scope: 'city' | 'province';
  cityName: string;
}

export interface EducationMessage {
  id: number;
  title: string;
  text: string;
  category: string;
  icon: string;
  imageUrl: string;
  videoUrl: string;
  type: 0 | 1;
  typeLabel: string;
  tokenReward: number;
  
  durationSec: number;
  isPersonal: boolean;
  dateJalali: string | null;
}
