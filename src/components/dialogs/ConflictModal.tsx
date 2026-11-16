import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { SchedulingConflict } from '../../types';
import { Button } from '../common/Button';

interface ConflictModalProps {
  visible: boolean;
  conflicts: SchedulingConflict[];
  onClose: () => void;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  visible,
  conflicts,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons
                name="alert-octagon-outline"
                size={24}
                color={colors.warning}
              />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Scheduling Conflicts</Text>
              <Text style={styles.subtitle}>
                {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} detected
              </Text>
            </View>
          </View>

          <ScrollView style={styles.contentList}>
            {conflicts.map((conflict, index) => (
              <View key={conflict.id || index} style={styles.conflictCard}>
                <View style={styles.conflictHeader}>
                  <Text style={styles.conflictType}>
                    {conflict.conflictType.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                  <Text
                    style={[
                      styles.severity,
                      conflict.severity === 'error'
                        ? styles.severityError
                        : styles.severityWarning,
                    ]}
                  >
                    {conflict.severity.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.conflictMessage}>{conflict.message}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title="Understood"
              onPress={onClose}
              variant="primary"
              size="md"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    width: '100%',
    maxHeight: '80%',
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  contentList: {
    maxHeight: 320,
    marginVertical: spacing.sm,
  },
  conflictCard: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  conflictHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conflictType: {
    fontSize: 10,
    fontWeight: typography.fontWeight.heavy,
    color: colors.gold,
  },
  severity: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
  },
  severityError: {
    color: colors.danger,
  },
  severityWarning: {
    color: colors.gold,
  },
  conflictMessage: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  footer: {
    marginTop: spacing.md,
  },
});
