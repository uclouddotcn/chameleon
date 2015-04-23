#include "MainScene.h"

#include "UserAccountMgr.h"
#include "MainScene.h"
#include "UserAccountMgr.h"
#include "HelloWorldScene.h"
#include "cocostudio/CocoStudio.h"

USING_NS_CC;
USING_NS_CC_EXT;
using namespace cocos2d::ui;
using namespace std;
using namespace cocostudio;

static std::string FormatTxt(const char * format, ...) {
    char tmp[2048];
    tmp[2047] = '\0';
    va_list args;
    va_start(args, format);
    int n = vsnprintf(tmp, 2047, format, args);
    return tmp;
}

bool MainScene::init() {
    mNextTickCount = 0;
    //////////////////////////////
    // 1. super init first
    if ( !CCLayer::init() )
    {
        return false;
    }
    
    CCSize visibleSize = CCDirector::sharedDirector()->getVisibleSize();
    CCPoint origin = CCDirector::sharedDirector()->getVisibleOrigin();

    /////////////////////////////
    // 2. add a menu item with "X" image, which is clicked to quit the program
    //    you may modify it.

    // add a "close" icon to exit the progress. it's an autorelease object

    /////////////////////////////
    // 3. add your codes below...

    CCSize size = CCDirector::sharedDirector()->getWinSize(); 

    m_pLayer = Layer::create();
    addChild(m_pLayer);

    Layout* m_pLayout = dynamic_cast<Layout*>(GUIReader::shareReader()->widgetFromJsonFile("Welcome/Main.json"));

    m_pLayer->addChild(m_pLayout);

    m_uinLabel = dynamic_cast<Label*>(
      m_pLayer->getChildByName("Uin_Label"));

    m_sessionLabel = dynamic_cast<Label*>(
      m_pLayer->getChildByName("Session_Label"));
    
    m_userInfoLabel = dynamic_cast<Label*>(
      m_pLayer->getChildByName("UserInfo_Label"));

    m_resultLabel = dynamic_cast<Label*>(
      m_pLayer->getChildByName("Result_Label"));

    Button * btnSwitchAccount = dynamic_cast<Button*>(
      m_pLayer->getChildByName("SwitchAccount_Btn"));
    btnSwitchAccount->addTouchEventListener(this,
      toucheventselector(MainScene::OnTouchSwitchAccount));

    Button * btnRegistGuest = dynamic_cast<Button*>(
      m_pLayer->getChildByName("RegistGuest_Btn"));
    btnRegistGuest->addTouchEventListener(this,
      toucheventselector(MainScene::OnTouchRegistGuest));

    Button * btnCharge = dynamic_cast<Button*>(
      m_pLayer->getChildByName("Charge_Btn"));
    btnCharge->addTouchEventListener(this,
      toucheventselector(MainScene::OnTouchCharge));

    Button * btnBuy = dynamic_cast<Button*>(
      m_pLayer->getChildByName("Buy_Btn"));
    btnBuy->addTouchEventListener(this,
      toucheventselector(MainScene::OnTouchBuy));

    Button * btnSwitchBar = dynamic_cast<Button*>(
      m_pLayer->getChildByName("SwitchToolbar_Btn"));
    btnSwitchBar->addTouchEventListener(this,
      toucheventselector(MainScene::OnTouchSwitchBar));

    Button * btnAntiAddiction = dynamic_cast<Button*>(
      m_pLayer->getChildByName("AntiAddictin_Btn"));
    btnAntiAddiction->addTouchEventListener(this,
      toucheventselector(MainScene::OnTouchAntiAddiction));

    Button * btnLogout = dynamic_cast<Button*>(
      m_pLayer->getChildByName("Logout_Btn"));
    btnLogout->addTouchEventListener(this,
      toucheventselector(MainScene::OnTouchLogout));

    FillUserInfo();

    EventEmitter::CallbackFunctor_t loginFunc = 
      std::bind( &MainScene::onLogined, this, std::placeholders::_1);
    int handle = 
      g_userAccountMgr.AddListener(UserAccountMgr::EVENT_LOGINED, loginFunc);
    if (handle < 0) {
        CCLog("Fail to listening to logined event");
    } else {
        AddHandle(UserAccountMgr::EVENT_LOGINED, handle);
    }

    EventEmitter::CallbackFunctor_t charingFunc = 
      std::bind( &MainScene::onCharging, this, std::placeholders::_1);
    handle = 
      g_userAccountMgr.AddListener(UserAccountMgr::EVENT_CHARGING, charingFunc);
    if (handle < 0) {
        CCLog("Fail to listening to charging event");
    } else {
        AddHandle(UserAccountMgr::EVENT_CHARGING, handle);
    }

    EventEmitter::CallbackFunctor_t chargedFunc = 
      std::bind( &MainScene::onCharged, this, std::placeholders::_1);
    handle = 
      g_userAccountMgr.AddListener(UserAccountMgr::EVENT_CHARGED, chargedFunc);
    if (handle < 0) {
        CCLog("Fail to listening to charge event");
    } else {
        AddHandle(UserAccountMgr::EVENT_CHARGED, handle);
    }


    EventEmitter::CallbackFunctor_t buyingFunc = 
      std::bind( &MainScene::onBuying, this, std::placeholders::_1);
    handle = 
      g_userAccountMgr.AddListener(UserAccountMgr::EVENT_BUYING, buyingFunc);
    if (handle < 0) {
        CCLog("Fail to listening to buy event");
    } else {
        AddHandle(UserAccountMgr::EVENT_BUYING, handle);
    }

    EventEmitter::CallbackFunctor_t boughtFunc = 
      std::bind( &MainScene::onBought, this, std::placeholders::_1);
    handle = 
      g_userAccountMgr.AddListener(UserAccountMgr::EVENT_BOUGHT, boughtFunc);
    if (handle < 0) {
        CCLog("Fail to listening to buy event");
    } else {
        AddHandle(UserAccountMgr::EVENT_BOUGHT, handle);
    }

    EventEmitter::CallbackFunctor_t antiAddiction = 
      std::bind( &MainScene::onAntiAddictionInfo, this, std::placeholders::_1);
    handle = 
      g_userAccountMgr.AddListener(UserAccountMgr::EVENT_ANTI_ADDICTION_INFO, 
        antiAddiction);
    if (handle < 0) {
        CCLog("Fail to listening to anti addiction event");
    } else {
        AddHandle(UserAccountMgr::EVENT_ANTI_ADDICTION_INFO, handle);
    }

    EventEmitter::CallbackFunctor_t switchAccountFunc = 
      std::bind( &MainScene::onSwitchAccount, this, std::placeholders::_1);
    handle = 
      g_userAccountMgr.AddListener(UserAccountMgr::EVENT_SWITCH_ACCOUNT, 
        switchAccountFunc);
    if (handle < 0) {
        CCLog("Fail to listening to anti addiction event");
    } else {
        AddHandle(UserAccountMgr::EVENT_SWITCH_ACCOUNT, handle);
    }

    EventEmitter::CallbackFunctor_t logoutFunc = 
      std::bind( &MainScene::onLogout, this, std::placeholders::_1);
    handle = 
      g_userAccountMgr.AddListener(UserAccountMgr::EVENT_LOGOUT, 
        logoutFunc);
    if (handle < 0) {
        CCLog("Fail to listening to anti addiction event");
    } else {
        AddHandle(UserAccountMgr::EVENT_LOGOUT, handle);
    }

    this->schedule(schedule_selector(MainScene::Tick), 1, -1, 1);
    return true;
}

