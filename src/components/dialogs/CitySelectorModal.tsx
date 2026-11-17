import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { LocationConfig } from '../../types';
import { POPULAR_LOCATIONS } from '../../constants/prayers';
import { locationService } from '../../services/location/locationService';

interface CitySelectorModalProps {
  visible: boolean;
  currentCityName: string;
  onSelectCity: (location: LocationConfig) => void;
  onClose: () => void;
}

export const CitySelectorModal: React.FC<CitySelectorModalProps> = ({
  visible,
  currentCityName,
  onSelectCity,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const filteredLocations = POPULAR_LOCATIONS.filter((loc) =>
    `${loc.cityName} ${loc.countryName}`.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const handleGpsDetect = async () => {
    setDetectingGps(true);
    setGpsError(null);
    try {
      const loc = await locationService.getCurrentLocation();
      onSelectCity(loc);
      onClose();
    } catch (err: any) {
      setGpsError('Could not detect GPS location. Please choose a city below.');
    } finally {
      setDetectingGps(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="map-marker-radius" size={22} color={colors.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Select City / Location</Text>
              <Text style={styles.subtitle}>Updates astronomical prayer times automatically</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* GPS Quick Detect Button */}
          <TouchableOpacity
            style={styles.gpsButton}
            onPress={handleGpsDetect}
            disabled={detectingGps}
          >
            {detectingGps ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <MaterialCommunityIcons name="crosshairs-gps" size={18} color={colors.primary} />
            )}
            <Text style={styles.gpsButtonText}>
              {detectingGps ? 'Detecting Current Location...' : 'Use Current GPS Location'}
            </Text>
          </TouchableOpacity>

          {gpsError && (
            <View style={styles.gpsErrorBanner}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.warning} />
              <Text style={styles.gpsErrorText}>{gpsError}</Text>
            </View>
          )}

          {/* Search Input */}
          <View style={styles.searchBox}>
            <MaterialCommunityIcons name="magnify" size={18} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search city (e.g. Indore, Ujjain)..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialCommunityIcons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* City Grid / List */}
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            <View style={styles.grid}>
              {filteredLocations.map((loc) => {
                const isSelected = currentCityName.toLowerCase() === loc.cityName.toLowerCase();
                return (
                  <TouchableOpacity
                    key={`${loc.cityName}-${loc.countryName}`}
                    style={[styles.cityCard, isSelected && styles.cityCardSelected]}
                    onPress={() => {
                      onSelectCity(loc);
                      onClose();
                    }}
                  >
                    <View style={styles.cityCardContent}>
                      <Text style={[styles.cityName, isSelected && styles.cityNameSelected]}>
                        {loc.cityName}
                      </Text>
                      <Text style={styles.countryName}>{loc.countryName}</Text>
                    </View>
                    {isSelected && (
                      <MaterialCommunityIcons name="check-circle" size={18} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  dialog: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: borderRadius.lg,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  gpsButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
  },
  gpsErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  gpsErrorText: {
    fontSize: typography.fontSize.xs,
    color: colors.gold,
    flex: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 42,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
  },
  list: {
    maxHeight: 380,
  },
  grid: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  cityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceHighlight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  cityCardSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: colors.primary,
  },
  cityCardContent: {
    flex: 1,
  },
  cityName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  cityNameSelected: {
    color: colors.primary,
  },
  countryName: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
});
