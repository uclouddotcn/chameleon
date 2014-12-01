using UnityEngine;
using System.Collections;
using chameleon;

public class GUIInit : MonoBehaviour {
	private static string logList = "";
	private Vector2 scrollPosition;
	public class Listener : ChameleonSDK.EventListener {
		private MonoBehaviour owner;
		public Listener(MonoBehaviour owner) {
			this.owner = owner;
		}
		public override void onInit(int code) 
		{
			logList += string.Format("初始化结果: {0} 渠道名{1}\n", code, ChameleonSDK.getChannelName());
			ChameleonSDK.login ();
		}
		public override void onLogin(string loginInfo) {
			logList += string.Format("登陆成功: {0}. 开始服务器验证\n", loginInfo);
			this.owner.StartCoroutine (requestLogin (loginInfo)); 
		}

		public override void onLoginGuest () {
			logList += string.Format("游客登陆成功\n");
		}

		public override void onLoginFail(int code) {
			logList += string.Format("登陆失败： {0}\n", code);
		}

		public override void onRegistGuest(int code, string loginInfo) {
			logList += string.Format("注册游客结果： {0} {1}\n", code, loginInfo);
			if (code == (int)ChamConstant.ErrorCode.ERR_OK) {
				this.owner.StartCoroutine (requestLogin (loginInfo)); 
			}
		}
		public override void onPay(int code) {
			logList += string.Format("发起支付结果： {0}. 查看服务器具体的支付结果\n", code);
		}
		public override void onPause() {
			logList += string.Format("从暂停中回来了\n");
		}
		public override void onAntiAddiction(int flag) {
			logList += string.Format("防沉迷结果: {0}\n", flag);
		}
		public override void onDestroyed(int code) {
			logList += string.Format("退出结果: {0}\n", code);
			if (code == (int)ChamConstant.ErrorCode.ERR_OK)
								Application.Quit ();
		}
		public override void onSwitchAccount(int code, string loginInfo) {
			logList += string.Format("切换用户结果: {0}\n", code, loginInfo);
			if (code == (int)ChamConstant.ErrorCode.ERR_OK) {
				this.owner.StartCoroutine (requestLogin (loginInfo)); 
			} 
		}
		public override void onLogout(){
			logList += string.Format("退出登陆\n");
		}
		public override void preAccountSwitch(){
			logList += "开始切换账号\n";
			
		}
		public override void onGuestBind(string loginInfo){
			logList += string.Format ("游客绑定: {0}", loginInfo);
			this.owner.StartCoroutine (requestLogin (loginInfo)); 
		}

		private static IEnumerator requestLogin(string loginInfo) {
			Hashtable data = (Hashtable)JSON.JsonDecode (loginInfo);
			Debug.Log (string.Format("receive login info: {0} {1}", loginInfo, data));
			HTTP.Request req = new HTTP.Request("post", "http://118.192.73.182:8080/sdkapi/login", data);
			req.Send ();
			while (!req.isDone) {
				yield return null;
			}
			logList += string.Format ("服务器获取信息 {0}", req.response.Text);
			if (ChameleonSDK.onLoginRsp(req.response.Text)) {
				logList += string.Format("成功验证登陆\n");
				logList += string.Format("玩家登陆成功: ID: {0}, TOKEN: {1}, Channel: {2}\n", ChameleonSDK.getUid(), ChameleonSDK.getToken(), ChameleonSDK.getChannelName());
			} else {
				logList += string.Format("登陆失败\n");
			}

		}
	}


	// Use this for initialization
	void Start () {
		Debug.Log ("GUI init start");
		ChameleonSDK.init (new Listener(this));
	}
	
	// Update is called once per frame
	void Update () {

	}

	private IEnumerator requestLogin(string loginInfo) {
		Hashtable data = (Hashtable)JSON.JsonDecode (loginInfo);
		HTTP.Request req = new HTTP.Request("post", "http://118.192.73.182:8080", data);
		req.Send ();
		while (!req.isDone) {
			yield return null;
		}
		if (ChameleonSDK.onLoginRsp(req.response.Text)) {
			logList += string.Format("成功验证登陆\n");
			ChameleonSDK.submitPlayerInfo("游戏中用户ID",
			                              "游戏中用户名字",
			                              "游戏中用户等级",
			                              1, // 大区编号
			                              "大区名字" // 注意一定要是选区页面中名字一致
			                              );
		} else {
			logList += string.Format("登陆失败\n");
		}
	}


