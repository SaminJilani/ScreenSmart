package com.screensmart

import android.content.Intent
import android.provider.Settings
import android.util.Log
import android.widget.Toast
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import org.json.JSONArray
import org.json.JSONException


class MainActivity : ReactActivity() {

    companion object {
        private const val REQUEST_CODE = 214 // Define your request code here
    }


    /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "ScreenSmart"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)


    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_CODE) {
            try {
                if (Settings.canDrawOverlays(this)) {
                    // Get the React Context
                    val reactContext = (application as ReactApplication).reactNativeHost.reactInstanceManager.currentReactContext

                    if (reactContext != null) {
                        // Retrieve appLimits from the Intent
//                        val appLimitsJson = data?.getStringExtra("appLimits")
//                        Log.d("appLimits onActivityResult", appLimitsJson.toString())
//                        val appLimitsArray: ReadableArray = convertJsonStringToReadableArray(appLimitsJson)
                        // Call startService method from React Native Module
                        val appUsageModule = reactContext.getNativeModule(AppUsageModule::class.java)
//                        appUsageModule?.startService(appLimitsArray)
                    } else {
                        Toast.makeText(this, "React context is null", Toast.LENGTH_LONG).show()
                    }
                } else {
                    Toast.makeText(this, "Overlay permission is required to display the overlay.", Toast.LENGTH_LONG).show()
                }

            } catch (e: Exception){
                Log.d("onActivityResult", e.message ?: "Unknown error") // Log the exception message
                // Optionally, log the full stack trace for more detailed debugging
                Log.d("onActivityResult", Log.getStackTraceString(e))
            }

        }
    }



}


fun convertJsonStringToReadableArray(jsonString: String?): ReadableArray {
    val readableArray = Arguments.createArray()
    try {
        val jsonArray = JSONArray(jsonString)
        for (i in 0 until jsonArray.length()) {
            val item = jsonArray[i]
            if (item is Int) {
                readableArray.pushInt(item)
            } else if (item is Double) {
                readableArray.pushDouble(item)
            } else if (item is String) {
                readableArray.pushString(item)
            } else if (item is Boolean) {
                readableArray.pushBoolean(item)
            } else if (item is JSONArray) {
                readableArray.pushArray(convertJsonStringToReadableArray(item.toString()))
            }
        }
    } catch (e: JSONException) {
        e.printStackTrace()
    }
    return readableArray
}