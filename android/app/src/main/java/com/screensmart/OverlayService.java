package com.screensmart;

import static android.content.Intent.getIntent;
import static android.content.Intent.parseUri;

import android.app.ActivityManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;

public class OverlayService extends Service {

    private WindowManager windowManager;
    private View overlayView;
    private String packageNameToClose;
    private static boolean isOverlayShowing = false;
    private HomeButtonReceiver homeButtonReceiver;

    @Override
    public void onCreate() {
        super.onCreate();
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);

        homeButtonReceiver = new HomeButtonReceiver();
        IntentFilter filter = new IntentFilter(Intent.ACTION_CLOSE_SYSTEM_DIALOGS);
        registerReceiver(homeButtonReceiver, filter);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            if (isOverlayShowing) {
                return START_NOT_STICKY;
            }
            // Remove any existing overlay view
            if (overlayView != null) {
                windowManager.removeView(overlayView);
            }
            // Create the overlay view
            overlayView = LayoutInflater.from(this).inflate(R.layout.overlay_layout, null);
            isOverlayShowing = true;
            // Get the extras from the intent
            String packageName = intent.getStringExtra("packageName");
            String totalUsageTime = intent.getStringExtra("totalUsageTime");
            packageNameToClose = packageName; // Use packageName here
            long allowedTimeLimit = intent.getLongExtra("allowedTimeLimit", 0);

            // Update the message with app name and time limit
            TextView messageView = overlayView.findViewById(R.id.overlay_message);
            messageView.setText("You've exceeded your usage limit for " +getAppName(packageName)  + " App today ,which was allowed for " + allowedTimeLimit / 1000 / 60 + " minutes");


            WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.MATCH_PARENT,
                    Build.VERSION.SDK_INT >= Build.VERSION_CODES.O ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY : WindowManager.LayoutParams.TYPE_PHONE,
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                            | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                            | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                    PixelFormat.TRANSLUCENT
            );
            params.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;

            windowManager.addView(overlayView, params);

            minimizeApp();

            // Set up the close button in the overlay
            Button closeButton = overlayView.findViewById(R.id.close_button);
            closeButton.setOnClickListener(v -> {

                stopSelf();
            });
//            bringAppToForeground();

        }

        return START_NOT_STICKY;
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

    private void minimizeApp() {
        try {
            // Minimize the app by sending an intent to bring up the home screen
            Intent homeIntent = new Intent(Intent.ACTION_MAIN);
            homeIntent.addCategory(Intent.CATEGORY_HOME);
            homeIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(homeIntent);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }


    @Override
    public void onDestroy() {
        super.onDestroy();
        if (overlayView != null) {
            windowManager.removeView(overlayView); // Ensure the overlay is removed when the service is destroyed
            overlayView = null;
            isOverlayShowing = false;
            // Unregister the HomeButtonReceiver
            if (homeButtonReceiver != null) {
                unregisterReceiver(homeButtonReceiver);
                homeButtonReceiver = null;
            }
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }


    public static boolean isOverlayShowing() {
        return isOverlayShowing;
    }
}

