#ifndef __HELLOWORLD_SCENE_H__
#define __HELLOWORLD_SCENE_H__

#include "cocos2d.h"
#include "cocos-ext.h"
#include <vector>

USING_NS_CC;
USING_NS_CC_EXT;
using namespace gui;

class HelloWorld : public cocos2d::CCLayer
{
public:
    ~HelloWorld();
    // Here's a difference. Method 'init' in cocos2d-x returns bool, instead of returning 'id' in cocos2d-iphone
    virtual bool init();  

    // there's no 'id' in cpp, so we recommend returning the class instance pointer
    static cocos2d::CCScene* scene();
    
    // a selector callback
    void menuCloseCallback(CCObject* pSender);
    
    // implement the "static node()" method manually
    CREATE_FUNC(HelloWorld);
private:
    void RemoveListener();
    void onLogined(void * data);
    void touchLoginGuest(CCObject *pSender, TouchEventType type);
    void touchLogin(CCObject *pSender, TouchEventType type);
    CCLabelTTF* mLabel;
    std::vector<int> mVecHandles;
};

#endif // __HELLOWORLD_SCENE_H__
