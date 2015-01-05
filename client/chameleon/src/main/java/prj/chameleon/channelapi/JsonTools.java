package prj.chameleon.channelapi;

import android.content.Context;
import android.util.Log;

import org.apache.http.util.EncodingUtils;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.InputStream;
import java.lang.Object;

/**
 * Created From Administrator on 2015/1/5.
 */
public class JsonTools {

    private static String TAG = "JsonTools";

    //从assets 文件夹中获取文件并读取数据
    public static String getFromAssets(Context context, String fileName) {
        String result = "";
        try {
            InputStream in = context.getAssets().open(fileName);
            //获取文件的字节数
            int lenght = in.available();
            //创建byte数组
            byte[] buffer = new byte[lenght];
            //将文件中的数据读到byte数组中
            in.read(buffer);
            result = EncodingUtils.getString(buffer, "UTF-8");
        } catch (Exception e) {
            Log.e(TAG, "Exception From getFromAssets() By fileName = " + fileName + e.toString());
        }
        return result;
    }

    public static JSONObject getJsonObject(String json) {
        JSONObject jsonObject = null;
        try {
            jsonObject = new JSONObject(json);
        } catch (JSONException e) {
            Log.e(TAG, "Exception From getJsonObject() By json = " + json + e.toString());
        }
        return jsonObject;
    }

    public static JSONObject getJsonObject(JSONObject json, String key) {
        JSONObject jsonObject = null;
        try {
            jsonObject = json.getJSONObject(key);
        } catch (JSONException e) {
            Log.e(TAG, "Exception From getFromAssets() By json = " + json + "key = " + key + e.toString());
        }
        return jsonObject;
    }

    public static JSONObject getJsonObject(JSONArray json, int index) {
        JSONObject jsonObject = null;
        try {
            jsonObject = json.getJSONObject(index);
        } catch (JSONException e) {
            Log.e(TAG, "Exception From getFromAssets() By json = " + json + "index = " + index + e.toString());
        }
        return jsonObject;
    }

    public static JSONArray getJsonArray(String json) {
        JSONArray jsonArray = null;
        try {
            jsonArray = new JSONArray(json);
        } catch (JSONException e) {
            Log.e(TAG, "Exception From getFromAssets() By json = " + json + e.toString());
        }
        return jsonArray;
    }

    public static JSONArray getJsonArray(JSONObject json, String key) {
        JSONArray jsonArray = null;
        try {
            jsonArray = json.getJSONArray(key);
        } catch (JSONException e) {
            Log.e(TAG, "Exception From getFromAssets() By json = " + json + "key = " + key + e.toString());
        }
        return jsonArray;
    }

    public static int getIntByKey(JSONObject json, String key) {
        int value = 0;
        try {
            value = json.getInt(key);
        } catch (JSONException e) {
            Log.e(TAG, "Exception From getFromAssets() By json = " + json + "key = " + key + e.toString());
        }
        return value;
    }

    public static String getStringByKey(JSONObject json, String key) {
        String value = "";
        try {
            value = json.getString(key);
        } catch (JSONException e) {
            Log.e(TAG, "Exception From getFromAssets() By json = " + json + "key = " + key + e.toString());
        }
        return value;
    }

    public static String getStringByKey(String json, String key) {
        String value = "";
        try {
            JSONObject jsonObject = new JSONObject(json);
            value = jsonObject.getString(key);
        } catch (JSONException e) {
            Log.e(TAG, "Exception From getFromAssets() By json = " + json + "key = " + key + e.toString());
        }
        return value;
    }

    public static boolean getBooleanByKey(JSONObject json, String key) {
        boolean value = false;
        try {
            value = json.getBoolean(key);
        } catch (JSONException e) {
            Log.e(TAG, "Exception From getBooleanByKey() By json = " + json + "key = " + key + e.toString());
        }
        return value;
    }

    public static boolean getBooleanByKey(String json, String key) {
        boolean value = false;
        try {
            JSONObject jsonObject = new JSONObject(json);
            value = jsonObject.getBoolean(key);
        } catch (JSONException e) {
            Log.e(TAG, "Exception From getBooleanByKey() By json = " + json + "key = " + key + e.toString());
        }
        return value;
    }

}
