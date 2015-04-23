#include "HelloWorldScene.h"
#include "cocostudio/CocoStudio.h"
#include "ui/CocosGUI.h"
#include "cocos-ext.h"
#include "UserAccountMgr.h"
#include "EventEmitter.h"
#include "MainScene.h"

USING_NS_CC;

using namespace cocostudio::timeline;
using namespace cocos2d::ui;


Scene* HelloWorld::createScene()
{
    // 'scene' is an autorelease object
    auto scene = Scene::create();
    
    // 'layer' is an autorelease object
    auto layer = HelloWorld::create();

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
    if ( !Layer::init() )
    {
        return false;
    }
    
    auto rootNode= CSLoader::createNode("MainScene.csb");

    addChild(rootNode);

    ui::Button* loginButton = 
		dynamic_cast<ui::Button*>(rootNode->getChildByName("Login_btn"));
	loginButton->addTouchEventListener(this, 
		toucheventselector(HelloWorld::touchLogin));

    ui::Button* loginGuestButton = 
		dynamic_cast<ui::Button*>(rootNode->getChildByName("LoginGuest_btn"));
	loginGuestButton->addTouchEventListener(this,
		toucheventselector(HelloWorld::touchLoginGuest));

    EventEmitter::CallbackFunctor_t func = 
      std::bind( &HelloWorld::onLogined, this, std::placeholders::_1);
    int handle = 
      g_userAccountMgr.AddListener(UserAccountMgr::EVENT_LOGINED, func);
    if (handle < 0) {
        cocos2d::log("Fail to listening to logined event");
    } else {
        mVecHandles.push_back(handle);
    }

    handle = 
      g_userAccountMgr.AddListener(UserAccountMgr::EVENT_LOGIN_GUEST, func);
    if (handle < 0) {
        cocos2d::log("Fail to listening to logined event");
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


void HelloWorld::onLogined(void * data) {
    cocos2d::log("on logined");
     
    RemoveListener();
    Scene* pScene = MainScene::scene(); 
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

