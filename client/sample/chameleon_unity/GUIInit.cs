using UnityEngine;
using System.Collections;
using chameleon;

public class GUIInit : MonoBehaviour {

	// Use this for initialization
	void Start () {
	
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
			//ChameleonSDK.antiAddiction();
		}

		if (GUI.Button (new Rect (410, 10, 100, 50), "charge")) {
			//ChameleonSDK.charge();
		}

		if (GUI.Button (new Rect (510, 10, 100, 50), "buy")) {
			//ChameleonSDK.buy();
		}

		if (GUI.Button (new Rect (610, 10, 100, 50), "showtoolbar")) {
			ChameleonSDK.createAndShowToolBar(ChameleonSDK.ToolbarPosition.TOOLBAR_BOTTOM_LEFT);
		}

		if (GUI.Button (new Rect (710, 10, 100, 50), "hidetoolbar")) {
			ChameleonSDK.showFloatBar(ChameleonSDK.ToolbarPosition.TOOLBAR_BOTTOM_LEFT, false);
		}

	}

}
