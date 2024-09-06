package com.screensmart;

import android.app.ActivityManager;
import android.app.KeyguardManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.hardware.display.DisplayManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;
import android.view.Display;

import androidx.core.app.NotificationCompat;

import java.util.HashSet;

public class UsageNotificationService extends Service {
    private Handler handler = new Handler();
    private Runnable runnable;
    private static final String CHANNEL_ID = "UsageNotificationServiceChannel";
    private static final long MAX_TIME = (long) (30.5* 60 * 1000);
    private static final long MINUTES = 30;
    private static final long TIME_LIMIT = MINUTES * 60 * 1000;
    private static final long CHECK_INTERVAL = 10000; // 10 seconds

    // HashSet to track notified apps
    private HashSet<String> notifiedApps = new HashSet<>();

    private long lastForegroundTime = 0;
    private String lastForegroundApp = null;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        startForegroundService();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "Usage Notification Service Channel",
                    NotificationManager.IMPORTANCE_HIGH  // Change this to IMPORTANCE_HIGH
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(serviceChannel);
            }
        }
    }

    private void startForegroundService() {
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("ScreenSmart is Running")
                .setContentText("")
                .setPriority(Notification.PRIORITY_MIN)
                .build();
        startForeground(1, notification);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startMonitoring();
        Log.d("UsageNotificationService", "Service is Started");
        return START_STICKY;
    }

    private void startMonitoring() {
        runnable = new Runnable() {
            @Override
            public void run() {
                Log.d("UsageNotificationService", "Notification Service is running");
                if (!isDeviceLocked() && isScreenOn()) {
                    checkDeviceUsage();
                } else {
                    Log.d("UsageNotificationService", "Device is locked or screen is off, skipping tracking");
                }
//                sendNotification("com.app");
                handler.postDelayed(this, CHECK_INTERVAL); // Check every 10 seconds
            }
        };
        handler.post(runnable);
    }


    private boolean isDeviceLocked() {
        KeyguardManager keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
        return keyguardManager != null && keyguardManager.isKeyguardLocked();
    }

    // Method to check if the screen is on
    private boolean isScreenOn() {
        DisplayManager displayManager = (DisplayManager) getSystemService(Context.DISPLAY_SERVICE);
        if (displayManager != null) {
            Display[] displays = displayManager.getDisplays();
            for (Display display : displays) {
                if (display.getState() == Display.STATE_ON || display.getState() == Display.STATE_DOZE) {
                    return true; // Screen is on or in doze mode
                }
            }
        }
        return false; // Screen is off
    }

    private void checkDeviceUsage() {
        String activeApp = detectActiveAppSession();
        Log.e("UsageNotificationService", "activeApp is "+activeApp);
        if (activeApp != null) {
            if (!notifiedApps.contains(activeApp)) {
                sendNotification(activeApp);
                notifiedApps.add(activeApp); // Add app to the set after notification is sent
            }
        } else {
            // Clear the set when there's no active app (indicating a potential new session or reset)
//            Log.e("UsageNotificationService", "Hashset cleared");
            notifiedApps.clear();
        }

    }

    private String detectActiveAppSession() {
        UsageStatsManager usageStatsManager = (UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
        if (usageStatsManager == null) {
            Log.e("UsageNotificationService", "UsageStatsManager is null");
            return null;
        }

        long endTime = System.currentTimeMillis();
        long startTime = endTime - MAX_TIME; // Check the last 5 minutes

        UsageEvents usageEvents = usageStatsManager.queryEvents(startTime, endTime);
        UsageEvents.Event event = new UsageEvents.Event();
        String lastPackage = null;
        long lastTimestamp = 0;
        long lastEndTime = 0;

        Log.d("UsageNotificationService", "Starting event processing from " + startTime + " to " + endTime);

        while (usageEvents.hasNextEvent()) {
            usageEvents.getNextEvent(event);

            String packageName = event.getPackageName();

            // Ignore package names containing specified keywords
            if (packageName.contains("launcher") ||
                    packageName.contains("systemui") ||
                    packageName.contains("quicksearchbox") ||
                    packageName.contains("permissioncontroller")) {
                continue; // Skip this event
            }

            Log.d("UsageNotificationService", "Detected event: " + packageName +
                    " | Event Type: " + event.getEventType() +
                    " | Timestamp: " + event.getTimeStamp());

            if (event.getEventType() == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                if (lastPackage != null && lastPackage.equals(packageName) && lastEndTime != 0 && event.getTimeStamp() - lastEndTime <= 1000) {
                    // Merging with the previous session only if it's the same package
                    Log.d("UsageNotificationService", "Merging sessions for package: " + lastPackage);
                    lastTimestamp = Math.min(lastTimestamp, event.getTimeStamp());
                } else {
                    // New session
                    if (lastPackage != null) {
                        // End of the previous session
                        long duration = lastEndTime - lastTimestamp;
                        Log.d("UsageNotificationService", "End of session for package: " + lastPackage +
                                " | Duration: " + duration + " ms");

                        if (duration >= TIME_LIMIT) { // If session duration is longer than the time limit
                            Log.d("UsageNotificationService", "App " + lastPackage +
                                    " exceeded " + MINUTES + " minutes of continuous usage.");
                            return lastPackage;
                        }
                    }
                    // Start a new session
                    lastPackage = packageName;
                    lastTimestamp = event.getTimeStamp();
                    Log.d("UsageNotificationService", "New session started for package: " + lastPackage +
                            " | Start Time: " + lastTimestamp);
                }
            } else if (event.getEventType() == UsageEvents.Event.MOVE_TO_BACKGROUND && lastPackage != null) {
                lastEndTime = event.getTimeStamp();
                Log.d("UsageNotificationService", "App " + lastPackage + " moved to background at: " + lastEndTime);
            }
        }

        // Check if the current ongoing session exceeds the time limit
        if (lastPackage != null && endTime - lastTimestamp >= TIME_LIMIT) {
            Log.d("UsageNotificationService", "App " + lastPackage +
                    " exceeded " + MINUTES + " minutes of continuous usage. Current session ongoing.");
            return lastPackage;
        }

        Log.d("UsageNotificationService", "No app exceeded " + MINUTES + " minutes of continuous usage.");
        return null;
    }

//    private String detectActiveAppSession() {
//        UsageStatsManager usageStatsManager = (UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
//        if (usageStatsManager == null) {
//            Log.e("UsageNotificationService", "UsageStatsManager is null");
//            return null;
//        }
//
//        long endTime = System.currentTimeMillis();
//        long startTime = endTime - MAX_TIME; // Check the last 32 minutes
//
//        UsageEvents usageEvents = usageStatsManager.queryEvents(startTime, endTime);
//        UsageEvents.Event event = new UsageEvents.Event();
//        String lastPackage = null;
//        long lastTimestamp = 0;
//        long lastEndTime = 0;
//
//        Log.d("UsageNotificationService", "Starting event processing from " + startTime + " to " + endTime);
//
//        while (usageEvents.hasNextEvent()) {
//            usageEvents.getNextEvent(event);
//
//            String packageName = event.getPackageName();
//
//            // Ignore package names containing specified keywords
//            if (packageName.contains("launcher") ||
//                    packageName.contains("systemui") ||
//                    packageName.contains("quicksearchbox") ||
//                    packageName.contains("permissioncontroller")) {
////                Log.d("UsageNotificationService", "Ignoring package: " + packageName);
//                continue; // Skip this event
//            }
//
//            Log.d("UsageNotificationService", "Detected event: " + packageName +
//                    " | Event Type: " + event.getEventType() +
//                    " | Timestamp: " + event.getTimeStamp());
//
//            if (event.getEventType() == UsageEvents.Event.MOVE_TO_FOREGROUND) {
//                if (lastPackage != null && lastEndTime != 0 && event.getTimeStamp() - lastEndTime <= 1000 * 3) {
//                    // Merging with the previous session
//                    Log.d("UsageNotificationService", "Merging sessions for package: " + lastPackage);
//                    lastTimestamp = Math.min(lastTimestamp, event.getTimeStamp());
//                } else {
//                    // New session
//                    if (lastPackage != null) {
//                        // End of the previous session
//                        long duration = lastEndTime - lastTimestamp;
//                        Log.d("UsageNotificationService", "End of session for package: " + lastPackage +
//                                " | Duration: " + duration + " ms");
//
//                        if (duration >= TIME_LIMIT) { // If session duration is longer than the time limit
//                            Log.d("UsageNotificationService", "App " + lastPackage +
//                                    " exceeded " + MINUTES + " minutes of continuous usage.");
//                            return lastPackage;
//                        }
//                    }
//                    // Start a new session
//                    lastPackage = packageName;
//                    lastTimestamp = event.getTimeStamp();
//                    Log.d("UsageNotificationService", "New session started for package: " + lastPackage +
//                            " | Start Time: " + lastTimestamp);
//                }
//            } else if (event.getEventType() == UsageEvents.Event.MOVE_TO_BACKGROUND && lastPackage != null) {
//                lastEndTime = event.getTimeStamp();
//                Log.d("UsageNotificationService", "App " + lastPackage + " moved to background at: " + lastEndTime);
//            }
//        }
//
//        // Check if the current ongoing session exceeds the time limit
//        if (lastPackage != null && endTime - lastTimestamp >= TIME_LIMIT) {
//            Log.d("UsageNotificationService", "App " + lastPackage +
//                    " exceeded "+MINUTES+" minutes of continuous usage. Current session ongoing.");
//            return lastPackage;
//        }
//
//        Log.d("UsageNotificationService", "No app exceeded " + MINUTES + " minutes of continuous usage.");
//        return null;
//    }


    private boolean isSystemApp(String packageName) {
        PackageManager packageManager = this.getPackageManager();
        try {
            ApplicationInfo applicationInfo = packageManager.getApplicationInfo(packageName, 0);
            return (applicationInfo.flags & ApplicationInfo.FLAG_SYSTEM) != 0;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }
    private void sendNotification(String packageName) {
        Log.d("UsageNotificationService", "Sending Notification for: " + packageName);

        // Create the big text style for the expanded notification
        NotificationCompat.BigTextStyle bigTextStyle = new NotificationCompat.BigTextStyle()
                .bigText("Your current session on " + getAppName(packageName) + " exceeds " + MINUTES + " minutes. Make sure it's for a healthy purpose!");

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("App Usage Alert")
                .setContentText("Your current session on " + getAppName(packageName) + " exceeds " + MINUTES + " minutes.")
                .setStyle(bigTextStyle)  // Set the big text style here
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true);

        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            notificationManager.notify(2, builder.build());
            Log.d("UsageNotificationService", "Notification sent for app: " + packageName);
        } else {
            Log.e("UsageNotificationService", "NotificationManager is null. Notification not sent.");
        }
    }
    private String getAppName(String packageName) {
        PackageManager packageManager = this.getPackageManager();
        try {
            ApplicationInfo applicationInfo = packageManager.getApplicationInfo(packageName, PackageManager.GET_META_DATA);
            Log.e("UsageStatsHelper 2", "App name found for package: " + packageManager.getApplicationLabel(applicationInfo).toString());
            return packageManager.getApplicationLabel(applicationInfo).toString();
        } catch (PackageManager.NameNotFoundException e) {
            Log.e("UsageStatsHelper", "App name not found for package: " + packageName, e);
            return packageName;
        }
    }
    @Override
    public void onDestroy() {
        super.onDestroy();
        handler.removeCallbacks(runnable);
        Log.d("UsageNotificationService", "Service has been stopped");
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
