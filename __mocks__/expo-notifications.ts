export const AndroidImportance = {
  UNKNOWN: 0,
  UNSPECIFIED: 1,
  NONE: 2,
  MIN: 3,
  LOW: 4,
  DEFAULT: 5,
  HIGH: 6,
  MAX: 7,
};

export const AndroidNotificationPriority = {
  DEFAULT: 'default',
  HIGH: 'high',
  MAX: 'max',
};

export const AndroidNotificationImportance = {
  DEFAULT: 3,
  HIGH: 4,
  MAX: 5,
};

export const AndroidNotificationVisibility = {
  PUBLIC: 1,
};

export const SchedulableTriggerInputTypes = {
  DATE: 'date',
  TIME_INTERVAL: 'timeInterval',
};

export const IosAuthorizationStatus = {
  AUTHORIZED: 1,
};

let scheduledList: any[] = [];

export async function setNotificationHandler(handler: any): Promise<void> {}

export async function setNotificationChannelAsync(id: string, config: any): Promise<void> {}

export async function scheduleNotificationAsync(params: any): Promise<string> {
  // Remove if exists
  scheduledList = scheduledList.filter((s) => s.identifier !== params.identifier);
  scheduledList.push(params);
  return params.identifier || 'mock_notification_id';
}

export async function cancelScheduledNotificationAsync(identifier: string): Promise<void> {
  scheduledList = scheduledList.filter((s) => s.identifier !== identifier);
}

export async function cancelAllScheduledNotificationsAsync(): Promise<void> {
  scheduledList = [];
}

export async function getAllScheduledNotificationsAsync(): Promise<any[]> {
  return [...scheduledList];
}

export async function getPermissionsAsync(): Promise<any> {
  return { granted: true, status: 'granted', canAskAgain: true };
}

export async function requestPermissionsAsync(): Promise<any> {
  return { granted: true, status: 'granted' };
}
