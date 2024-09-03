package com.screensmart;



import static androidx.core.content.ContextCompat.startActivity;

import android.app.ActivityManager;
import android.app.AppOpsManager;
import android.app.job.JobScheduler;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.VectorDrawable;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Base64;
import android.util.Log;

import androidx.work.WorkManager;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

public class AppUsageModule extends ReactContextBaseJavaModule {
    private static final int REQUEST_CODE = 214;
    private static final int JOB_ID = 1;
    private final ReactApplicationContext reactContext;
//    All the native functions will go here
    public AppUsageModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }


    private String getAppName(String packageName) {
        PackageManager packageManager = reactContext.getPackageManager();
        try {
            ApplicationInfo applicationInfo = packageManager.getApplicationInfo(packageName, PackageManager.GET_META_DATA);
            Log.e("UsageStatsHelper 2", "App name found for package: " + packageManager.getApplicationLabel(applicationInfo).toString());
            return packageManager.getApplicationLabel(applicationInfo).toString();
        } catch (PackageManager.NameNotFoundException e) {
            Log.e("UsageStatsHelper", "App name not found for package: " + packageName, e);
            return packageName;
        }
    }

    private String getAppIconBase64(String packageName) {
        Drawable icon = getAppIcon(packageName);
        if (icon == null) return null;

        Bitmap bitmap = drawableToBitmap(icon);
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream);
        byte[] byteArray = outputStream.toByteArray();
        return Base64.encodeToString(byteArray, Base64.DEFAULT);
    }

    private Bitmap drawableToBitmap(Drawable drawable) {
        if (drawable instanceof BitmapDrawable) {
            return ((BitmapDrawable) drawable).getBitmap();
        } else if (drawable instanceof VectorDrawable) {
            VectorDrawable vectorDrawable = (VectorDrawable) drawable;
            Bitmap bitmap = Bitmap.createBitmap(vectorDrawable.getIntrinsicWidth(), vectorDrawable.getIntrinsicHeight(), Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            vectorDrawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
            vectorDrawable.draw(canvas);
            return bitmap;
        } else {
            Bitmap bitmap = Bitmap.createBitmap(drawable.getIntrinsicWidth(), drawable.getIntrinsicHeight(), Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            drawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
            drawable.draw(canvas);
            return bitmap;
        }
    }
    private Drawable getAppIcon(String packageName) {
        PackageManager packageManager = reactContext.getPackageManager();
        try {
            return packageManager.getApplicationIcon(packageName);
        } catch (PackageManager.NameNotFoundException e) {
            Log.e("UsageStatsHelper", "App icon not found for package: " + packageName, e);
            return null;
        }
    }

    private boolean hasUsageStatsPermission() {
        AppOpsManager appOps = (AppOpsManager) reactContext.getSystemService(Context.APP_OPS_SERVICE);
        int mode = appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), reactContext.getPackageName());
        return mode == AppOpsManager.MODE_ALLOWED;
    }

    private String formatHour(long timestamp) {
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(timestamp);
        return String.format(Locale.getDefault(), "%02d:00", cal.get(Calendar.HOUR_OF_DAY));
    }
    @Override
    public String getName() {
        return "AppUsageModule";
    }

