package com.screensmart;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class HomeButtonReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_CLOSE_SYSTEM_DIALOGS.equals(intent.getAction())) {
            Log.d("HomeButtonReceiver", "Home button pressed or system dialogs closed");
            // Stop the OverlayService when the home button is pressed
            Intent overlayIntent = new Intent(context, OverlayService.class);
            context.stopService(overlayIntent);
        }
    }
}