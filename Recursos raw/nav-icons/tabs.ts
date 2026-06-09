// tabs.ts — fuente única de verdad de las 6 pestañas de navegación.
// Cada tab tiene glifo Idle (inactivo, sólido) y Active (con el corte Shard).
import type React from 'react';
import type { SvgProps } from 'react-native-svg';

import HomeIdle from './icons/monolito/Home.svg';
import HomeActive from './icons/shard/Home.svg';
import PhoneIdle from './icons/monolito/Phone.svg';
import PhoneActive from './icons/shard/Phone.svg';
import StatsIdle from './icons/monolito/Stats.svg';
import StatsActive from './icons/shard/Stats.svg';
import MissionsIdle from './icons/monolito/Missions.svg';
import MissionsActive from './icons/shard/Missions.svg';
import EconomyIdle from './icons/monolito/Economy.svg';
import EconomyActive from './icons/shard/Economy.svg';
import ProfileIdle from './icons/monolito/Profile.svg';
import ProfileActive from './icons/shard/Profile.svg';

export type TabKey = 'home' | 'phone' | 'stats' | 'missions' | 'economy' | 'profile';

export interface TabMeta {
  key: TabKey;
  label: string;
  Idle: React.FC<SvgProps>;   // inactivo (Monolito)
  Active: React.FC<SvgProps>; // activo (Shard)
}

export const TABS: Record<TabKey, TabMeta> = {
  home:     { key: 'home',     label: 'Home',     Idle: HomeIdle,     Active: HomeActive },
  phone:    { key: 'phone',    label: 'Phone',    Idle: PhoneIdle,    Active: PhoneActive },
  stats:    { key: 'stats',    label: 'Stats',    Idle: StatsIdle,    Active: StatsActive },
  missions: { key: 'missions', label: 'Missions', Idle: MissionsIdle, Active: MissionsActive },
  economy:  { key: 'economy',  label: 'Economy',  Idle: EconomyIdle,  Active: EconomyActive },
  profile:  { key: 'profile',  label: 'Profile',  Idle: ProfileIdle,  Active: ProfileActive },
};

export const TAB_ORDER: TabKey[] = ['home', 'phone', 'stats', 'missions', 'economy', 'profile'];
