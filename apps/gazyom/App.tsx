
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Splash from './pages/Splash';
import Dashboard from './pages/Dashboard';
import Rewards from './pages/Rewards';
import LuckyWheel from './pages/LuckyWheel';
import Education from './pages/Education';
import EducationDetail from './pages/EducationDetail';
import Profile from './pages/Profile';
import RewardDetail from './pages/RewardDetail';
import Wallet from './pages/Wallet';
import MyRewards from './pages/MyRewards';
import KnowledgeBase from './pages/KnowledgeBase';
import SubscriptionEntry from './pages/SubscriptionEntry';
import AddSubscriptionFlow from './components/AddSubscriptionFlow';
import InstallAppPrompt from './components/InstallAppPrompt';
import ProvinceEntry from './pages/ProvinceEntry';
import Analysis from './pages/Analysis';
import TargetAdvice from './pages/TargetAdvice';
import Leaderboard from './pages/Leaderboard';
import SelfDeclaration from './pages/SelfDeclaration';
import { EducationMessage, Reward, Subscription, UserLevel } from './types';
import { ChevronRight, X, CheckCircle2 } from 'lucide-react';
import { toPersianDigits } from './services/geminiService';
import { fetchKeynoList, readGazyomAuthToken } from './services/wsOptimizeApi';

const VALID_TABS = new Set(['home', 'rewards', 'analysis', 'edu', 'profile']);
const VALID_VIEWS = new Set([
  'none',
  'reward',
  'edu-detail',
  'wallet',
  'my-rewards',
  'kb',
  'wheel',
  'target-advice',
  'leaderboard',
  'self-declare',
]);
type AppTab = 'home' | 'rewards' | 'analysis' | 'edu' | 'profile';
type AppView =
  | 'none'
  | 'reward'
  | 'edu-detail'
  | 'wallet'
  | 'my-rewards'
  | 'kb'
  | 'wheel'
  | 'target-advice'
  | 'leaderboard'
  | 'self-declare';

function parseRouteFromUrl(): { tab: AppTab; view: AppView } {
  if (typeof window === 'undefined') return { tab: 'home', view: 'none' };
  const params = new URLSearchParams(window.location.search);
  const tabRaw = params.get('tab');
  const viewRaw = params.get('view');
  const tab = (tabRaw && VALID_TABS.has(tabRaw) ? tabRaw : 'home') as AppTab;
  const view = (viewRaw && VALID_VIEWS.has(viewRaw) ? viewRaw : 'none') as AppView;
  return { tab, view };
}

function parseEntryParamsFromUrl(): { stateParam: string; refCodeParam: string } {
  if (typeof window === 'undefined') return { stateParam: '', refCodeParam: '' };
  const params = new URLSearchParams(window.location.search);
  return {
    stateParam: params.get('state')?.trim() ?? '',
    refCodeParam: params.get('ref_code')?.trim() ?? '',
  };
}

function buildAppUrl(tab: AppTab, view: AppView): string {
  const params = new URLSearchParams();
  if (tab !== 'home') params.set('tab', tab);
  if (view !== 'none') params.set('view', view);
  const q = params.toString();
  return `/app/${q ? `?${q}` : ''}`;
}

function parseSubscriptionsFromStorage(): Subscription[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('gazyom_subscriptions');
    if (!saved) return [];
    const parsed = JSON.parse(saved) as unknown;
    return Array.isArray(parsed) ? (parsed as Subscription[]) : [];
  } catch {
    return [];
  }
}

function parseActiveSubIndexFromStorage(subsLength: number): number {
  if (typeof window === 'undefined' || subsLength === 0) return 0;
  try {
    const active = localStorage.getItem('gazyom_active_sub_index');
    if (active == null || active === '') return 0;
    const n = parseInt(active, 10);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(n, subsLength - 1);
  } catch {
    return 0;
  }
}