//    REACT METHODS
@ReactMethod
public void getAppUsage(String startDate, String endDate, Promise promise) {
    Log.d("AppUsageModule", "getAppUsage called with startDate: " + startDate + " and endDate: " + endDate);

    UsageStatsManager usageStatsManager = (UsageStatsManager) reactContext.getSystemService(Context.USAGE_STATS_SERVICE);
    if (usageStatsManager == null) {
        Log.e("AppUsageModule", "UsageStatsManager is null");
        promise.reject("Error", "UsageStatsManager is null");
        return;
    }

    if (!hasUsageStatsPermission()) {
        Log.e("AppUsageModule", "Permission Denied");
        promise.reject("Permission Denied", "Usage stats permission is not granted");
        return;
    }

    try {
        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
        Calendar calendar = Calendar.getInstance();

        // Set start time to 6:00 AM of the specified start date
        calendar.setTime(dateFormat.parse(startDate));
        calendar.set(Calendar.HOUR_OF_DAY, 3);
        calendar.set(Calendar.MINUTE, 10);
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);
        long startTime = calendar.getTimeInMillis();

        long endTime;
        if (endDate == null || endDate.isEmpty() || startDate.equals(endDate)) {
            // Set end time to 6:00 AM of the next day of the start date
            calendar.add(Calendar.DAY_OF_MONTH, 1);
            calendar.set(Calendar.HOUR_OF_DAY, 3);
            calendar.set(Calendar.MINUTE, 0);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            endTime = calendar.getTimeInMillis();
        } else {
            // Set end time to 6:00 AM of the next day of the specified end date
            calendar.setTime(dateFormat.parse(endDate));
            calendar.add(Calendar.DAY_OF_MONTH, 1);
            calendar.set(Calendar.HOUR_OF_DAY, 3);
            calendar.set(Calendar.MINUTE, 0);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            endTime = calendar.getTimeInMillis();
        }

        Log.d("AppUsageModule", "Querying usage events from " + startTime + " to " + endTime);

        UsageEvents usageEvents = usageStatsManager.queryEvents(startTime, endTime);
        Map<String, Long> appUsageMap = new HashMap<>();
        UsageEvents.Event event = new UsageEvents.Event();
        String lastPackage = null;
        long lastTimestamp = 0;

        // Loop through all events to calculate the usage time for each app

        while (usageEvents.hasNextEvent()) {
            usageEvents.getNextEvent(event);
            // Check if the event is for the app moving to the foreground
            if (event.getEventType() == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                lastPackage = event.getPackageName();
                lastTimestamp = event.getTimeStamp();
            }
            // Check if the event is for the app moving to the background
            else if (event.getEventType() == UsageEvents.Event.MOVE_TO_BACKGROUND && lastPackage != null) {
                long duration = event.getTimeStamp() - lastTimestamp;
                if (duration > 0) {
                    // Add or update the duration for the app in the map
                    if (appUsageMap.containsKey(lastPackage)) {
                        appUsageMap.put(lastPackage, appUsageMap.get(lastPackage) + duration);
                    } else {
                        appUsageMap.put(lastPackage, duration);
                    }
                }
                lastPackage = null;
                lastTimestamp = 0;
            }
        }

        WritableArray resultArray = Arguments.createArray();
        PackageManager packageManager = reactContext.getPackageManager();
        for (Map.Entry<String, Long> entry : appUsageMap.entrySet()) {
            String packageName = entry.getKey();
            long totalTimeSpent = entry.getValue();

            if (totalTimeSpent > 0) {
                WritableMap map = Arguments.createMap();
                map.putString("packageName", packageName);
                map.putDouble("totalTimeSpent", totalTimeSpent);
                map.putString("appName", getAppName(packageName));
                map.putString("appIcon", getAppIconBase64(packageName));
                map.putString("date", startDate); // Optional: you can also add endDate if you want
                resultArray.pushMap(map);
                Log.d("AppUsageModule", "App: " + packageName + " Time: " + totalTimeSpent);
            }
        }
        promise.resolve(resultArray);
    } catch (Exception e) {
        Log.e("AppUsageModule", "Error: " + e.getMessage(), e);
        promise.reject("Error", e.getMessage());
    }
}

    @ReactMethod
    public void getTotalUsage(String date,String endDate,Promise promise) {
        Log.d("AppUsageModule", "getTotalUsage called with date: " + date+" --"+endDate);

        UsageStatsManager usageStatsManager = (UsageStatsManager) reactContext.getSystemService(Context.USAGE_STATS_SERVICE);
        if (usageStatsManager == null) {
            Log.e("AppUsageModule", "UsageStatsManager is null");
            promise.reject("Error", "UsageStatsManager is null");
            return;
        }

        if (!hasUsageStatsPermission()) {
            Log.e("AppUsageModule", "Permission Denied");
            promise.reject("Permission Denied", "Usage stats permission is not granted");
            return;
        }

        try {
            SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
            Calendar calendar = Calendar.getInstance();

            // Set start time to 3:10 AM of the specified date
            calendar.setTime(dateFormat.parse(date));
            calendar.set(Calendar.HOUR_OF_DAY, 3);
            calendar.set(Calendar.MINUTE, 10);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            long startTime = calendar.getTimeInMillis();

            long endTime;
            if (endDate == null || endDate.isEmpty() || date.equals(endDate)) {
                // Set end time to 3:00 AM of the next day of the start date
                calendar.add(Calendar.DAY_OF_MONTH, 1);
                calendar.set(Calendar.HOUR_OF_DAY, 3);
                calendar.set(Calendar.MINUTE, 0);
                calendar.set(Calendar.SECOND, 0);
                calendar.set(Calendar.MILLISECOND, 0);
                endTime = calendar.getTimeInMillis();
            } else {
                // Set end time to 3:00 AM of the next day of the specified end date
                calendar.setTime(dateFormat.parse(endDate));
                calendar.add(Calendar.DAY_OF_MONTH, 1);
                calendar.set(Calendar.HOUR_OF_DAY, 3);
                calendar.set(Calendar.MINUTE, 0);
                calendar.set(Calendar.SECOND, 0);
                calendar.set(Calendar.MILLISECOND, 0);
                endTime = calendar.getTimeInMillis();
            }


            Log.d("AppUsageModule", "Querying usage events from " + startTime + " to " + endTime);

            UsageEvents usageEvents = usageStatsManager.queryEvents(startTime, endTime);
            long totalUsageTime = 0;
            UsageEvents.Event event = new UsageEvents.Event();
            String lastPackage = null;
            long lastTimestamp = 0;

            while (usageEvents.hasNextEvent()) {
                usageEvents.getNextEvent(event);

                if (event.getEventType() == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                    lastPackage = event.getPackageName();
                    lastTimestamp = event.getTimeStamp();
                } else if (event.getEventType() == UsageEvents.Event.MOVE_TO_BACKGROUND && lastPackage != null) {
                    long duration = event.getTimeStamp() - lastTimestamp;
                    if (duration > 0) {
                        totalUsageTime += duration;
                    }
                    lastPackage = null;
                    lastTimestamp = 0;
                }
            }

            WritableMap result = Arguments.createMap();
            result.putString("date", date);
            result.putDouble("totalUsageTime", totalUsageTime);
            promise.resolve(result);

            Log.d("AppUsageModule", "Total usage time for date: " + date + " is " + totalUsageTime);

        } catch (Exception e) {
            Log.e("AppUsageModule", "Error: " + e.getMessage(), e);
            promise.reject("Error", e.getMessage());
        }
    }

    @ReactMethod
    public void getTotalUsageDetails(String date, String endDate, Promise promise) {
        Log.d("AppUsageModule", "getTotalUsageDetails called with startDate: " + date + " and endDate: " + endDate);

        UsageStatsManager usageStatsManager = (UsageStatsManager) reactContext.getSystemService(Context.USAGE_STATS_SERVICE);
        if (usageStatsManager == null) {
            Log.e("AppUsageModule", "UsageStatsManager is null");
            promise.reject("Error", "UsageStatsManager is null");
            return;
        }

        if (!hasUsageStatsPermission()) {
            Log.e("AppUsageModule", "Permission Denied");
            promise.reject("Permission Denied", "Usage stats permission is not granted");
            return;
        }

        try {
            SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
            Calendar calendar = Calendar.getInstance();

            // Calculate startTime and endTime
            calendar.setTime(dateFormat.parse(date));
            calendar.set(Calendar.HOUR_OF_DAY, 3);
            calendar.set(Calendar.MINUTE, 10);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            long startTime = calendar.getTimeInMillis();

            long endTime;
            if (endDate == null || endDate.isEmpty() || date.equals(endDate)) {
                calendar.add(Calendar.DAY_OF_MONTH, 1);
                calendar.set(Calendar.HOUR_OF_DAY, 3);
                calendar.set(Calendar.MINUTE, 0);
                calendar.set(Calendar.SECOND, 0);
                calendar.set(Calendar.MILLISECOND, 0);
                endTime = calendar.getTimeInMillis();
            } else {
                calendar.setTime(dateFormat.parse(endDate));
                calendar.add(Calendar.DAY_OF_MONTH, 1);
                calendar.set(Calendar.HOUR_OF_DAY, 3);
                calendar.set(Calendar.MINUTE, 0);
                calendar.set(Calendar.SECOND, 0);
                calendar.set(Calendar.MILLISECOND, 0);
                endTime = calendar.getTimeInMillis();
            }

            Log.d("AppUsageModule", "Querying usage events from " + startTime + " to " + endTime);

            UsageEvents usageEvents = usageStatsManager.queryEvents(startTime, endTime);
            long totalTimeSpent = 0;
            int totalSessions = 0;
            UsageEvents.Event event = new UsageEvents.Event();
            String lastPackage = null;
            long lastTimestamp = 0;
            long lastEndTime = 0;

            while (usageEvents.hasNextEvent()) {
                usageEvents.getNextEvent(event);

                if (event.getEventType() == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                    if (lastPackage != null && lastEndTime != 0 && event.getTimeStamp() - lastEndTime <= 3000) {
                        // Merging with previous session
                        lastTimestamp = Math.min(lastTimestamp, event.getTimeStamp());
                    } else {
                        // New session
                        if (lastPackage != null) {
                            // End of previous session
                            long duration = lastEndTime - lastTimestamp;
                            if (duration >= 1000) { // only count sessions longer than 1 second
                                totalTimeSpent += duration;
                                totalSessions++;
                            }
                        }
                        // Start a new session
                        lastPackage = event.getPackageName();
                        lastTimestamp = event.getTimeStamp();
                    }
                } else if (event.getEventType() == UsageEvents.Event.MOVE_TO_BACKGROUND && lastPackage != null) {
                    lastEndTime = event.getTimeStamp();
                }
            }

            // Handle the last session if it was still open
            if (lastPackage != null && lastEndTime != 0) {
                long duration = lastEndTime - lastTimestamp;
                if (duration >= 1000) { // only count sessions longer than 1 second
                    totalTimeSpent += duration;
                    totalSessions++;
                }
            }

            double dailyAverage;
            if (endDate == null || endDate.isEmpty() || date.equals(endDate)) {
                // Calculate the average over the last 12 days
                Calendar startCal = Calendar.getInstance();
                startCal.setTime(dateFormat.parse(date));
                startCal.add(Calendar.DAY_OF_MONTH, -12);
                long start12DaysAgo = startCal.getTimeInMillis();

                UsageEvents last12DaysUsageEvents = usageStatsManager.queryEvents(start12DaysAgo, endTime);
                long last12DaysTotalTimeSpent = 0;
                UsageEvents.Event last12DaysEvent = new UsageEvents.Event();
                String last12DaysLastPackage = null;
                long last12DaysLastTimestamp = 0;
                Set<Integer> daysWith12DaysData = new HashSet<>();

                while (last12DaysUsageEvents.hasNextEvent()) {
                    last12DaysUsageEvents.getNextEvent(last12DaysEvent);

                    if (last12DaysEvent.getEventType() == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                        last12DaysLastPackage = last12DaysEvent.getPackageName();
                        last12DaysLastTimestamp = last12DaysEvent.getTimeStamp();
                    } else if (last12DaysEvent.getEventType() == UsageEvents.Event.MOVE_TO_BACKGROUND && last12DaysLastPackage != null) {
                        long duration = last12DaysEvent.getTimeStamp() - last12DaysLastTimestamp;
                        if (duration > 1000) { // only count sessions longer than 1 second
                            last12DaysTotalTimeSpent += duration;
                        }
                        last12DaysLastPackage = null;
                        last12DaysLastTimestamp = 0;
                        // Record the day for which we have data
                        Calendar dayCal = Calendar.getInstance();
                        dayCal.setTimeInMillis(last12DaysEvent.getTimeStamp());
                        daysWith12DaysData.add(dayCal.get(Calendar.DAY_OF_YEAR));
                    }
                }

                dailyAverage = (double) last12DaysTotalTimeSpent / Math.max(1, daysWith12DaysData.size());
                Log.d("daysWithData", String.valueOf(Math.max(1, daysWith12DaysData.size())));
            } else {
                // Calculate the average over the specified date range
                Set<Integer> rangeDaysWithData = new HashSet<>();
                UsageEvents usageEventsForRange = usageStatsManager.queryEvents(startTime, endTime);
                UsageEvents.Event rangeEvent = new UsageEvents.Event();

                while (usageEventsForRange.hasNextEvent()) {
                    usageEventsForRange.getNextEvent(rangeEvent);

                    calendar.setTimeInMillis(rangeEvent.getTimeStamp());
                    int uniqueDayKey = calendar.get(Calendar.DAY_OF_YEAR) + calendar.get(Calendar.YEAR) * 1000; // Use a unique key for each day
                    rangeDaysWithData.add(uniqueDayKey);
                }

                int availableDataDays = rangeDaysWithData.size();
                if (availableDataDays == 0) {
                    availableDataDays = 1; // Avoid division by zero
                }

                dailyAverage = (double) totalTimeSpent / availableDataDays;
                Log.d("daysWithData2", String.valueOf(availableDataDays));
            }

            // Calculate monthlyAverage
            long thirtyDaysAgo = endTime - (30L * 24 * 60 * 60 * 1000);
            UsageEvents last30DaysUsageEvents = usageStatsManager.queryEvents(thirtyDaysAgo, endTime);
            long last30DaysTotalTimeSpent = 0;
            UsageEvents.Event last30DaysEvent = new UsageEvents.Event();
            String last30DaysLastPackage = null;
            long last30DaysLastTimestamp = 0;
            Set<Integer> daysWith30DaysData = new HashSet<>();

            while (last30DaysUsageEvents.hasNextEvent()) {
                last30DaysUsageEvents.getNextEvent(last30DaysEvent);

                if (last30DaysEvent.getEventType() == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                    last30DaysLastPackage = last30DaysEvent.getPackageName();
                    last30DaysLastTimestamp = last30DaysEvent.getTimeStamp();
                } else if (last30DaysEvent.getEventType() == UsageEvents.Event.MOVE_TO_BACKGROUND && last30DaysLastPackage != null) {
                    long duration = last30DaysEvent.getTimeStamp() - last30DaysLastTimestamp;
                    if (duration > 1000) { // only count sessions longer than 1 second
                        last30DaysTotalTimeSpent += duration;
                    }
                    last30DaysLastPackage = null;
                    last30DaysLastTimestamp = 0;
                    // Record the day for which we have data
                    Calendar dayCal = Calendar.getInstance();
                    dayCal.setTimeInMillis(last30DaysEvent.getTimeStamp());
                    daysWith30DaysData.add(dayCal.get(Calendar.DAY_OF_YEAR));
                }
            }

            double monthlyAverage = (double) last30DaysTotalTimeSpent / Math.max(1, daysWith30DaysData.size());

            Log.d("AppUsageModule", "Total time spent: " + totalTimeSpent);
            Log.d("AppUsageModule", "Total sessions: " + totalSessions);
            Log.d("AppUsageModule", "Daily average: " + dailyAverage);
            Log.d("AppUsageModule", "Monthly average: " + monthlyAverage);

            WritableMap resultMap = Arguments.createMap();
            resultMap.putDouble("totalTimeSpent", totalTimeSpent);
            resultMap.putInt("totalSessions", totalSessions);
            resultMap.putDouble("dailyAverage", dailyAverage);
            resultMap.putDouble("monthlyAverage", monthlyAverage);
            promise.resolve(resultMap);
        } catch (Exception e) {
            Log.e("AppUsageModule", "Error: " + e.getMessage(), e);
            promise.reject("Error", e);
        }
    }

    @ReactMethod
    public void getUsageSessionInfo(String date, String endDate, Promise promise) {
        Log.d("AppUsageModule", "getUsageSessionInfo called with startDate: " + date + " and endDate: " + endDate);

        UsageStatsManager usageStatsManager = (UsageStatsManager) reactContext.getSystemService(Context.USAGE_STATS_SERVICE);
        if (usageStatsManager == null) {
            Log.e("AppUsageModule", "UsageStatsManager is null");
            promise.reject("Error", "UsageStatsManager is null");
            return;
        }

        if (!hasUsageStatsPermission()) {
            Log.e("AppUsageModule", "Permission Denied");
            promise.reject("Permission Denied", "Usage stats permission is not granted");
            return;
        }

        PackageManager packageManager = reactContext.getPackageManager();
        List<String> excludedKeywords = Arrays.asList(
                "launcher", "systemui", "quicksearchbox", "permissioncontroller"
        );

        try {
            SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
            Calendar calendar = Calendar.getInstance();

            calendar.setTime(dateFormat.parse(date));
            calendar.set(Calendar.HOUR_OF_DAY, 3);
            calendar.set(Calendar.MINUTE, 10);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            long startTime = calendar.getTimeInMillis();

            long endTime;
            if (endDate == null || endDate.isEmpty() || date.equals(endDate)) {
                calendar.add(Calendar.DAY_OF_MONTH, 1);
                calendar.set(Calendar.HOUR_OF_DAY, 3);
                calendar.set(Calendar.MINUTE, 0);
                calendar.set(Calendar.SECOND, 0);
                calendar.set(Calendar.MILLISECOND, 0);
                endTime = calendar.getTimeInMillis();
            } else {
                calendar.setTime(dateFormat.parse(endDate));
                calendar.add(Calendar.DAY_OF_MONTH, 1);
                calendar.set(Calendar.HOUR_OF_DAY, 3);
                calendar.set(Calendar.MINUTE, 0);
                calendar.set(Calendar.SECOND, 0);
                calendar.set(Calendar.MILLISECOND, 0);
                endTime = calendar.getTimeInMillis();
            }

            Log.d("AppUsageModule", "Querying usage events from " + startTime + " to " + endTime);

            UsageEvents usageEvents = usageStatsManager.queryEvents(startTime, endTime);
            UsageEvents.Event event = new UsageEvents.Event();
            Map<String, List<WritableMap>> sessionsByDate = new HashMap<>();
            int totalSessions = 0;
            String lastPackage = null;
            long lastTimestamp = 0;
            long lastEndTime = 0;
            int sessionId = 0;

            while (usageEvents.hasNextEvent()) {
                usageEvents.getNextEvent(event);
                String packageName = event.getPackageName();

                // Skip excluded packages based on keywords
                if (shouldExcludePackage(packageName, excludedKeywords)) {
                    continue;
                }

                if (event.getEventType() == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                    if (lastPackage != null && lastEndTime != 0 && event.getTimeStamp() - lastEndTime <= 1000) {
                        // Merging with previous session
                        lastTimestamp = Math.min(lastTimestamp, event.getTimeStamp());
                    } else {
                        // New session
                        if (lastPackage != null) {
                            totalSessions++;
                            // End of previous session
                            long duration = lastEndTime - lastTimestamp;
                            if (duration >= 1000) { // only count sessions longer than 1 second
                                WritableMap sessionMap = Arguments.createMap();
                                sessionMap.putInt("session_id", ++sessionId);
                                sessionMap.putDouble("totalTimeSpent", duration);
                                sessionMap.putDouble("sessionStartTime", lastTimestamp);
                                sessionMap.putDouble("sessionEndTime", lastEndTime);
                                sessionMap.putString("packageName", lastPackage);
                                sessionMap.putString("appName", getAppName(lastPackage)); // Adding appName
                                sessionMap.putString("appIcon", getAppIconBase64(lastPackage)); // Adding appIcon
                                String sessionDate = adjustDateForSession(lastTimestamp, dateFormat);
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                                    sessionsByDate.computeIfAbsent(sessionDate, k -> new ArrayList<>()).add(sessionMap);
                                }
                            }
                        }
                        // Start a new session
                        lastPackage = packageName;
                        lastTimestamp = event.getTimeStamp();
                    }
                } else if (event.getEventType() == UsageEvents.Event.MOVE_TO_BACKGROUND && lastPackage != null) {
                    lastEndTime = event.getTimeStamp();
                }
            }

            // Handle the last session if it was still open
            if (lastPackage != null && lastEndTime != 0) {
                long duration = lastEndTime - lastTimestamp;
                if (duration >= 1000) { // only count sessions longer than 1 second
                    WritableMap sessionMap = Arguments.createMap();
                    sessionMap.putInt("session_id", ++sessionId);
                    sessionMap.putDouble("totalTimeSpent", duration);
                    sessionMap.putDouble("sessionStartTime", lastTimestamp);
                    sessionMap.putDouble("sessionEndTime", lastEndTime);
                    sessionMap.putString("packageName", lastPackage);
                    sessionMap.putString("appName", getAppName(lastPackage)); // Adding appName
                    sessionMap.putString("appIcon", getAppIconBase64(lastPackage)); // Adding appIcon
                    String sessionDate = adjustDateForSession(lastTimestamp, dateFormat);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                        sessionsByDate.computeIfAbsent(sessionDate, k -> new ArrayList<>()).add(sessionMap);
                    }
                }
            }

            WritableArray resultArray = Arguments.createArray();
            for (Map.Entry<String, List<WritableMap>> entry : sessionsByDate.entrySet()) {
                WritableMap section = Arguments.createMap();
                section.putString("title", entry.getKey());
                WritableArray sessionArray = Arguments.createArray();
                for (WritableMap session : entry.getValue()) {
                    sessionArray.pushMap(session);
                }
                section.putArray("data", sessionArray);
                resultArray.pushMap(section);
            }

            promise.resolve(resultArray);
        } catch (Exception e) {
            Log.e("AppUsageModule", "Error querying usage events", e);
            promise.reject("Error querying usage events", e);
        }
    }
    private boolean shouldExcludePackage(String packageName, List<String> excludedKeywords) {
        for (String keyword : excludedKeywords) {
            if (packageName.toLowerCase().contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    @ReactMethod
    public void getAppUsageDetailsForApp(String date, String endDate, String packageName, Promise promise) {
        Log.d("AppUsageModule", "getAppUsageDetailsForApp called with startDate: " + date + ", endDate: " + endDate + " and packageName: " + packageName);

        UsageStatsManager usageStatsManager = (UsageStatsManager) reactContext.getSystemService(Context.USAGE_STATS_SERVICE);
        if (usageStatsManager == null) {
            Log.e("AppUsageModule", "UsageStatsManager is null");
            promise.reject("Error", "UsageStatsManager is null");
            return;
        }

        if (!hasUsageStatsPermission()) {
            Log.e("AppUsageModule", "Permission Denied");
            promise.reject("Permission Denied", "Usage stats permission is not granted");
            return;
        }

        try {
            SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
            Calendar calendar = Calendar.getInstance();

            // Calculate startTime and endTime
            calendar.setTime(dateFormat.parse(date));
            calendar.set(Calendar.HOUR_OF_DAY, 3);
            calendar.set(Calendar.MINUTE, 10);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            long startTime = calendar.getTimeInMillis();

            long endTime;
            if (endDate == null || endDate.isEmpty() || date.equals(endDate)) {
                calendar.add(Calendar.DAY_OF_MONTH, 1);
                calendar.set(Calendar.HOUR_OF_DAY, 3);
                calendar.set(Calendar.MINUTE, 0);
                calendar.set(Calendar.SECOND, 0);
                calendar.set(Calendar.MILLISECOND, 0);
                endTime = calendar.getTimeInMillis();
            } else {
                calendar.setTime(dateFormat.parse(endDate));
                calendar.add(Calendar.DAY_OF_MONTH, 1);
                calendar.set(Calendar.HOUR_OF_DAY, 3);
                calendar.set(Calendar.MINUTE, 0);
                calendar.set(Calendar.SECOND, 0);
                calendar.set(Calendar.MILLISECOND, 0);
                endTime = calendar.getTimeInMillis();
            }

            Log.d("AppUsageModule", "Querying usage events from " + startTime + " to " + endTime);

            UsageEvents usageEvents = usageStatsManager.queryEvents(startTime, endTime);
            long totalTimeSpent = 0;
            int totalAppSessions = 0;
            UsageEvents.Event event = new UsageEvents.Event();
            String lastPackage = null;
            long lastTimestamp = 0;
            long lastEndTime = 0; // Track end time of the last session

            while (usageEvents.hasNextEvent()) {
                usageEvents.getNextEvent(event);

                if (event.getPackageName().equals(packageName)) {
                    if (event.getEventType() == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                        if (lastPackage != null && lastEndTime != 0 && event.getTimeStamp() - lastEndTime <= 3000) {
                            // Merging with previous session
                            lastTimestamp = Math.min(lastTimestamp, event.getTimeStamp()); // Adjust start time if needed
                        } else {
                            // New session
                            if (lastPackage != null) {
                                // End of previous session
                                long duration = lastEndTime - lastTimestamp;
                                if (duration > 1000) { // Only count sessions longer than 1 second
                                    totalTimeSpent += duration;
                                    totalAppSessions++;
                                }
                            }
                            // Start a new session
                            lastPackage = event.getPackageName();
                            lastTimestamp = event.getTimeStamp();
                        }
                    } else if (event.getEventType() == UsageEvents.Event.MOVE_TO_BACKGROUND && lastPackage != null) {
                        lastEndTime = event.getTimeStamp();
                    }
                }
            }

            // Handle the last session if it was still open
            if (lastPackage != null && lastEndTime != 0) {
                long duration = lastEndTime - lastTimestamp;
                if (duration > 1000) { // Only count sessions longer than 1 second
                    totalTimeSpent += duration;
                    totalAppSessions++;
                }
            }

            Log.d("AppUsageModule", "Total time spent: " + totalTimeSpent);
            Log.d("AppUsageModule", "Total app sessions: " + totalAppSessions);

            // Calculate appDailyAverage and appMonthlyAverage as before
            double appDailyAverage;
            if (endDate == null || endDate.isEmpty() || date.equals(endDate)) {
                // Calculate the average over the last 12 days
                Calendar startCal = Calendar.getInstance();
                startCal.setTime(dateFormat.parse(date));
                startCal.add(Calendar.DAY_OF_MONTH, -12);
                long start12DaysAgo = startCal.getTimeInMillis();

                UsageEvents last12DaysUsageEvents = usageStatsManager.queryEvents(start12DaysAgo, endTime);
                long last12DaysTotalTimeSpent = 0;
                UsageEvents.Event last12DaysEvent = new UsageEvents.Event();
                String last12DaysLastPackage = null;
                long last12DaysLastTimestamp = 0;
                Set<Integer> daysWith12DaysData = new HashSet<>();

                while (last12DaysUsageEvents.hasNextEvent()) {
                    last12DaysUsageEvents.getNextEvent(last12DaysEvent);

                    if (last12DaysEvent.getPackageName().equals(packageName)) {
                        if (last12DaysEvent.getEventType() == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                            last12DaysLastPackage = last12DaysEvent.getPackageName();
                            last12DaysLastTimestamp = last12DaysEvent.getTimeStamp();
                        } else if (last12DaysEvent.getEventType() == UsageEvents.Event.MOVE_TO_BACKGROUND && last12DaysLastPackage != null) {
                            long duration = last12DaysEvent.getTimeStamp() - last12DaysLastTimestamp;
                            if (duration > 1000) { // Only count sessions longer than 1 second
                                last12DaysTotalTimeSpent += duration;
                            }
                            last12DaysLastPackage = null;
                            last12DaysLastTimestamp = 0;
                            // Record the day for which we have data
                            Calendar dayCal = Calendar.getInstance();
                            dayCal.setTimeInMillis(last12DaysEvent.getTimeStamp());
                            daysWith12DaysData.add(dayCal.get(Calendar.DAY_OF_YEAR));
                        }
                    }
                }

                appDailyAverage = (double) last12DaysTotalTimeSpent / Math.max(1, daysWith12DaysData.size());
                Log.d("daysWithData", String.valueOf(Math.max(1, daysWith12DaysData.size())));
            } else {
                // Calculate the average over the specified date range
                Set<Integer> rangeDaysWithData = new HashSet<>();
                UsageEvents usageEventsForRange = usageStatsManager.queryEvents(startTime, endTime);
                UsageEvents.Event rangeEvent = new UsageEvents.Event();

                while (usageEventsForRange.hasNextEvent()) {
                    usageEventsForRange.getNextEvent(rangeEvent);

                    if (rangeEvent.getPackageName().equals(packageName)) {
                        calendar.setTimeInMillis(rangeEvent.getTimeStamp());
                        int uniqueDayKey = calendar.get(Calendar.DAY_OF_YEAR) + calendar.get(Calendar.YEAR) * 1000; // Use a unique key for each day
                        rangeDaysWithData.add(uniqueDayKey);
                    }
                }

                int availableDataDays = rangeDaysWithData.size();
                if (availableDataDays == 0) {
                    availableDataDays = 1; // Avoid division by zero
                }

                appDailyAverage = (double) totalTimeSpent / availableDataDays;
                Log.d("daysWithData2", String.valueOf(availableDataDays));
            }

            double appMonthlyAverage;
            // Calculate appMonthlyAverage
            long thirtyDaysAgo = endTime - (30L * 24 * 60 * 60 * 1000);
            UsageEvents last30DaysUsageEvents = usageStatsManager.queryEvents(thirtyDaysAgo, endTime);
            long last30DaysTotalTimeSpent = 0;
            UsageEvents.Event last30DaysEvent = new UsageEvents.Event();
            String last30DaysLastPackage = null;
            long last30DaysLastTimestamp = 0;
            Set<Integer> daysWith30DaysData = new HashSet<>();

            while (last30DaysUsageEvents.hasNextEvent()) {
                last30DaysUsageEvents.getNextEvent(last30DaysEvent);

                if (last30DaysEvent.getPackageName().equals(packageName)) {
                    if (last30DaysEvent.getEventType() == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                        last30DaysLastPackage = last30DaysEvent.getPackageName();
                        last30DaysLastTimestamp = last30DaysEvent.getTimeStamp();
                    } else if (last30DaysEvent.getEventType() == UsageEvents.Event.MOVE_TO_BACKGROUND && last30DaysLastPackage != null) {
                        long duration = last30DaysEvent.getTimeStamp() - last30DaysLastTimestamp;
                        if (duration > 1000) { // Only count sessions longer than 1 second
                            last30DaysTotalTimeSpent += duration;
                        }
                        last30DaysLastPackage = null;
                        last30DaysLastTimestamp = 0;
                        // Record the day for which we have data
                        Calendar dayCal = Calendar.getInstance();
                        dayCal.setTimeInMillis(last30DaysEvent.getTimeStamp());
                        daysWith30DaysData.add(dayCal.get(Calendar.DAY_OF_YEAR));
                    }
                }
            }

            appMonthlyAverage = (double) last30DaysTotalTimeSpent / Math.max(1, daysWith30DaysData.size());

            Log.d("AppUsageModule", "Total time spent: " + totalTimeSpent);
            Log.d("AppUsageModule", "Total app sessions: " + totalAppSessions);
            Log.d("AppUsageModule", "App daily average: " + appDailyAverage);
            Log.d("AppUsageModule", "App monthly average: " + appMonthlyAverage);

            // Resolve the promise with usage details
            WritableMap result = Arguments.createMap();
            result.putDouble("totalTimeSpent", totalTimeSpent); // Convert to seconds
            result.putInt("totalAppSessions", totalAppSessions);
            result.putDouble("appDailyAverage", appDailyAverage); // Convert to seconds
            result.putDouble("appMonthlyAverage", appMonthlyAverage); // Convert to seconds

            promise.resolve(result);

        } catch (Exception e) {
            Log.e("AppUsageModule", "Error in getAppUsageDetailsForApp: " + e.getMessage());
            promise.reject("Error", e);
        }
    }

    @ReactMethod
    public void getAppSessionInfo(String date, String endDate, String packageName, Promise promise) {
        Log.d("AppUsageModule", "getAppSessionInfo called with startDate: " + date + ", endDate: " + endDate + " and packageName: " + packageName);

        UsageStatsManager usageStatsManager = (UsageStatsManager) reactContext.getSystemService(Context.USAGE_STATS_SERVICE);
        if (usageStatsManager == null) {
            Log.e("AppUsageModule", "UsageStatsManager is null");
            promise.reject("Error", "UsageStatsManager is null");
            return;
        }

        if (!hasUsageStatsPermission()) {
            Log.e("AppUsageModule", "Permission Denied");
            promise.reject("Permission Denied", "Usage stats permission is not granted");
            return;
        }

        try {
            SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
            Calendar calendar = Calendar.getInstance();

            calendar.setTime(dateFormat.parse(date));
            calendar.set(Calendar.HOUR_OF_DAY, 3);
            calendar.set(Calendar.MINUTE, 10);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            long startTime = calendar.getTimeInMillis();

            long endTime;
            if (endDate == null || endDate.isEmpty() || date.equals(endDate)) {
                calendar.add(Calendar.DAY_OF_MONTH, 1);
                calendar.set(Calendar.HOUR_OF_DAY, 3);
                calendar.set(Calendar.MINUTE, 0);
                calendar.set(Calendar.SECOND, 0);
                calendar.set(Calendar.MILLISECOND, 0);
                endTime = calendar.getTimeInMillis();
            } else {
                calendar.setTime(dateFormat.parse(endDate));
                calendar.add(Calendar.DAY_OF_MONTH, 1);
                calendar.set(Calendar.HOUR_OF_DAY, 3);
                calendar.set(Calendar.MINUTE, 0);
                calendar.set(Calendar.SECOND, 0);
                calendar.set(Calendar.MILLISECOND, 0);
                endTime = calendar.getTimeInMillis();
            }

            Log.d("AppUsageModule", "Querying usage events from " + startTime + " to " + endTime);

            UsageEvents usageEvents = usageStatsManager.queryEvents(startTime, endTime);
            UsageEvents.Event event = new UsageEvents.Event();
            Map<String, List<WritableMap>> sessionsByDate = new HashMap<>();
            String lastPackage = null;
            long lastTimestamp = 0;
            long lastEndTime = 0;
            int sessionId = 0;

            while (usageEvents.hasNextEvent()) {
                usageEvents.getNextEvent(event);

                if (event.getPackageName().equals(packageName)) {
                    if (event.getEventType() == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                        if (lastPackage != null && lastEndTime != 0 && event.getTimeStamp() - lastEndTime <= 3000) {
                            // Merging with previous session
                            lastTimestamp = Math.min(lastTimestamp, event.getTimeStamp());
                        } else {
                            // New session
                            if (lastPackage != null) {
                                // End of previous session
                                long duration = lastEndTime - lastTimestamp;
                                if (duration >= 1000) {
                                    WritableMap sessionMap = Arguments.createMap();
                                    sessionMap.putInt("session_id", ++sessionId);
                                    sessionMap.putDouble("totalTimeSpent", duration);
                                    sessionMap.putDouble("sessionStartTime", lastTimestamp);
                                    sessionMap.putDouble("sessionEndTime", lastEndTime);
                                    String sessionDate = adjustDateForSession(lastTimestamp, dateFormat);
                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                                        sessionsByDate.computeIfAbsent(sessionDate, k -> new ArrayList<>()).add(sessionMap);
                                    }
                                }
                            }
                            // Start a new session
                            lastPackage = event.getPackageName();
                            lastTimestamp = event.getTimeStamp();
                        }
                    } else if (event.getEventType() == UsageEvents.Event.MOVE_TO_BACKGROUND && lastPackage != null) {
                        lastEndTime = event.getTimeStamp();
                    }
                }
            }

            // Handle the last session if it was still open
            if (lastPackage != null && lastEndTime != 0) {
                long duration = lastEndTime - lastTimestamp;
                if (duration >= 1000) {
                    WritableMap sessionMap = Arguments.createMap();
                    sessionMap.putInt("session_id", ++sessionId);
                    sessionMap.putDouble("totalTimeSpent", duration);
                    sessionMap.putDouble("sessionStartTime", lastTimestamp);
                    sessionMap.putDouble("sessionEndTime", lastEndTime);
                    String sessionDate = adjustDateForSession(lastTimestamp, dateFormat);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                        sessionsByDate.computeIfAbsent(sessionDate, k -> new ArrayList<>()).add(sessionMap);
                    }
                }
            }

            WritableArray resultArray = Arguments.createArray();
            for (Map.Entry<String, List<WritableMap>> entry : sessionsByDate.entrySet()) {
                WritableMap section = Arguments.createMap();
                section.putString("title", entry.getKey());
                WritableArray sessionArray = Arguments.createArray();
                for (WritableMap session : entry.getValue()) {
                    sessionArray.pushMap(session);
                }
                section.putArray("data", sessionArray);
                resultArray.pushMap(section);
            }

            promise.resolve(resultArray);
        } catch (Exception e) {
            Log.e("AppUsageModule", "Error: " + e.getMessage(), e);
            promise.reject("Error", e.getMessage());
        }
    }

    private String adjustDateForSession(long timestamp, SimpleDateFormat dateFormat) {
        Calendar calendar = Calendar.getInstance();
        calendar.setTimeInMillis(timestamp);

        // Check if the time part is before 3:10 AM
        if (calendar.get(Calendar.AM_PM) == Calendar.AM &&
                (calendar.get(Calendar.HOUR_OF_DAY) < 3 ||
                        (calendar.get(Calendar.HOUR_OF_DAY) == 3 && calendar.get(Calendar.MINUTE) < 10))) {
            // Subtract one day
            calendar.add(Calendar.DAY_OF_MONTH, -1);
        }

        // Format the adjusted date
        return dateFormat.format(calendar.getTime());
    }


    @ReactMethod
    public void requestUsageStatsPermission(Promise promise) {
        if (!hasUsageStatsPermission()) {
            Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
            promise.resolve("Permission screen opened");
        } else {
            promise.resolve("Permission already granted");
        }
    }



//                               CHART RELATED FUNCTIONS

    @ReactMethod
    public void getHourlyUsageData(String date,Promise promise) {
        Log.d("AppUsageModule", "getHourlyUsageData called");

        UsageStatsManager usageStatsManager = (UsageStatsManager) reactContext.getSystemService(Context.USAGE_STATS_SERVICE);
        if (usageStatsManager == null) {
            Log.e("AppUsageModule", "UsageStatsManager is null");
            promise.reject("Error", "UsageStatsManager is null");
            return;
        }

        if (!hasUsageStatsPermission()) {
            Log.e("AppUsageModule", "Permission Denied");
            promise.reject("Permission Denied", "Usage stats permission is not granted");
            return;
        }

        try {
            SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
            Calendar calendar = Calendar.getInstance();
            // Set start time to 6:00 AM of the specified date
            calendar.setTime(dateFormat.parse(date));
            // Start time at 3 AM
            calendar.set(Calendar.HOUR_OF_DAY, 3);
            calendar.set(Calendar.MINUTE, 10);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            long startTime = calendar.getTimeInMillis();
            // End time at midnight of the next day
            calendar.add(Calendar.DAY_OF_MONTH, 1);
            long endTime = calendar.getTimeInMillis();

            Log.d("AppUsageModule", "Querying usage events from " + startTime + " to " + endTime);

            UsageEvents usageEvents = usageStatsManager.queryEvents(startTime, endTime);
            Map<Long, Long> hourlyUsageMap = new TreeMap<>();
            UsageEvents.Event event = new UsageEvents.Event();
            String lastPackage = null;
            long lastTimestamp = 0;

            while (usageEvents.hasNextEvent()) {
                usageEvents.getNextEvent(event);

                if (event.getEventType() == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                    lastPackage = event.getPackageName();
                    lastTimestamp = event.getTimeStamp();
                } else if (event.getEventType() == UsageEvents.Event.MOVE_TO_BACKGROUND && lastPackage != null) {
                    long duration = event.getTimeStamp() - lastTimestamp;
                    if (duration > 0) {
                        long hourKey = (lastTimestamp / (1000 * 60 * 60)) * (1000 * 60 * 60);
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                            hourlyUsageMap.put(hourKey, hourlyUsageMap.getOrDefault(hourKey, 0L) + duration);
                        }
                    }
                    lastPackage = null;
                    lastTimestamp = 0;
                }
            }

            WritableArray resultArray = Arguments.createArray();
            for (Map.Entry<Long, Long> entry : hourlyUsageMap.entrySet()) {
                WritableMap map = Arguments.createMap();
                map.putString("hour", formatHour(entry.getKey()));
                map.putDouble("usage", entry.getValue()); // Convert to minutes
                resultArray.pushMap(map);
            }
            promise.resolve(resultArray);
        } catch (Exception e) {
            Log.e("AppUsageModule", "Error: " + e.getMessage(), e);
            promise.reject("Error", e.getMessage());
        }
    }

    @ReactMethod
    public void getChartUsageDataForDateRange(String startDate, String endDate, Promise promise) {
        Log.d("AppUsageModule", "getUsageDataForDateRange called");

        UsageStatsManager usageStatsManager = (UsageStatsManager) reactContext.getSystemService(Context.USAGE_STATS_SERVICE);
        if (usageStatsManager == null) {
            Log.e("AppUsageModule", "UsageStatsManager is null");
            promise.reject("Error", "UsageStatsManager is null");
            return;
        }

        if (!hasUsageStatsPermission()) {
            Log.e("AppUsageModule", "Permission Denied");
            promise.reject("Permission Denied", "Usage stats permission is not granted");
            return;
        }

        try {
            SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
            Calendar calendar = Calendar.getInstance();

            // Set start time to 3:00 AM of the specified start date
            calendar.setTime(dateFormat.parse(startDate));
            calendar.set(Calendar.HOUR_OF_DAY, 3);
            calendar.set(Calendar.MINUTE, 10);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            long startTime = calendar.getTimeInMillis();

            // Set end time to 3:00 AM of the day after the specified end date
            calendar.setTime(dateFormat.parse(endDate));
            calendar.set(Calendar.HOUR_OF_DAY, 3);
            calendar.set(Calendar.MINUTE, 0);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            calendar.add(Calendar.DAY_OF_MONTH, 1);
            long endTime = calendar.getTimeInMillis();

            Log.d("AppUsageModule", "Querying usage events from " + startTime + " to " + endTime);

            UsageEvents usageEvents = usageStatsManager.queryEvents(startTime, endTime);
            Map<String, Long> dailyUsageMap = new TreeMap<>();
            UsageEvents.Event event = new UsageEvents.Event();
            String lastPackage = null;
            long lastTimestamp = 0;

            while (usageEvents.hasNextEvent()) {
                usageEvents.getNextEvent(event);

                if (event.getEventType() == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                    lastPackage = event.getPackageName();
                    lastTimestamp = event.getTimeStamp();
                } else if (event.getEventType() == UsageEvents.Event.MOVE_TO_BACKGROUND && lastPackage != null) {
                    long duration = event.getTimeStamp() - lastTimestamp;
                    if (duration > 0) {
                        String identifiedDate = adjustDateForSession(lastTimestamp, dateFormat);
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                            dailyUsageMap.put(identifiedDate, dailyUsageMap.getOrDefault(identifiedDate, 0L) + duration);
                        }
                    }
                    lastPackage = null;
                    lastTimestamp = 0;
                }
            }

            WritableArray resultArray = Arguments.createArray();
            for (Map.Entry<String, Long> entry : dailyUsageMap.entrySet()) {
                WritableMap map = Arguments.createMap();
                map.putString("date", entry.getKey());
                map.putDouble("usage", entry.getValue()); // Convert to minutes
                resultArray.pushMap(map);
            }
            promise.resolve(resultArray);
        } catch (Exception e) {
            Log.e("AppUsageModule", "Error: " + e.getMessage(), e);
            promise.reject("Error", e.getMessage());
        }
    }

    @ReactMethod
    public void getHourlyAppUsageData(String date, String packageName, Promise promise) {
        Log.d("AppUsageModule", "getAppUsageData called for package: " + packageName);

        UsageStatsManager usageStatsManager = (UsageStatsManager) reactContext.getSystemService(Context.USAGE_STATS_SERVICE);
        if (usageStatsManager == null) {
            Log.e("AppUsageModule", "UsageStatsManager is null");
            promise.reject("Error", "UsageStatsManager is null");
            return;
        }

        if (!hasUsageStatsPermission()) {
            Log.e("AppUsageModule", "Permission Denied");
            promise.reject("Permission Denied", "Usage stats permission is not granted");
            return;
        }

        try {
            SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
            Calendar calendar = Calendar.getInstance();
            // Set start time to 3:00 AM of the specified date
            calendar.setTime(dateFormat.parse(date));
            calendar.set(Calendar.HOUR_OF_DAY, 3);
            calendar.set(Calendar.MINUTE, 10);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            long startTime = calendar.getTimeInMillis();
            // End time at 3:00 AM of the next day
            calendar.add(Calendar.DAY_OF_MONTH, 1);
            long endTime = calendar.getTimeInMillis();

            Log.d("AppUsageModule", "Querying usage events from " + startTime + " to " + endTime);

            UsageEvents usageEvents = usageStatsManager.queryEvents(startTime, endTime);
            Map<Long, Long> hourlyUsageMap = new TreeMap<>();
            UsageEvents.Event event = new UsageEvents.Event();
            String lastPackage = null;
            long lastTimestamp = 0;

            while (usageEvents.hasNextEvent()) {
                usageEvents.getNextEvent(event);

                if (event.getPackageName().equals(packageName)) {
                    if (event.getEventType() == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                        lastPackage = event.getPackageName();
                        lastTimestamp = event.getTimeStamp();
                    } else if (event.getEventType() == UsageEvents.Event.MOVE_TO_BACKGROUND && lastPackage != null) {
                        long duration = event.getTimeStamp() - lastTimestamp;
                        if (duration > 0) {
                            long hourKey = (lastTimestamp / (1000 * 60 * 60)) * (1000 * 60 * 60);
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                                hourlyUsageMap.put(hourKey, hourlyUsageMap.getOrDefault(hourKey, 0L) + duration);
                            }
                        }
                        lastPackage = null;
                        lastTimestamp = 0;
                    }
                }
            }

            WritableArray resultArray = Arguments.createArray();
            for (Map.Entry<Long, Long> entry : hourlyUsageMap.entrySet()) {
                WritableMap map = Arguments.createMap();
                map.putString("hour", formatHour(entry.getKey()));
                map.putDouble("usage", entry.getValue()); // Convert to minutes
                resultArray.pushMap(map);
            }
            promise.resolve(resultArray);
        } catch (Exception e) {
            Log.e("AppUsageModule", "Error: " + e.getMessage(), e);
            promise.reject("Error", e.getMessage());
        }
    }

    @ReactMethod
    public void getAppChartUsageDataForDateRange(String startDate, String endDate, String packageName, Promise promise) {
        Log.d("AppUsageModule", "getAppChartUsageDataForDateRange called for package: " + packageName);

        UsageStatsManager usageStatsManager = (UsageStatsManager) reactContext.getSystemService(Context.USAGE_STATS_SERVICE);
        if (usageStatsManager == null) {
            Log.e("AppUsageModule", "UsageStatsManager is null");
            promise.reject("Error", "UsageStatsManager is null");
            return;
        }

        if (!hasUsageStatsPermission()) {
            Log.e("AppUsageModule", "Permission Denied");
            promise.reject("Permission Denied", "Usage stats permission is not granted");
            return;
        }

        try {
            SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
            Calendar calendar = Calendar.getInstance();

            // Set start time to 3:00 AM of the specified start date
            calendar.setTime(dateFormat.parse(startDate));
            calendar.set(Calendar.HOUR_OF_DAY, 3);
            calendar.set(Calendar.MINUTE, 10);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            long startTime = calendar.getTimeInMillis();

            // Set end time to 3:00 AM of the day after the specified end date
            calendar.setTime(dateFormat.parse(endDate));
            calendar.set(Calendar.HOUR_OF_DAY, 3);
            calendar.set(Calendar.MINUTE, 0);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            calendar.add(Calendar.DAY_OF_MONTH, 1);
            long endTime = calendar.getTimeInMillis();

            Log.d("AppUsageModule", "Querying usage events from " + startTime + " to " + endTime);

            UsageEvents usageEvents = usageStatsManager.queryEvents(startTime, endTime);
            Map<String, Long> dailyUsageMap = new TreeMap<>();
            UsageEvents.Event event = new UsageEvents.Event();
            String lastPackage = null;
            long lastTimestamp = 0;

            while (usageEvents.hasNextEvent()) {
                usageEvents.getNextEvent(event);

                if (event.getPackageName().equals(packageName)) {
                    if (event.getEventType() == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                        lastPackage = event.getPackageName();
                        lastTimestamp = event.getTimeStamp();
                    } else if (event.getEventType() == UsageEvents.Event.MOVE_TO_BACKGROUND && lastPackage != null) {
                        long duration = event.getTimeStamp() - lastTimestamp;
                        if (duration > 0) {
                            String identifiedDate = adjustDateForSession(lastTimestamp, dateFormat);
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                                dailyUsageMap.put(identifiedDate, dailyUsageMap.getOrDefault(identifiedDate, 0L) + duration);
                            }
                        }
                        lastPackage = null;
                        lastTimestamp = 0;
                    }
                }
            }

            WritableArray resultArray = Arguments.createArray();
            for (Map.Entry<String, Long> entry : dailyUsageMap.entrySet()) {
                WritableMap map = Arguments.createMap();
                map.putString("date", entry.getKey());
                map.putDouble("usage", entry.getValue()); // Convert to minutes
                resultArray.pushMap(map);
            }
            promise.resolve(resultArray);
        } catch (Exception e) {
            Log.e("AppUsageModule", "Error: " + e.getMessage(), e);
            promise.reject("Error", e.getMessage());
        }
    }
    @ReactMethod
    public void getInstalledApps(Promise promise) {
        try {
            PackageManager pm = getReactApplicationContext().getPackageManager();
            List<PackageInfo> packages = pm.getInstalledPackages(PackageManager.GET_META_DATA);
            WritableArray appList = Arguments.createArray();

            for (PackageInfo packageInfo : packages) {
                if ((packageInfo.applicationInfo.flags & ApplicationInfo.FLAG_SYSTEM) == 0) {
                    WritableMap map = Arguments.createMap();
                    String packageName = packageInfo.packageName;
                    map.putString("packageName", packageName);
                    map.putString("appName", getAppName(packageName));
                    map.putString("appIcon", getAppIconBase64(packageName));
                    appList.pushMap(map);
                }
            }

            promise.resolve(appList);
        } catch (Exception e) {
            Log.e("TAG", "Error getting installed apps: ", e);
            promise.reject("ERROR_GETTING_APPS", e);
        }
    }

    @ReactMethod
    public void getAppInstallationDate(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            PackageManager pm = context.getPackageManager();
            PackageInfo packageInfo = pm.getPackageInfo(context.getPackageName(), 0);
            long installTime = packageInfo.firstInstallTime;
            Date installDate = new Date(installTime);
            SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
            String formattedDate = dateFormat.format(installDate);
            promise.resolve(formattedDate);
        } catch (Exception e) {
            promise.reject(" getAppInstallationDate Error", e);
        }
    }

