import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../theme';

interface BadgeProps {
  label: string;
  variant?: 'core' | 'primary' | 'secondary' | 'warning' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'primary',
  size = 'md',
}) => {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'core':
        return colors.primaryMuted;
      case 'primary':
        return colors.primaryMuted;
      case 'secondary':
        return colors.secondaryMuted;
      case 'warning':
        return colors.goldMuted;
      case 'danger':
        return colors.dangerMuted;
      case 'neutral':
      default:
        return colors.surfaceHighlight;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'core':
        return colors.primaryLight;
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.secondary;
      case 'warning':
        return colors.gold;
      case 'danger':
        return colors.danger;
      case 'neutral':
      default:
        return colors.textSecondary;
    }
  };

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: getBackgroundColor() },
        size === 'sm' && styles.badgeSmall,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: getTextColor() },
          size === 'sm' && styles.textSmall,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  text: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    letterSpacing: 0.3,
  },
  textSmall: {
    fontSize: 10,
  },
});
