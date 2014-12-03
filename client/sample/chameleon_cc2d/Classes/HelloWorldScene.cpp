#include "HelloWorldScene.h"

#include "cocos-ext.h"
#include "UserAccountMgr.h"
#include "MainScene.h"


CCScene* HelloWorld::scene()
{
    // 'scene' is an autorelease object
    CCScene *scene = CCScene::create();
    
    // 'layer' is an autorelease object
    HelloWorld *layer = HelloWorld::create();

    // add layer as a child to scene
    scene->addChild(layer);

    // return the scene
    return scene;
}

// on "init" you need to initialize your instance
bool HelloWorld::init()
{
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
    CCMenuItemImage *pCloseItem = CCMenuItemImage::create(
                                        "CloseNormal.png",
                                        "CloseSelected.png",
                                        this,
                                        menu_selector(HelloWorld::menuCloseCallback));
    
	pCloseItem->setPosition(ccp(origin.x + visibleSize.width - pCloseItem->getContentSize().width/2 ,
                                origin.y + pCloseItem->getContentSize().height/2));

    // create menu, it's an autorelease object
    CCMenu* pMenu = CCMenu::create(pCloseItem, NULL);
    pMenu->setPosition(CCPointZero);
    this->addChild(pMenu, 1);

    /////////////////////////////
    // 3. add your codes below...

    CCSize size = CCDirector::sharedDirector()->getWinSize(); 

    UILayer* m_pLayer = UILayer::create();
    addChild(m_pLayer);

    UILayout* m_pLayout = dynamic_cast<UILayout*>(GUIReader::shareReader()->widgetFromJsonFile("Welcome/Welcome.json"));

    m_pLayer->addWidget(m_pLayout);

    UIButton* loginButton = 
      dynamic_cast<UIButton*>(m_pLayer->getWidgetByName("Login_btn"));
    loginButton->addTouchEventListener(this, 
      toucheventselector(HelloWorld::touchLogin));

    UIButton* loginGuestButton = 
      dynamic_cast<UIButton*>(m_pLayer->getWidgetByName("LoginGuest_btn"));
    loginGuestButton->addTouchEventListener(this, 
      toucheventselector(HelloWorld::touchLoginGuest));

    EventEmitter::CallbackFunctor_t func = 
      std::bind( &HelloWorld::onLogined, this, std::placeholders::_1);
    int handle = 
      g_userAccountMgr.AddListener(UserAccountMgr::EVENT_LOGINED, func);
    if (handle < 0) {
        CCLog("Fail to listening to logined event");
    } else {
        mVecHandles.push_back(handle);
    }

    handle = 
      g_userAccountMgr.AddListener(UserAccountMgr::EVENT_LOGIN_GUEST, func);
    if (handle < 0) {
        CCLog("Fail to listening to logined event");
    } else {
        mVecHandles.push_back(handle);
    }
    g_userAccountMgr.Init();
    return true;
}

void HelloWorld::touchLogin(CCObject *pSender, TouchEventType type) {
    switch (type)
    {
        case TOUCH_EVENT_BEGAN:
            break;
            
        case TOUCH_EVENT_MOVED:
            break;
            
        case TOUCH_EVENT_ENDED:
            {
                g_userAccountMgr.Login();
            }
            break;
            
        case TOUCH_EVENT_CANCELED:
            break;
            
        default:
            break;
    }
}

void HelloWorld::touchLoginGuest(CCObject *pSender, TouchEventType type) {
    switch (type)
    {
        case TOUCH_EVENT_BEGAN:
            break;
            
        case TOUCH_EVENT_MOVED:
            break;
            
        case TOUCH_EVENT_ENDED:
            {
                g_userAccountMgr.LoginGuest();
            }
            break;
            
        case TOUCH_EVENT_CANCELED:
            break;
            
        default:
            break;
    }
}

void HelloWorld::menuCloseCallback(CCObject* pSender)
{
    g_userAccountMgr.exit();
}


void HelloWorld::onLogined(void * data) {
    CCLog("on logined");
     
    RemoveListener();
    CCScene* pScene = MainScene::scene(); 
    CCDirector::sharedDirector()->replaceScene( pScene );
}

HelloWorld::~HelloWorld() {
    RemoveListener();
}

void HelloWorld::RemoveListener() {
    g_userAccountMgr.RemoveListener(
      UserAccountMgr::EVENT_LOGINED, mVecHandles[0]);
    g_userAccountMgr.RemoveListener(
      UserAccountMgr::EVENT_LOGIN_GUEST, mVecHandles[1]);
    mVecHandles.clear();
}