//  SERVICE RELATED !!!!!
    @ReactMethod
    public void startService(ReadableArray appLimits) {
        try {
            JSONArray jsonArray = new JSONArray();
            for (int i = 0; i < appLimits.size(); i++) {
                ReadableMap map = appLimits.getMap(i);
                JSONObject jsonObject = new JSONObject();
                jsonObject.put("packageName", map.getString("packageName"));
                jsonObject.put("allowedTimeLimit", map.getDouble("allowedTimeLimit"));
                jsonArray.put(jsonObject);
            }
            Intent intent = new Intent(reactContext, AppUsageLimitsService.class);
            intent.putExtra("appLimits", jsonArray.toString());
            reactContext.startService(intent);
            Log.d("startService Started", jsonArray.toString());

        } catch (Exception e) {
            e.printStackTrace();
            Log.d("startService Error", String.valueOf(e));
        }
    }
    @ReactMethod
    public void isServiceRunning(Promise promise) {
        ActivityManager manager = (ActivityManager) reactContext.getSystemService(Context.ACTIVITY_SERVICE);
        boolean isRunning = false;
        if (manager != null) {
            for (ActivityManager.RunningServiceInfo service : manager.getRunningServices(Integer.MAX_VALUE)) {
                if (AppUsageLimitsService.class.getName().equals(service.service.getClassName())) {
                    isRunning = true;
                    break;
                }
            }
        }
        promise.resolve(isRunning);
    }
    @ReactMethod
    public void checkAndStartService(ReadableArray appLimits) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Log.d("checkAndStartServiceRunning1", appLimits.toString());
            if (!Settings.canDrawOverlays(getReactApplicationContext())) {
                Log.d("checkAndStartServiceRunning2", appLimits.toString());
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
                intent.setData(Uri.parse("package:" + getReactApplicationContext().getPackageName()));
                intent.putExtra("appLimits", appLimits.toString());
                getCurrentActivity().startActivityForResult(intent, REQUEST_CODE);
            } else {
                Log.d("checkAndStartServiceRunning3", appLimits.toString());
                startService(appLimits);
            }
        } else {
            Log.d("checkAndStartServiceRunning4", appLimits.toString());
            startService(appLimits);
        }
    }
    @ReactMethod
    public void stopService(Promise promise) {
        try {
            Intent intent = new Intent(reactContext, AppUsageLimitsService.class);
            boolean result = reactContext.stopService(intent);
            Log.d("handlerRunning", "Service stopped: " + result);
            promise.resolve(result);
        } catch (Exception e) {
            Log.e("handlerRunning", String.format("Error stopping service %s",e));
            promise.reject("STOP_SERVICE_ERROR", e);
        }
    }

    @ReactMethod
    public void startUsageNotificationService() {
        Intent intent = new Intent(reactContext, UsageNotificationService.class);
//        intent.putExtra("appLimits", appLimitsJson);
        reactContext.startService(intent);
    }

    @ReactMethod
    public void stopUsageNotificationService(Promise promise) {
        try {
            Intent intent = new Intent(reactContext, UsageNotificationService.class);
            boolean result = reactContext.stopService(intent);
            Log.d("UsageNotificationService", "UsageNotificationService stopped: " + result);
            promise.resolve(result);
        } catch (Exception e) {
            Log.e("UsageNotificationService", String.format("Error stopping UsageNotificationService %s",e));
            promise.reject("STOP_SERVICE_ERROR", e);
        }
    }


}

