using UnityEngine;
using System.Collections;

namespace chameleon {
public class ChameleonSDK : MonoBehaviour  {
		public enum ToolbarPosition {
			TOOLBAR_TOP_LEFT = 1,
			TOOLBAR_TOP_RIGHT = 2,
			TOOLBAR_MID_LEFT = 3, 
			TOOLBAR_MID_RIGHT = 4,
			TOOLBAR_BOTTOM_LEFT = 5,
			TOOLBAR_BOTTOM_RIGHT = 6
		}

		public class EventListener {
			/**
			 *  callback while the sdk is inited
			 */
			public virtual void onInit() {}
			/**
			 *  callback when the user login successfully
			 *  @param loginInfo, the login info string which can send to chameleon server directly
			 */ 
			public virtual void onLogin(string loginInfo) {}
			/**
			 *  user logined as a guest
			 */ 
			public virtual void onLoginGuest () {}
			/**
			 * user have login failed 
			 * @param code, the fail reason
			 */
			public virtual void onLoginFail(int code) {}
			/**
			 * user have registerd as a guest
			 * @param code, the regist result
			 * @param loginInfo, login info string which can send to chameleon server directly
			 */ 
			public virtual void onRegistGuest(int code, string loginInfo) {}
			/**
			 * while the user have finished paid
			 * @param code, the pay result
			 */
			public virtual void onPay(int code) {}
			/**
			 * resume from pause
			 */ 
			public virtual void onPause() {}
			/**
			 * responds from anti addiction
			 * @param flag, adult or not
			 */ 
			public virtual void onAntiAddiction(int flag) {}
			/**
			 * callback while the channel sdk is destroyed
			 */
			public virtual void onDestroyed() {}
			/**
			 * the User have switched account
			 * @param code, the switch account result
			 * @param loginInfo, login info string which can send to chameleon server directly
			 */ 
			public virtual void onSwitchAccount(int code, string loginInfo) {}
			/**
			 * while the user have logged out
			 */ 
			public virtual void onLogout(){}
			/**
			 * The user is about to switch account, you can save the user data now
			 */
			public virtual void preAccountSwitch(){}
			/**
			 * The guest user is bind to a valid user id
			 * @param loginInfo, login info string which can send to chameleon server directly
			 */
			public virtual void onGuestBind(string loginInfo){}
		}

		private static ChameleonBridge mBridge;


		/**
		 * login
		 */ 
		public static void login() {
			mBridge.callFunc ("login");
		}

		/**
		 * login as guest
		 */ 
		public static void loginGuest() {
			mBridge.callFunc ("loginGuest");
		}

		/**
		 * ask the guest user to bind to a valid user
		 */ 
		public static void registGuest(string tip) {
			mBridge.callFunc ("registGuest", tip);
		}

		/**
		 * buy the currency in game
		 * @param orderId the order id from server
     	 * @param uidInGame player id in the game 
     	 * @param userNameInGame  player name in the game
     	 * @param serverId  current server id
     	 * @param currencyName the currency name
     	 * @param payInfo the pay info got from chameleon server
     	 * @param rate the rate of the game currency to RMB, e.g. ￥1.0 can buy 10 game currency, then
     	 *             rate = 10
     	 * @param realPayMoney the real money to pay
     	 * @param allowUserChange can user change the amnout he paid
		 */ 
		public static void charge(string orderId, 
		                          string uidInGame,
		                          string userNameInGame,
		                          string serverId,
		                          string currencyName,
		                          string payInfo,
		                          int rate,
		                          int realPayMoney,
		                          bool allowUserChange) {
			mBridge.callFunc ("charge", orderId, uidInGame, userNameInGame,
			                          serverId, currencyName, payInfo, rate, realPayMoney, allowUserChange);
		}
		/**
     	 *  user buy a product
     	 * @param orderId the order id from server
     	 * @param uidInGame player id in the game
     	 * @param userNameInGame player name in the game
     	 * @param serverId  current server id
     	 * @param productName the name of the product
     	 * @param productID the id of the product
     	 * @param payInfo the pay info got from chameleon server
     	 * @param productCount the count of product
     	 * @param realPayMoney the real money to pay
     	*/
		public static void buy(string orderId, 
		                       string uidInGame,
		                       string userNameInGame,
		                       string serverId,
		                       string productName,
		                       string productId,
		                       string payInfo,
		                       int productCount,
		                       int realPayMoney) {
			mBridge.callFunc ("buy", orderId, uidInGame, userNameInGame,
			                          serverId, productName, productId, payInfo, productCount, realPayMoney);
		}
		/**
		 * user logout
		 */
		public static void logout() {
			mBridge.callFunc ("logout");
		}

