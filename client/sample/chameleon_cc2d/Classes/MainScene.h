#ifndef __MAIN_SCENE_H__
#define __MAIN_SCENE_H__

#include "cocos2d.h"
#include "cocos-ext.h"
#include <vector>

USING_NS_CC;
USING_NS_CC_EXT;
using namespace cocos2d::ui;
class MainScene : public cocos2d::CCLayer
{
public:
    MainScene(): m_isToolbarShown(false) {}
    ~MainScene() {
        RemoveHandles();
    }
    // Here's a difference. Method 'init' in cocos2d-x returns bool, instead of returning 'id' in cocos2d-iphone
    virtual bool init();  

    // there's no 'id' in cpp, so we recommend returning the class instance pointer
    static cocos2d::CCScene* scene();
    
    // implement the "static node()" method manually
    CREATE_FUNC(MainScene);
private:
    void Tick(float dt);
    void OnTouchSwitchAccount(CCObject *pSender, TouchEventType type);
    void OnTouchRegistGuest(CCObject *pSender, TouchEventType type);
    void OnTouchCharge(CCObject *pSender, TouchEventType type);
    void OnTouchBuy(CCObject *pSender, TouchEventType type);
    void OnTouchSwitchBar(CCObject *pSender, TouchEventType type);
    void OnTouchAntiAddiction(CCObject *pSender, TouchEventType type);
    void OnTouchLogout(CCObject *pSender, TouchEventType type);
    void FillUserInfo();
    void AddHandle(int event, int handle) {
        CallbackHandle h;
        h.event = event;
        h.handle = handle;
        mVecHandles.push_back(h);
    }
    void RemoveHandles();
    void onLogined(void * data);
    void onCharged(void * data);
    void onCharging(void * data);
    void onBuying(void * data);
    void onBought(void * data);
    void onAntiAddictionInfo(void * data);
    void onSwitchAccount(void * data);
    void onLogout(void * data);

    Layer * m_pLayer;
    Label * m_uinLabel;
    Label * m_sessionLabel;
    Label * m_userInfoLabel;
    Label * m_resultLabel;
    bool m_isToolbarShown;
    struct CallbackHandle {
        int event;
        int handle;
    };
    std::vector<CallbackHandle> mVecHandles;
    int mNextTickCount;
};

#endif // __HELLOWORLD_SCENE_H__

