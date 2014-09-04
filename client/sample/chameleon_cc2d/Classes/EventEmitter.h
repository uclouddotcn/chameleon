#ifndef __EventEmitter_H_
#define __EventEmitter_H_

#include <vector>
#include <functional>

class EventEmitter {
public:
    typedef std::function< void(void *) > CallbackFunctor_t;
public:
    void Init(int eventNum);
    int AddListener(int eventType, CallbackFunctor_t);
    void RemoveListener(int eventType, int handle);
    void FireEvent(int eventType, void * data);
private:
    typedef std::vector<CallbackFunctor_t> SingleEventCallbacks_t;
    typedef std::vector< SingleEventCallbacks_t > EventCallbacks_t;
    EventCallbacks_t mEventCbs;
};

#endif //__EventEmitter_H_