	void OnGUI () {
		if (GUI.Button (new Rect (10, 10, 100, 50), "登陆")) {
			logList += "开始登陆\n";
			ChameleonSDK.login();
		}

		if (GUI.Button (new Rect (110, 10, 100, 50), "游客登陆")) {
			if (ChameleonSDK.isSupportSwitchAccount()) 
			{
				logList += "这个渠道不支持游客登陆, 所以走正常的登陆";
			} 
			else 
			{
				logList += "开始游客登陆\n";
			}
			ChameleonSDK.loginGuest();
		}

		if (GUI.Button (new Rect (210, 10, 100, 50), "切换账户")) {
			logList += "开始切换账户\n";
			ChameleonSDK.switchAccount();
		}

		if (GUI.Button (new Rect (310, 10, 100, 50), "反沉迷查询")) {
			logList += "开始获取防沉迷\n";
			ChameleonSDK.antiAddiction();
		}

		if (GUI.Button (new Rect (410, 10, 100, 50), "充值")) {
			logList += "开始充值\n";
			this.StartCoroutine(startCharge());
		}
		
		if (GUI.Button (new Rect (10, 60, 100, 50), "购买")) {
			logList += "开始购买\n";
			this.StartCoroutine(startBuy());
		}

		if (GUI.Button (new Rect (110, 60, 100, 50), "展示工具条")) {
			logList += "开始显示toolbar\n";
			ChameleonSDK.createAndShowToolBar(ChameleonSDK.ToolbarPosition.TOOLBAR_BOTTOM_LEFT);
		}

		if (GUI.Button (new Rect (210, 60, 100, 50), "隐藏工具条")) {
			logList += "开始隐藏toolbar\n";
			ChameleonSDK.showFloatBar( false);
		}
		if (GUI.Button (new Rect (310, 60, 100, 50), "退出游戏")) {
			logList += "开始退出\n";
			ChameleonSDK.destroy();
		}
		if (GUI.Button (new Rect (410, 60, 100, 50), "退出账户")) {
			logList += "退出账户\n";
			ChameleonSDK.logout(); // 主动出发退出，是不会有回调的 
		}

		GUILayout.BeginArea (new Rect (10, 100, 800, 400));
		scrollPosition = GUILayout.BeginScrollView (scrollPosition, GUILayout.Width (700), GUILayout.Height(400));
		GUILayout.Label (logList);
		GUILayout.EndScrollView ();
		GUILayout.EndArea ();
	}

	private IEnumerator startBuy() {
		var postData = new Hashtable ();
		var productCount = 100;
		postData.Add ("token", ChameleonSDK.getPayToken());
		postData.Add ("productId", "你的商品ID");
		postData.Add ("uid", ChameleonSDK.getUid());
		postData.Add ("productName", "你的商品名称");
		postData.Add ("count", productCount);
		postData.Add ("productDesc", "你的商品描述");

		HTTP.Request req = new HTTP.Request("post", "http://118.192.73.182:8080/sdkapi/buy", postData);
		req.Send ();
		while (!req.isDone) {
			yield return null;
		}
		if (req.response.status != 200) {
			logList += string.Format("请求错误: {0} {1}", req.response.status, req.response.message);
		} else {
			Debug.Log ("recv from server " + req.response.Text);
			Hashtable payInfo = (Hashtable)JSON.JsonDecode(req.response.Text);
			if ((int)payInfo["code"] == (int)ChamConstant.ErrorCode.ERR_OK) {
				string info = (string)payInfo["payInfo"];
				string orderId = (string)payInfo["orderId"];
				int money = (int)payInfo["realPayMoney"];
				logList += string.Format("获取支付信息成功: orderId {0} -- payinfo {1}\n", orderId, info);
				logList += string.Format("开始正式支付");
				ChameleonSDK.buy (orderId,
							      "USER ID IN GAME",
				                  "USER NAME IN GAME",
				                  "SERVER ID",
				                  "你的商品名称",
				                  "你的商品ID",
				                  info,
				                  productCount,
				                  money);
			}
			else 
			{
				logList += "无法获取支付信息: " + payInfo["code"] + "\n";
			}
		}

	}

	private IEnumerator startCharge() {
		var postData = new Hashtable ();
		var productCount = 10;
		postData.Add ("token", ChameleonSDK.getPayToken());
		postData.Add ("uid", ChameleonSDK.getUid());
		postData.Add ("count", productCount);
		
		HTTP.Request req = new HTTP.Request("post", "http://118.192.73.182:8080/sdkapi/charge", postData);
		req.Send ();
		while (!req.isDone) {
			yield return null;
		}
		if (req.response.status != 200) {
			logList += string.Format("请求错误: {0} {1}", req.response.status, req.response.message);
		} else {
			Hashtable payInfo = (Hashtable)JSON.JsonDecode(req.response.Text);
			if ((int)payInfo["code"] == (int)ChamConstant.ErrorCode.ERR_OK) {
				string info = (string)payInfo["payInfo"];
				string orderId = (string)payInfo["orderId"];
				logList += string.Format("获取支付信息成功: orderId {0} -- payinfo {1}\n", orderId, info);
				logList += string.Format("开始正式支付");
				ChameleonSDK.charge (
					orderId,
					"USER ID IN GAME",
				    "USER NAME IN GAME",
				    "SERVER ID",
				    "你的代币名称",
					info,
					(int)payInfo["ratio"],
					(int)payInfo["realPayMoney"],
					true);
				               
			}
			else 
			{
				logList += "无法获取支付信息: " + payInfo["code"] + "\n";
			}
		}
		
	}
}