void MainScene::Tick(float dt) {
    CCLog("tick");
    if (mNextTickCount++ > 10) {
        g_userAccountMgr.HeartBeat();
        mNextTickCount = 0;
    }
}

void MainScene::onLogined(void * data) {
    FillUserInfo();
    m_resultLabel->setString("on logined");
}


cocos2d::CCScene* MainScene::scene() {
    // 'scene' is an autorelease object
    CCScene *scene = CCScene::create();
    
    // 'layer' is an autorelease object
    MainScene *layer = MainScene::create();

    // add layer as a child to scene
    scene->addChild(layer);

    // return the scene
    return scene;
}

void MainScene::FillUserInfo() {
    switch (g_userAccountMgr.GetLoginStatus() ) {
    case UserAccountMgr::LOGIN_STATUS_LOGOUT:
        m_uinLabel->setString("logout status");
        m_sessionLabel->setString("");
        m_userInfoLabel->setString("");
        break;
    case UserAccountMgr::LOGIN_STATUS_LOGINGUEST:
        m_uinLabel->setString("login as guest");
        m_sessionLabel->setString("");
        m_userInfoLabel->setString("");
        break;
    case UserAccountMgr::LOGIN_STATUS_LOGINED:
        m_uinLabel->setString(g_userAccountMgr.GetUin().c_str());
        m_sessionLabel->setString(g_userAccountMgr.GetSession().c_str());
        m_resultLabel->setString(g_userAccountMgr.GetUserInfo().c_str());
        break;
    default:
        m_resultLabel->setString("error while get login status");
    }
}

void MainScene::OnTouchSwitchAccount(CCObject *pSender, TouchEventType type) {
    switch (type)
    {
        case TOUCH_EVENT_ENDED:
            {
                if (!g_userAccountMgr.IsSupportSwitchAccount()) {
                    m_resultLabel->setString(
                      "current platform not support switching account");
                }

                int ret = g_userAccountMgr.SwitchAccount();
                if (ret == 0) {
                    m_resultLabel->setString(
                      "user switch acount, waiting for result");
                } else {
                    m_resultLabel->setString(
                      FormatTxt("Fail to switch account %d", ret));
                }
            }
            break;
    }
}

