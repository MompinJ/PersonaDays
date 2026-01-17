export interface LevelInfo {
  level: number;
  currentLevelXP: number; // XP into current level
  xpToNextLevel: number; // XP required for next level
  progress: number; // 0..1
}

export const calculateLevelFromXP = (totalXP: number): LevelInfo => {
  // Guard clauses
  let xp = Math.max(0, Math.floor(totalXP || 0));
  let level = 1;
  let xpForNextLevel = 1000; // Base requirement for level 1->2
  const xpIncrement = 100; // Increment per level

  // Subtract levels until xp is less than next-level cost
  while (xp >= xpForNextLevel) {
    xp -= xpForNextLevel;
    level += 1;
    xpForNextLevel += xpIncrement;
    // Prevent pathological infinite loops
    if (level > 10000) break;
  }

  const currentLevelXP = xp;
  const xpToNextLevel = xpForNextLevel;
  const progress = xpToNextLevel > 0 ? currentLevelXP / xpToNextLevel : 0;

  return { level, currentLevelXP, xpToNextLevel, progress };
};