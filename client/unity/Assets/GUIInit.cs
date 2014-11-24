using UnityEngine;
using System.Collections;
using chameleon;

public class GUIInit : MonoBehaviour {

	public class Listener : ChameleonSDK.EventListener {
		public override void onInit(int code) 
		{
			Debug.Log ("on inited " + code.ToString());
			Debug.Log ("on inited " + ChameleonSDK.getChannelName ());
		}
		public override void onLogin(string loginInfo) {
			Debug.Log ("on login " + loginInfo);
		}
		public override void onLoginFail(int code) {
			Debug.Log (string.Format("on login %d", code));
		}
		public override void onRegistGuest(int code, string loginInfo) {
			Debug.Log (string.Format ("on regist guest %d", code));
			if (code == (int)ChamConstant.ErrorCode.ERR_OK) {
				Debug.Log(string.Format("on regist guest %s", loginInfo));	
			} 
		}
		public override void onPay(int code) {
			Debug.Log (string.Format("on pay %d", code));
		}
		public override void onPause() {
			Debug.Log ("on pause");
		}
		public override void onAntiAddiction(int flag) {
			Debug.Log ("on anti addiction");
		}
		public override void onDestroyed(int code) {
			Debug.Log ("on destroyed " + code);
		}
		public override void onSwitchAccount(int code, string loginInfo) {
			Debug.Log (string.Format ("on switch account %d", code));
			if (code == (int)ChamConstant.ErrorCode.ERR_OK) {
				Debug.Log(string.Format("on switch account %s", loginInfo));
			} 
		}
		public override void onLogout(){
			Debug.Log ("on logout");
		}
		public override void preAccountSwitch(){
			Debug.Log ("pre account switch ");
		}
		public override void onGuestBind(string loginInfo){
			Debug.Log ("on guest bind");
		}
	}


	// Use this for initialization
	void Start () {
		Debug.Log ("GUI init start");
		ChameleonSDK.init (new Listener());
		ChameleonSDK.login();
	}
	
	// Update is called once per frame
	void Update () {
		
	}

	void OnGUI () {
		if (GUI.Button (new Rect (10, 10, 100, 50), "Login")) {
			ChameleonSDK.login();
		}

		if (GUI.Button (new Rect (110, 10, 100, 50), "Login Guest")) {
			ChameleonSDK.loginGuest();
		}

		if (GUI.Button (new Rect (210, 10, 100, 50), "switchaccount")) {
			ChameleonSDK.switchAccount();
		}

		if (GUI.Button (new Rect (310, 10, 100, 50), "antiaddiction")) {
			ChameleonSDK.antiAddiction();
		}

		if (GUI.Button (new Rect (410, 10, 100, 50), "charge")) {
			ChameleonSDK.charge("444444",
			                    "4444444",
			                    "444444",
			                    "10",
			                    "4444",
			                    "4444",
			                    10,
			                    10,
			                    true);
		}

		if (GUI.Button (new Rect (510, 10, 100, 50), "buy")) {
			ChameleonSDK.buy("44444",
			                 "44444", 
			                 "4444444",
			                 "10",
			                 "test1",
			                 "test2",
			                 "test3",
			                 10,
			                 10);
		}

		if (GUI.Button (new Rect (610, 10, 100, 50), "showtoolbar")) {
			ChameleonSDK.createAndShowToolBar(ChameleonSDK.ToolbarPosition.TOOLBAR_BOTTOM_LEFT);
		}

		if (GUI.Button (new Rect (710, 10, 100, 50), "hidetoolbar")) {
			ChameleonSDK.showFloatBar( false);
		}
		if (GUI.Button (new Rect (810, 10, 100, 50), "destroy")) {
			ChameleonSDK.destroy();
		}
		if (GUI.Button (new Rect (910, 10, 100, 50), "submit")) {
			ChameleonSDK.submitPlayerInfo("123", "123", "123", 10, "123");
		}
	}

}