void MainScene::OnTouchRegistGuest(CCObject *pSender, TouchEventType type) {
    switch (type)
    {
        case TOUCH_EVENT_ENDED:
            {
                int ret = g_userAccountMgr.RegistGuest();
                if ( ret == 0) {
                    m_resultLabel->setString(
                      "user regist guest");
                } else {
                    m_resultLabel->setString(
                      FormatTxt("Fail to regist guest, %d", ret));
                }
            }
            break;
    }
}

void MainScene::OnTouchCharge(CCObject *pSender, TouchEventType type) {
    switch (type)
    {
        case TOUCH_EVENT_ENDED:
            {
                g_userAccountMgr.Charge(1000);
            }
            break;
    }
}

void MainScene::OnTouchBuy(CCObject *pSender, TouchEventType type) {
    switch (type)
    {
        case TOUCH_EVENT_ENDED:
            {
                g_userAccountMgr.Buy("product1", 1);
            }
            break;
    }
}

void MainScene::OnTouchSwitchBar(CCObject *pSender, TouchEventType type) {
    switch (type)
    {
        case TOUCH_EVENT_ENDED:
            {
                if (m_isToolbarShown) {
                    g_userAccountMgr.ShowToolBar();
                } else {
                    g_userAccountMgr.HideToolBar();
                }
                m_isToolbarShown = !m_isToolbarShown;
            }
            break;
    }
}

void MainScene::OnTouchAntiAddiction(CCObject *pSender, TouchEventType type) {
    switch (type)
    {
        case TOUCH_EVENT_ENDED:
            {
                g_userAccountMgr.GetAntiAddictionInfo();
            }
            break;
    }
}

void MainScene::OnTouchLogout(CCObject *pSender, TouchEventType type) {
    switch (type)
    {
        case TOUCH_EVENT_ENDED:
            {
                g_userAccountMgr.Logout();
            }
            break;
    }
}

void MainScene::RemoveHandles() {
    for (size_t i = 0; i < mVecHandles.size(); ++i) {
        g_userAccountMgr.RemoveListener(mVecHandles[i].event, 
          mVecHandles[i].handle);
    }
    mVecHandles.clear();
}

void MainScene::onCharged(void * data) {
    UserAccountMgr::ChargeResult & result = 
        *((UserAccountMgr::ChargeResult*)data);
    CCLog("main scene on charged");
    m_userInfoLabel->setString(FormatTxt("charge done, status=%d, order id is %s," 
          "amount=%d, total=%d", result.status, result.orderId.c_str(), 
          result.amount, result.total));
}

void MainScene::onCharging(void * data) {
    UserAccountMgr::ChargeInfo & result = *((UserAccountMgr::ChargeInfo*)data);
    m_resultLabel->setString(FormatTxt(
          "charge result, code is %d, user=%s : %s, realPayMoney=%d, rate=%d", 
          result.code, result.uidInGame.c_str(), result.userNameInGame.c_str(), 
          result.realPayMoney, result.rate));
}


void MainScene::onBought(void * data) {
    CCLog("main scene on bought");
    UserAccountMgr::BuyResult & result = 
        *((UserAccountMgr::BuyResult *)data);
    m_userInfoLabel->setString(FormatTxt("buy done, status=%d, productid=%s,"
          "order id is %s, amount=%d, total=%d", result.status, 
          result.productId.c_str(), result.orderId.c_str(), result.amount, 
          result.total));
}


void MainScene::onBuying(void * data) {
    UserAccountMgr::BuyInfo & result = *((UserAccountMgr::BuyInfo*)data);
    m_resultLabel->setString(FormatTxt(
          "charge result, code is %d, user=%s : %s, realPayMoney=%d", 
          result.code, result.uidInGame.c_str(), result.userNameInGame.c_str(), 
          result.realPayMoney));
}

void MainScene::onAntiAddictionInfo(void * data) {
    int & flag = *((int*)data);
    m_resultLabel->setString(FormatTxt("anti addiction, code is %d", flag));
}

void MainScene::onSwitchAccount(void * data) {
    int & flag = *((int*)data);
    m_resultLabel->setString(FormatTxt("switch account, code is %d", flag));
}

void MainScene::onLogout(void * data) {
    CCLog("on logout from main scene");
    FillUserInfo();
    m_resultLabel->setString("user logout");
    RemoveHandles();
    CCScene* pScene = HelloWorld::createScene(); 
    CCDirector::sharedDirector()->replaceScene( pScene );
}


