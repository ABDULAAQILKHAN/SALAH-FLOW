import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { PEACEFUL_ALARM_TONES, AlarmTone } from '../../constants/sounds';

let activePlayer: AudioPlayer | null = null;
let currentPlayingToneId: string | null = null;

export const soundPlayer = {
  async playTone(toneId: string): Promise<void> {
    try {
      this.stop();

      const tone = PEACEFUL_ALARM_TONES.find((t) => t.id === toneId);
      if (!tone || !tone.requireAsset) {
        return;
      }

      activePlayer = createAudioPlayer(tone.requireAsset);
      currentPlayingToneId = toneId;
      activePlayer.play();
    } catch (e) {
      console.warn('Failed to play tone preview:', e);
    }
  },

  stop(): void {
    try {
      if (activePlayer) {
        activePlayer.pause();
        activePlayer.release();
        activePlayer = null;
      }
      currentPlayingToneId = null;
    } catch (e) {
      console.warn('Failed to stop tone:', e);
    }
  },

  getCurrentPlayingToneId(): string | null {
    return currentPlayingToneId;
  },
};
