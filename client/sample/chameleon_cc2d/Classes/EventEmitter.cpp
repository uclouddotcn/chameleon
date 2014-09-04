#include "EventEmitter.h"
#include <stdlib.h>
#include "cocos2d.h"
USING_NS_CC;

void EventEmitter::Init(int eventNum) {
    mEventCbs.clear();
    mEventCbs.resize(eventNum);
}


int EventEmitter::AddListener(int eventType, EventEmitter::CallbackFunctor_t cb) {
    if (eventType < 0 || eventType >= mEventCbs.size()) {
        return -1;
    }
    int handle = -1;
    for (size_t i = 0; i < mEventCbs[eventType].size(); ++i) {
        if (!mEventCbs[eventType][i]) {
            handle = i;
            mEventCbs[eventType][i] = cb;
            break;
        }
    }
    if (handle == -1) {
        handle = mEventCbs[eventType].size();
        mEventCbs[eventType].push_back(cb);
    }
    return handle;
}

void EventEmitter::RemoveListener(int eventType, int handle) {
    CCLog("try remove listener %d %d", eventType, handle);
    if (handle < 0 || eventType < 0 || eventType >= mEventCbs.size()) {
        return;
    }
    if (handle > mEventCbs[eventType].size()) {
        return;
    }
    CCLog("remove listener %d %d", eventType, handle);
    mEventCbs[eventType][handle] = CallbackFunctor_t();
}

void EventEmitter::FireEvent(int eventType, void * data) {
    const SingleEventCallbacks_t & cbArray =  mEventCbs[eventType];
    for (size_t i = 0; i < cbArray.size(); ++i) {
        if (cbArray[i]) {
            CCLog("call listener %d %d", eventType, i);
            cbArray[i](data);
        }
    }
}