function parseActiveTabFromStorage(): string {
  if (typeof window === 'undefined') return 'home';
  try {
    const t = localStorage.getItem('gazyom_active_tab');
    if (t && VALID_TABS.has(t)) return t;
  } catch {
    // ignore storage errors
  }
  return 'home';
}

const App: React.FC = () => {
  const entryParams = React.useMemo(() => parseEntryParamsFromUrl(), []);
  const hasEntryParams = Boolean(entryParams.stateParam || entryParams.refCodeParam);
  
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === 'undefined') return true;
    if (hasEntryParams) return false;
    const base = localStorage.getItem('gazyom_base_url');
    const mob = localStorage.getItem('gazyom_mobile');
    return !(base?.trim() && mob?.trim());
  });
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => parseSubscriptionsFromStorage());
  const [activeSubIndex, setActiveSubIndex] = useState(() =>
    parseActiveSubIndexFromStorage(parseSubscriptionsFromStorage().length)
  );
  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    const fromUrl = parseRouteFromUrl().tab;
    if (fromUrl) return fromUrl;
    return parseActiveTabFromStorage() as AppTab;
  });
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [selectedEduItem, setSelectedEduItem] = useState<EducationMessage | null>(null);
  const [showWallet, setShowWallet] = useState(false);
  const [showMyRewards, setShowMyRewards] = useState(false);
  const [showKB, setShowKB] = useState(false);
  const [showWheel, setShowWheel] = useState(false);
  const [showTargetAdvice, setShowTargetAdvice] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showSelfDeclaration, setShowSelfDeclaration] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [selectedBaseUrl, setSelectedBaseUrl] = useState(
    () =>
      typeof window === 'undefined'
        ? ''
        : hasEntryParams
        ? ''
        : localStorage.getItem('gazyom_base_url') ?? ''
  );
  const [mobileNumber, setMobileNumber] = useState(
    () =>
      typeof window === 'undefined'
        ? ''
        : hasEntryParams
        ? ''
        : localStorage.getItem('gazyom_mobile') ?? ''
  );
  const [syncingKeynos, setSyncingKeynos] = useState(false);

  const [showAddSubModal, setShowAddSubModal] = useState(false);
  const [addSubSearchResults, setAddSubSearchResults] = useState(0);
  
  const [totalTokenFromProfile, setTotalTokenFromProfile] = useState(0);

  useEffect(() => {
    setTotalTokenFromProfile(0);
  }, [activeSubIndex, subscriptions[activeSubIndex]?.number]);

  useEffect(() => {
    if (!showAddSubModal) setAddSubSearchResults(0);
  }, [showAddSubModal]);

  useEffect(() => {
    try {
      if (VALID_TABS.has(activeTab)) {
        localStorage.setItem('gazyom_active_tab', activeTab);
      }
    } catch {
      // ignore
    }
  }, [activeTab]);

  const applyViewState = (view: AppView) => {
    setShowWallet(view === 'wallet');
    setShowMyRewards(view === 'my-rewards');
    setShowKB(view === 'kb');
    setShowWheel(view === 'wheel');
    setShowTargetAdvice(view === 'target-advice');
    setShowLeaderboard(view === 'leaderboard');
    setShowSelfDeclaration(view === 'self-declare');
    if (view !== 'reward') setSelectedReward(null);
    if (view !== 'edu-detail') setSelectedEduItem(null);
  };

  const pushAppRoute = (tab: AppTab, view: AppView, replace = false) => {
    if (typeof window === 'undefined') return;
    const nextUrl = buildAppUrl(tab, view);
    const curUrl = `${window.location.pathname}${window.location.search}`;
    if (curUrl === nextUrl) return;
    if (replace) {
      window.history.replaceState({ appNav: true }, '', nextUrl);
    } else {
      window.history.pushState({ appNav: true }, '', nextUrl);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const route = parseRouteFromUrl();
    setActiveTab(route.tab);
    applyViewState(route.view);
    window.history.replaceState({ appNav: true }, '', buildAppUrl(route.tab, route.view));

    const onPopState = () => {
      const nextRoute = parseRouteFromUrl();
      setActiveTab(nextRoute.tab);
      applyViewState(nextRoute.view);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!selectedBaseUrl || !mobileNumber) return;
    if (subscriptions.length > 0) return;

    const token = readGazyomAuthToken();
    if (!token) return;

    const ac = new AbortController();
    setSyncingKeynos(true);

    fetchKeynoList(selectedBaseUrl, { signal: ac.signal })
      .then((result) => {
        if (!result.ok || result.rows.length === 0) return;
        const next: Subscription[] = result.rows.map((row) => ({
          number: String(row.KeyNo),
          name:
            (row.Alias && String(row.Alias).trim()) ||
            (row.Name && String(row.Name).trim()) ||
            `اشتراک ${toPersianDigits(String(row.KeyNo))}`,
        }));
        setSubscriptions(next);
        localStorage.setItem('gazyom_subscriptions', JSON.stringify(next));
        setActiveSubIndex(0);
        localStorage.setItem('gazyom_active_sub_index', '0');
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
      })
      .finally(() => {
        setSyncingKeynos(false);
      });

    return () => ac.abort();
  }, [selectedBaseUrl, mobileNumber, subscriptions.length]);

  const handleAddSubscription = (sub: Subscription) => {
    const newList = [...subscriptions, sub];
    setSubscriptions(newList);
    localStorage.setItem('gazyom_subscriptions', JSON.stringify(newList));
    if (newList.length === 1) {
      setActiveSubIndex(0);
      localStorage.setItem('gazyom_active_sub_index', '0');
    }
    setShowAddSubModal(false);
  };

  const handleSwitchSubscription = (index: number) => {
    setActiveSubIndex(index);
    localStorage.setItem('gazyom_active_sub_index', index.toString());
  };

  const handleTabChange = (tab: string) => {
    const nextTab = (VALID_TABS.has(tab) ? tab : 'home') as AppTab;
    setActiveTab(nextTab);
    pushAppRoute(nextTab, 'none');
  };

  const openView = (view: AppView) => {
    applyViewState(view);
    pushAppRoute(activeTab, view);
  };

  const closeView = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
      return;
    }
    applyViewState('none');
    pushAppRoute(activeTab, 'none', true);
  };

  const openRewardDetail = (reward: Reward) => {
    setSelectedReward(reward);
    pushAppRoute(activeTab, 'reward');
  };

  const openEduDetail = (item: EducationMessage) => {
    setSelectedEduItem(item);
    pushAppRoute(activeTab, 'edu-detail');
  };

  const handleRemoveSubscription = (index: number) => {
    const newList = subscriptions.filter((_, i) => i !== index);
    setSubscriptions(newList);
    localStorage.setItem('gazyom_subscriptions', JSON.stringify(newList));
    if (activeSubIndex >= newList.length) {
      const newActive = Math.max(0, newList.length - 1);
      setActiveSubIndex(newActive);
      localStorage.setItem('gazyom_active_sub_index', newActive.toString());
    }
  };

  const handleSelfDeclareSuccess = () => {
    closeView();
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 5000);
  };

  if (showSplash) {
    return <Splash onFinish={() => setShowSplash(false)} />;
  }

  if (!selectedBaseUrl || !mobileNumber) {
    return (
      <ProvinceEntry
        initialStateParam={entryParams.stateParam}
        initialRefCode={entryParams.refCodeParam}
        onSuccess={(baseUrl, mobile) => {
          setSelectedBaseUrl(baseUrl);
          setMobileNumber(mobile);
          localStorage.setItem('gazyom_base_url', baseUrl);
          localStorage.setItem('gazyom_mobile', mobile);
        }}
      />
    );
  }

  
  if (subscriptions.length === 0) {
    if (syncingKeynos) {
      return (
        <div className="fixed inset-0 z-[90] flex min-h-0 flex-col items-center justify-center gap-3 overflow-y-auto overscroll-y-contain bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-center sm:p-8">
          <p className="text-sm font-bold text-slate-600">در حال دریافت اشتراک‌های ثبت‌شده…</p>
          <p className="text-[11px] font-bold text-slate-400">بر اساس توکن ورود شما</p>
        </div>
      );
    }
    return (
      <SubscriptionEntry
        baseUrl={selectedBaseUrl}
        onSuccess={(num, name) => handleAddSubscription({ number: num, name })}
      />
    );
  }

  const activeSub = subscriptions[activeSubIndex];

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <Dashboard 
            activeSub={activeSub}
            subscriptions={subscriptions}
            wsBaseUrl={selectedBaseUrl}
            onSwitchSub={handleSwitchSubscription}
            onRewardClick={openRewardDetail} 
            onLeaderboardClick={() => openView('leaderboard')}
            onAddSub={() => setShowAddSubModal(true)}
            onSeeAllRewards={() => handleTabChange('rewards')}
            onTotalTokenFromProfile={setTotalTokenFromProfile}
          />
        );
      case 'rewards':
        return (
          <Rewards 
            wsBaseUrl={selectedBaseUrl}
            keyNo={activeSub.number}
            onRewardClick={openRewardDetail} 
            onWheelClick={() => openView('wheel')} 
            onHistoryClick={() => openView('wallet')}
            onMyRewardsClick={() => openView('my-rewards')}
          />
        );
      case 'analysis':
        return (
          <Analysis
            wsBaseUrl={selectedBaseUrl}
            keyNo={activeSub.number}
            onTargetClick={() => openView('target-advice')}
            onRankClick={() => openView('leaderboard')}
            onSelfDeclareClick={() => openView('self-declare')}
          />
        );
      case 'edu':
        return (
          <Education wsBaseUrl={selectedBaseUrl} onItemClick={openEduDetail} />
        );
      case 'profile':
        return <Profile 
          subscriptions={subscriptions}
          activeSubIndex={activeSubIndex}
          onSwitchSub={handleSwitchSubscription}
          onAddSub={handleAddSubscription}
          wsBaseUrl={selectedBaseUrl}
          onRemoveSub={handleRemoveSubscription}
          onWalletClick={() => openView('wallet')} 
          onKBClick={() => openView('kb')} 
          onMyRewardsClick={() => openView('my-rewards')}
          onTotalTokenFromProfile={setTotalTokenFromProfile}
        />;
      default:
        return (
          <Dashboard 
            activeSub={activeSub}
            subscriptions={subscriptions}
            wsBaseUrl={selectedBaseUrl}
            onSwitchSub={handleSwitchSubscription}
            onRewardClick={openRewardDetail} 
            onLeaderboardClick={() => openView('leaderboard')}
            onAddSub={() => setShowAddSubModal(true)}
            onSeeAllRewards={() => handleTabChange('rewards')}
            onTotalTokenFromProfile={setTotalTokenFromProfile}
          />
        );
    }
  };

  return (
    <div dir="rtl" className="font-vazir">
      <Layout activeTab={activeTab} setActiveTab={handleTabChange}>
        {renderContent()}
      </Layout>

      <InstallAppPrompt />

      
      {selectedReward && (
        <RewardDetail 
          reward={selectedReward} 
          onBack={closeView} 
          wsBaseUrl={selectedBaseUrl}
          keyNo={activeSub.number}
          onRedeemSuccess={(spent) =>
            setTotalTokenFromProfile((t) => Math.max(0, t - spent))
          }
        />
      )}

      {selectedEduItem && (
        <EducationDetail
          item={selectedEduItem}
          wsBaseUrl={selectedBaseUrl}
          keyNo={activeSub.number}
          onBack={closeView}
          onItemSelect={openEduDetail}
          onClaimSuccess={(added) =>
            setTotalTokenFromProfile((t) => t + added)
          }
        />
      )}

      {showWallet && (
        <Wallet
          onBack={closeView}
          wsBaseUrl={selectedBaseUrl}
          keyNo={activeSub.number}
          profileTotalToken={totalTokenFromProfile}
          onTotalTokenFromProfile={setTotalTokenFromProfile}
        />
      )}

      {showMyRewards && (
        <MyRewards
          onBack={closeView}
          wsBaseUrl={selectedBaseUrl}
          keyNo={activeSub.number}
        />
      )}

      {showKB && (
        <KnowledgeBase onBack={closeView} wsBaseUrl={selectedBaseUrl} />
      )}

      {showTargetAdvice && (
        <TargetAdvice
          onBack={closeView}
          wsBaseUrl={selectedBaseUrl}
          keyNo={activeSub.number}
        />
      )}

      {showLeaderboard && (
        <Leaderboard
          onBack={closeView}
          wsBaseUrl={selectedBaseUrl}
          keyNo={activeSub.number}
        />
      )}

      {showSelfDeclaration && (
        <SelfDeclaration
          wsBaseUrl={selectedBaseUrl}
          keyNo={activeSub.number}
          onBack={closeView}
          onSuccess={handleSelfDeclareSuccess}
        />
      )}

      {showWheel && (
        <div className="fixed inset-0 z-[100] bg-slate-900 overflow-y-auto">
          <div className="sticky top-0 p-6 z-20">
            <button onClick={closeView} className="bg-white/10 text-white p-3 rounded-[7px] active:scale-90 transition-all">
              <ChevronRight size={24} />
            </button>
          </div>
          <LuckyWheel
            wsBaseUrl={selectedBaseUrl}
            keyNo={activeSub.number}
            onWin={(amount) => setTotalTokenFromProfile((t) => t + amount)}
          />
        </div>
      )}

      
      {showSuccessToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-[20px] shadow-2xl z-[120] animate-in slide-in-from-bottom-10 flex items-center gap-4 border border-white/10 min-w-[280px]">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black">ارسال موفقیت‌آمیز!</span>
            <span className="text-[9px] font-bold text-slate-400 mt-1">امتیاز شما پس از تایید اضافه می‌شود.</span>
          </div>
          <button onClick={() => setShowSuccessToast(false)} className="mr-auto text-slate-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      
      {showAddSubModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[24px] shadow-2xl animate-in zoom-in duration-300 relative flex min-h-0 flex-col overflow-hidden text-right max-h-[min(92vh,100dvh-1.5rem)]">
            <button
              type="button"
              onClick={() => setShowAddSubModal(false)}
              className="absolute top-6 left-6 text-slate-300 hover:text-slate-900 transition-colors z-20"
            >
              <X size={24} />
            </button>
            <div
              className={`shrink-0 px-8 text-right transition-[padding] duration-200 ${
                addSubSearchResults > 0 ? 'space-y-1 pt-11 pb-1' : 'space-y-2 pt-14 pb-2'
              }`}
            >
              <h3 className={`font-black text-slate-900 ${addSubSearchResults > 0 ? 'text-lg' : 'text-xl'}`}>
                افزودن اشتراک جدید
              </h3>
              {addSubSearchResults === 0 && (
                <p className="text-xs text-slate-400 font-bold">
                  می‌توانید با شماره اشتراک، شناسه قبض یا کد پستی جستجو کنید
                </p>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-hidden px-8 pb-6">
              <AddSubscriptionFlow
                baseUrl={selectedBaseUrl}
                variant="modal"
                defaultExpanded={false}
                onResultsChange={setAddSubSearchResults}
                onSuccess={(num, name) => handleAddSubscription({ number: num, name })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
