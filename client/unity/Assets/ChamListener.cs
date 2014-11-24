using UnityEngine;
using System.Collections;
using chameleon;

public class ChamListener : MonoBehaviour {
	private string mUin;
	private string mToken;

	void Awake() {

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
