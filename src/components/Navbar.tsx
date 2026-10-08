import React from 'react';
import { ActiveTab } from '../types';
import { LayoutDashboard, BookOpen, Users, BarChart3 } from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  lang?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onSelectTab }) => {
  const tabs = [
    { id: 'home' as ActiveTab, label: 'Home', icon: LayoutDashboard },
    { id: 'class' as ActiveTab, label: 'Class', icon: BookOpen },
    { id: 'teams' as ActiveTab, label: 'Teams', icon: Users },
    { id: 'reports' as ActiveTab, label: 'Reports', icon: BarChart3 }
  ];

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-[#FFFFFF]/95 backdrop-blur-md border-t border-[#E4E0D7] shadow-[0_-2px_12px_rgba(0,0,0,0.03)] pb-safe no-print"
      aria-label="Main Navigation"
    >
      <div className="max-w-md mx-auto h-16 flex items-stretch justify-around px-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex flex-col items-center justify-center flex-1 min-w-[48px] min-h-[48px] py-1 transition-colors ${
                isActive
                  ? 'text-[#0F766E] font-semibold'
                  : 'text-[#5B6470] hover:text-[#1A1F26]'
              }`}
              type="button"
              aria-current={isActive ? 'page' : undefined}
            >
              {/* 3px Active Indicator Bar at Top */}
              {isActive && (
                <span className="absolute top-0 inset-x-3 h-[3px] bg-[#0F766E] rounded-b-full transition-all" />
              )}
              <Icon
                size={22}
                strokeWidth={isActive ? 2.25 : 1.75}
                className={isActive ? 'fill-[#0F766E]/15' : ''}
              />
              <span className="text-[12px] font-medium mt-0.5 leading-none tracking-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
