import * as Location from 'expo-location';
import { LocationConfig } from '../../types';
import { DEFAULT_LOCATION, POPULAR_LOCATIONS } from '../../constants/prayers';
import { settingsRepository } from '../../database/repositories/settingsRepository';

export const locationService = {
  async getCurrentLocation(): Promise<LocationConfig> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // Permission denied, return saved or default location
        return await this.getSavedLocation();
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;
      let cityName = 'Current Location';
      let countryName = '';

      try {
        const reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (reverse && reverse.length > 0) {
          cityName = reverse[0].city || reverse[0].subregion || reverse[0].name || 'Current Location';
          countryName = reverse[0].country || '';
        }
      } catch (e) {
        console.warn('Reverse geocode failed:', e);
      }

      const locationConfig: LocationConfig = {
        latitude,
        longitude,
        cityName,
        countryName,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
        isManual: false,
      };

      await this.saveLocation(locationConfig);
      return locationConfig;
    } catch (error) {
      console.warn('Error getting device location, falling back:', error);
      return await this.getSavedLocation();
    }
  },

  async getSavedLocation(): Promise<LocationConfig> {
    try {
      const saved = await settingsRepository.getJSON<LocationConfig | null>('user_location', null);
      if (saved) return saved;
    } catch (e) {
      console.warn('Failed to load saved location:', e);
    }
    return DEFAULT_LOCATION;
  },

  async saveLocation(location: LocationConfig): Promise<void> {
    try {
      await settingsRepository.setJSON('user_location', location);
    } catch (e) {
      console.warn('Failed to persist location setting:', e);
    }
  },

  getPopularCities(): LocationConfig[] {
    return POPULAR_LOCATIONS;
  },
};
