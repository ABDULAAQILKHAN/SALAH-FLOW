export interface AlarmTone {
  id: string;
  name: string;
  subtitle: string;
  filename: string;
  requireAsset?: any;
  icon: string;
}

export const PEACEFUL_ALARM_TONES: AlarmTone[] = [
  {
    id: 'peaceful_adhan',
    name: 'Peaceful Adhan',
    subtitle: 'Gentle, serene call to prayer melody',
    filename: 'peaceful_adhan.wav',
    requireAsset: require('../../assets/sounds/peaceful_adhan.wav'),
    icon: 'mosque',
  },
  {
    id: 'soft_chime',
    name: 'Soft Dawn Chime',
    subtitle: 'Warm rising harmonic chimes',
    filename: 'soft_chime.wav',
    requireAsset: require('../../assets/sounds/soft_chime.wav'),
    icon: 'bell-ring-outline',
  },
  {
    id: 'dawn_birds',
    name: 'Gentle Morning Birds',
    subtitle: 'Soothing nature chirps with soft resonance',
    filename: 'dawn_birds.wav',
    requireAsset: require('../../assets/sounds/dawn_birds.wav'),
    icon: 'bird',
  },
  {
    id: 'calm_bell',
    name: 'Calm Meditation Bell',
    subtitle: 'Deep, resonant acoustic bell with long decay',
    filename: 'calm_bell.wav',
    requireAsset: require('../../assets/sounds/calm_bell.wav'),
    icon: 'music-clef-treble',
  },
  {
    id: 'default',
    name: 'Device Default Alarm',
    subtitle: 'Standard system notification / alarm sound',
    filename: 'default',
    icon: 'cellphone-sound',
  },
];
