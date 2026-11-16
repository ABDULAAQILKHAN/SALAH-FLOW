import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius, spacing } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'surface' | 'elevated' | 'highlight';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'surface',
}) => {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'elevated':
        return colors.surfaceElevated;
      case 'highlight':
        return colors.surfaceHighlight;
      case 'surface':
      default:
        return colors.surface;
    }
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: getBackgroundColor() },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
});
