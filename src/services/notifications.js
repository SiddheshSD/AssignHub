import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { loadSettings } from './storage';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export async function requestNotificationPermissions() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        return false;
    }

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('deadlines', {
            name: 'Assignment Deadlines',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#6C63FF',
            sound: 'default',
        });
    }

    return true;
}

/**
 * Schedule deadline notifications for a specific item.
 * Will schedule notifications for each day starting from `daysBefore` days before the deadline.
 */
export async function scheduleDeadlineNotifications(
    subjectName,
    subjectCode,
    itemLabel,
    itemType,
    deadlineDate,
    itemId,
    daysBefore = 2,
    notifyHour = 9,
    notifyMinute = 0
) {
    // Cancel existing notifications for this item first
    await cancelItemNotifications(itemId);

    if (!deadlineDate) return;

    const deadline = new Date(deadlineDate);
    const now = new Date();

    // Schedule notifications for each day from daysBefore down to 0 (day of deadline)
    for (let d = daysBefore; d >= 0; d--) {
        const notifyDate = new Date(deadline);
        notifyDate.setDate(notifyDate.getDate() - d);
        // Set notification time to user-configured time
        notifyDate.setHours(notifyHour, notifyMinute, 0, 0);

        // Skip if notification time is in the past
        if (notifyDate <= now) continue;

        const daysLeft = d;
        let body;
        if (daysLeft === 0) {
            body = `\uD83D\uDCC5 Today is the deadline for ${itemLabel} (${subjectName})! Submit now!`;
        } else if (daysLeft === 1) {
            body = `\u23F0 ${itemLabel} (${subjectName}) is due tomorrow!`;
        } else {
            body = `\uD83D\uDCDD ${itemLabel} (${subjectName}) is due in ${daysLeft} days.`;
        }

        await Notifications.scheduleNotificationAsync({
            content: {
                title: `${subjectCode} - ${itemType === 'assignment' ? 'Assignment' : 'Experiment'} Deadline`,
                body,
                data: { itemId, subjectCode, type: itemType },
                sound: 'default',
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: notifyDate,
                channelId: Platform.OS === 'android' ? 'deadlines' : undefined,
            },
            identifier: `${itemId}_${d}`,
        });
    }
}

/**
 * Cancel all notifications for a specific item.
 */
export async function cancelItemNotifications(itemId) {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
        if (n.identifier && n.identifier.startsWith(itemId)) {
            await Notifications.cancelScheduledNotificationAsync(n.identifier);
        }
    }
}

/**
 * Re-schedule all notifications for all subjects (e.g., when daysBefore or time setting changes).
 */
export async function rescheduleAllNotifications(subjects) {
    const settings = await loadSettings();
    const daysBefore = settings.notificationDaysBefore || 2;
    const notifyHour = settings.notificationTimeHour ?? 9;
    const notifyMinute = settings.notificationTimeMinute ?? 0;

    // Cancel all existing scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    for (const subject of subjects) {
        // Schedule for assignments
        for (const item of subject.assignments) {
            if (item.submissionDate) {
                await scheduleDeadlineNotifications(
                    subject.name,
                    subject.code,
                    item.label,
                    'assignment',
                    item.submissionDate,
                    item.id,
                    daysBefore,
                    notifyHour,
                    notifyMinute
                );
            }
        }
        // Schedule for experiments
        for (const item of subject.experiments) {
            if (item.submissionDate) {
                await scheduleDeadlineNotifications(
                    subject.name,
                    subject.code,
                    item.label,
                    'experiment',
                    item.submissionDate,
                    item.id,
                    daysBefore,
                    notifyHour,
                    notifyMinute
                );
            }
        }
    }
}
