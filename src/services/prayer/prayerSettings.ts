import * as adhan from 'adhan';
import { AsrMethod, PrayerCalculationConfig } from '../../types';

export function getCalculationParameters(config: PrayerCalculationConfig): adhan.CalculationParameters {
  let params: adhan.CalculationParameters;

  switch (config.method) {
    case 'Karachi':
      params = adhan.CalculationMethod.Karachi();
      break;
    case 'MuslimWorldLeague':
      params = adhan.CalculationMethod.MuslimWorldLeague();
      break;
    case 'Egyptian':
      params = adhan.CalculationMethod.Egyptian();
      break;
    case 'UmmAlQura':
      params = adhan.CalculationMethod.UmmAlQura();
      break;
    case 'NorthAmerica':
      params = adhan.CalculationMethod.NorthAmerica();
      break;
    case 'MoonsightingCommittee':
      params = adhan.CalculationMethod.MoonsightingCommittee();
      break;
    case 'Dubai':
      params = adhan.CalculationMethod.Dubai();
      break;
    case 'Kuwait':
      params = adhan.CalculationMethod.Kuwait();
      break;
    case 'Qatar':
      params = adhan.CalculationMethod.Qatar();
      break;
    case 'Singapore':
      params = adhan.CalculationMethod.Singapore();
      break;
    default:
      params = adhan.CalculationMethod.Karachi();
      break;
  }

  // Set Asr Madhab (Hanafi by default)
  if (config.asrMethod === 'hanafi') {
    params.madhab = adhan.Madhab.Hanafi;
  } else {
    params.madhab = adhan.Madhab.Shafi;
  }

  // High latitude adjustment for high-latitude locations
  params.highLatitudeRule = adhan.HighLatitudeRule.TwilightAngle;

  return params;
}
