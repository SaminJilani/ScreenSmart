package com.screensmart;

import android.app.ActivityManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

public class AppUsageLimitsService extends Service {
    private Handler handler = new Handler();
    private Runnable runnable;
    private Map<String, Long> appLimits = new HashMap<>();
    private static final String DATE_FORMAT = "yyyy-MM-dd";
    private static final String CHANNEL_ID = "AppUsageLimitsServiceChannel";

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
                    "App Usage Limits Service Channel",
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(serviceChannel);
            }
        }
    }

    private void startForegroundService() {
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("ScreenSmart is Running")
                .build();
        startForeground(1, notification);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String appLimitsJson = intent.getStringExtra("appLimits");
        parseAppLimits(appLimitsJson);
        startMonitoring();
        Log.d("SERVICESTATUS1", "Service is Started ---> "+appLimitsJson);
        Log.d("HandlerRunning","Service is Started");
        return START_STICKY;
    }

    private void parseAppLimits(String appLimitsJson) {
        try {
            JSONArray jsonArray = new JSONArray(appLimitsJson);
            for (int i = 0; i < jsonArray.length(); i++) {
                JSONObject jsonObject = jsonArray.getJSONObject(i);
                String packageName = jsonObject.getString("packageName");
                long allowedTimeLimit = jsonObject.getLong("allowedTimeLimit");
                appLimits.put(packageName, allowedTimeLimit);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void startMonitoring() {
        runnable = new Runnable() {
            @Override
            public void run() {
                Log.d("HandlerRunning", Objects.requireNonNull(getForegroundApp()));

                checkAppUsage();
                handler.postDelayed(this, 5000); // Check every 15 seconds
            }
        };
        handler.post(runnable);
    }

    private void checkAppUsage() {
        String currentApp = getForegroundApp();

        if (appLimits.containsKey(currentApp)) {
            UsageStatsManager usageStatsManager = (UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
            if (usageStatsManager == null) {
                Log.e("AppUsageService", "UsageStatsManager is null");
                return;
            }
            Date currentDate = new Date();

            // Define the desired format
            SimpleDateFormat formatter = new SimpleDateFormat("yyyy-MM-dd");

            // Format the current date
            String date =  formatter.format(currentDate);
            // Set the time range for monitoring usage events
//            String date = "2024-08-06"; // Example date
            SimpleDateFormat dateFormat = new SimpleDateFormat(DATE_FORMAT, Locale.getDefault());
            Calendar calendar = Calendar.getInstance();

            try {
                calendar.setTime(dateFormat.parse(date));
            } catch (Exception e) {
                e.printStackTrace();
                return;
            }

            calendar.set(Calendar.HOUR_OF_DAY, 3);
            calendar.set(Calendar.MINUTE, 10);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            long startTime = calendar.getTimeInMillis();

            calendar.add(Calendar.DAY_OF_MONTH, 1);
            calendar.set(Calendar.HOUR_OF_DAY, 3);
            calendar.set(Calendar.MINUTE, 0);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            long endTime = calendar.getTimeInMillis();

            // Query usage events for the specified time range
            UsageEvents usageEvents = usageStatsManager.queryEvents(startTime, endTime);
            UsageEvents.Event event = new UsageEvents.Event();

            long totalUsageTime = 0;

            while (usageEvents.hasNextEvent()) {
                usageEvents.getNextEvent(event);

                if (event.getPackageName().equals(currentApp)) {
                    if (event.getEventType() == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                        long startTimestamp = event.getTimeStamp();
                        long endTimestamp = 0;

                        while (usageEvents.hasNextEvent() && event.getEventType() != UsageEvents.Event.MOVE_TO_BACKGROUND) {
                            usageEvents.getNextEvent(event);
                            if (event.getPackageName().equals(currentApp)) {
                                endTimestamp = event.getTimeStamp();
                            }
                        }

                        long duration = endTimestamp - startTimestamp;
                        if (duration > 0) {
                            totalUsageTime += duration;
                        }
                    }
                }
            }

            long allowedTimeLimit = appLimits.get(currentApp);
            Log.d("AppUsageService", "Total usage time for " + currentApp + ": " + totalUsageTime);

            if (totalUsageTime > allowedTimeLimit) {
                Log.d("TimeExceeded", "Total usage time for " + currentApp + ": " + totalUsageTime);

                Intent overlayIntent = new Intent(this, OverlayService.class);
                overlayIntent.putExtra("packageName", currentApp);
                overlayIntent.putExtra("allowedTimeLimit", allowedTimeLimit);
                overlayIntent.putExtra("totalUsageTime", totalUsageTime);

                if (!OverlayService.isOverlayShowing()) {
                    startService(overlayIntent);
                }
            }
        }
    }

    private String getForegroundApp() {
        UsageStatsManager usageStatsManager = (UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
        if (usageStatsManager == null) {
            Log.e("ForegroundAppChecker", "UsageStatsManager is null");
            return null;
        }

        long endTime = System.currentTimeMillis();
        long startTime = endTime - 1000 * 60;

        UsageEvents usageEvents = usageStatsManager.queryEvents(startTime, endTime);
        UsageEvents.Event event = new UsageEvents.Event();
        String currentApp = "";

        while (usageEvents.hasNextEvent()) {
            usageEvents.getNextEvent(event);

            if (event.getEventType() == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                currentApp = event.getPackageName();
            }
        }

        return currentApp;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        handler.removeCallbacks(runnable);
        Log.d("HandlerRunning","Service has been stopped");
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
