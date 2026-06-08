import { NavigatorScreenParams } from "@react-navigation/native";
// Aca es donde definimos las pantallas que hay

export type RootTabParamList = {
  Home: undefined;      // Pantalla Principal
  Phone: undefined;     // Nuevo: Menú estilo teléfono
  Stats: undefined;     // Pantalla de Estadísticas
  Missions: undefined;  // Pantalla de Misiones
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
  Calendar: undefined;
  Arcs: undefined;
  ArcDetail: { arc: any } | undefined;
  ListsMenuScreen: undefined;
  ListDetailScreen: { listId: number; title: string } | undefined;
  ManageCategories: undefined;
};
