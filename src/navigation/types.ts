import { NavigatorScreenParams } from "@react-navigation/native";
// Aca es donde definimos las pantallas que hay

export type RootTabParamList = {
  Home: undefined;      // Pantalla Principal
  Arcs: undefined;      // Pantalla de Arcos (Story Arcs)
  Stats: undefined;     // Pantalla de Estadísticas
  Missions: undefined;  // Pantalla de Misiones
  Calendar: undefined;  // Pantalla de Calendario
  Economy: undefined;
  Profile: undefined;   // Pantalla de Perfil
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<RootTabParamList>;
  CreateMission: { missionToEdit?: any } | undefined;
  ManageMissions: undefined;
  CompletedMissions: undefined;
  Settings: undefined;
  CharacterSelection: { isEditing?: boolean } | undefined;
  Setup: { isEditing?: boolean } | undefined;
  Arcs: undefined;
  ArcDetail: { arc: any } | undefined;
  ManageCategories: undefined;
};
