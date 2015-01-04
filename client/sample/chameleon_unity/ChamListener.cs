using UnityEngine;
using System.Collections;
using chameleon;

public class ChamListener : MonoBehaviour {
	private string mUin;
	private string mToken;

	public class Listener : ChameleonSDK.EventListener {
		public override void onInit() 
		{
			Debug.Log ("on inited");
		}
		public override void onLogin(string loginInfo) {
			Debug.Log ("on login " + loginInfo);
		}
		public override void onLoginFail(int code) {
			Debug.Log (string.Format("on login %d", code));
			if (code == 25) {
			    ChameleonSDK.runProtocol("qqmsdk_setplat", "wx");
			    ChameleonSDK.login();
                        }
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
		public override void onDestroyed() {
			Debug.Log ("on destroyed");
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

	Listener mListener;

	void Awake() {
		mListener = new Listener ();
		ChameleonSDK.registerListener (mListener);
	}

	void OnDestroy() {
		ChameleonSDK.destroy ();
	}
	// Use this for initialization
	void Start () {

	}
	
	// Update is called once per frame
	void Update () {
	
	}
}
