#ifndef __HELLOWORLD_SCENE_H__
#define __HELLOWORLD_SCENE_H__

#include <cocos2d.h>
#include "ui/CocosGUI.h"
#include "cocos-ext.h"

USING_NS_CC;
using namespace cocos2d::ui;

class HelloWorld : public cocos2d::Layer
{
public:
    // there's no 'id' in cpp, so we recommend returning the class instance pointer
    static cocos2d::Scene* createScene();

    // Here's a difference. Method 'init' in cocos2d-x returns bool, instead of returning 'id' in cocos2d-iphone
    virtual bool init();

    // implement the "static create()" method manually
    CREATE_FUNC(HelloWorld);
	~HelloWorld();
private:
    void RemoveListener();
    void onLogined(void * data);
    void touchLoginGuest(Ref *pSender, TouchEventType type);
    void touchLogin(Ref *pSender, TouchEventType type);
    LabelTTF* mLabel;
    std::vector<int> mVecHandles;
};

#endif // __HELLOWORLD_SCENE_H__
