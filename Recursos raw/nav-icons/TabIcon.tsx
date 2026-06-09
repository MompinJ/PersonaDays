// TabIcon.tsx — icono de una pestaña.
// Inactivo = glifo sólido (Monolito). Activo = glifo con corte Shard.
// Color = identidad del personaje: pásalo desde el tema
// (primary si está activo, textDim si no). El SVG usa currentColor.
import React from 'react';
import { TABS, type TabKey } from './tabs';

export interface TabIconProps {
  tab: TabKey;
  active?: boolean;
  size?: number;
  color?: string;
}

export function TabIcon({ tab, active = false, size = 26, color = 'currentColor' }: TabIconProps) {
  const { Idle, Active } = TABS[tab];
  const Glyph = active ? Active : Idle;
  return <Glyph width={size} height={size} color={color} />;
}

export default TabIcon;