		/**
		 * is current channel support switch account
		 */ 
		public static bool isSupportSwitchAccount() {
			return mBridge.callFunc<bool> ("isSupportSwitchAccount");
		}

		/**
		 * switch account
		 */ 
		public static void switchAccount() {
			mBridge.callFunc ("switchAccount");
		}

		/**
		 * create and show toolbar
		 * @param position, refer to ChamConstant.TOOLBAR*
		 */ 
		public static void createAndShowToolBar(ToolbarPosition position) {
			mBridge.callFunc ("createAndShowToolBar", (int)position);
		}

		/**
		 * show or hide float bar
		 * @param visible
		 */ 
		public static void showFloatBar(bool visible) {
			mBridge.callFunc ("showFloatBar", visible);
		}
		
		/**
		 * destroy toolbar
		 */ 
		public static void destroyToolBar() {
			mBridge.callFunc ("destroyToolBar");
		}

		public static void onPause() {
			mBridge.callFunc("onPause");
		}

		/**
		 * on resume
		 */ 
		public static void onResume() {
			mBridge.callFunc ("onResume"); 
		}

		/**
		 * Get anti addiction info 
		 * @param uid, user id
		 * @param accessToken, the session
		 */ 
		public static void antiAddiction() {
			mBridge.callFunc ("antiAddiction");
		}

		/**
		 * destroy the channel sdk
		 */ 
		public static void destroy() {
			mBridge.callFunc ("destroy");

		}

		/**
		 * get channel name
		 */ 
		public static string getChannelName() {
			return mBridge.callFunc<string> ("getChannelName");
		}

		/**
     	* get channel user id
     	* @return channel user id
     	*/
		public static string getUid() {
			return mBridge.callFunc<string>("getUid");
		}
		
		/**
     	* user have loggined or not
     	* @return true if the user have already logged in
     	*/
		public static bool isLogined() {
			return mBridge.callFunc<bool>("isLogined");
		}
		
		/**
    	 * get the token of this session
     	* @return the token of the channel
     	*/
		public static string getToken() {
			return mBridge.callFunc<string>("getToken");
		}
		
		/**
     	* get the pay token of this session
     	* @return the pay token of this channel
     	*/
		public static string getPayToken() {
			return mBridge.callFunc<string>("getPayToken");
		}
		
		/**
     	* feed the login rsp from the chameleon server to SDK
     	* @param rsp the login rsp from chameleon server
     	* @return
     	*/
		public static bool onLoginRsp(string rsp) {
			return mBridge.callFunc<bool>("onLoginRsp", rsp);
		}

		/**
		 * submit player info
		 * @param roleId role id in game
		 * @param roleName role name in game
		 * @param roleLevel role level in game
		 * @param zoneId zone id
		 * @param zoneName zone name
		 */
		public static void submitPlayerInfo(string roleId,
		                                    string roleName,
		                                    string roleLevel,
		                                    int zoneId,
		                                    string zoneName) {
			mBridge.callFunc ("submitPlayerInfo", roleId, roleName, roleLevel, zoneId, zoneName);
		}
		/**
		 * register the listener of the channel event
		 */
		public static void registerListener(ChameleonSDK.EventListener listener) {
			mBridge.registerListener (listener);
		}

		/**
		 * unregister the channel event
		 */ 
		public static void unregisterListener() {
			mBridge.unregisterListener ();
		}

		public void Awake() {
			Debug.Log (gameObject.name);
			mBridge = gameObject.AddComponent ("ChameleonBridge") as ChameleonBridge;
			mBridge.init ();
			GameObject.DontDestroyOnLoad (gameObject);
		}

	}
	
	
}
