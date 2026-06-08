import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../themes/useTheme';
import { useNavigation } from '@react-navigation/native';

interface PhoneHeaderProps {
  title: string;
  showBackButton?: boolean;
  onBack?: () => void;
  rightAction?: ReactNode;
}

export const PhoneHeader: React.FC<PhoneHeaderProps> = ({ 
  title, 
  showBackButton = true,
  onBack,
  rightAction
}) => {
  const theme = useTheme();
  const navigation = useNavigation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView 
      edges={['top']} 
      style={[styles.container, { backgroundColor: theme.surface }]}
    >
      <View style={[styles.content, { borderBottomColor: theme.border }]}>
        {showBackButton && (
          <TouchableOpacity 
            onPress={handleBack} 
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons 
              name="arrow-left" 
              size={24} 
              color={theme.primary} 
            />
          </TouchableOpacity>
        )}
        
        {/* Barra de acento inclinada estilo Persona */}
        <View style={[styles.titleAccent, { backgroundColor: theme.primary }]} />

        <Text
          style={[styles.title, { color: theme.text, fontFamily: theme.fonts?.title }]}
          numberOfLines={1}
        >
          {title?.toUpperCase()}
        </Text>

        <View style={styles.rightContainer}>
          {rightAction}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 10,
    padding: 4,
  },
  titleAccent: {
    width: 6,
    height: 22,
    marginRight: 10,
    transform: [{ skewX: '-20deg' }],
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  rightContainer: {
    marginLeft: 12,
    minWidth: 40,
    alignItems: 'flex-end',
  },
});
