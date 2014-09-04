#ifndef __JsonHttpClient_H_
#define __JsonHttpClient_H_

#include <functional>
#include <string>
#include <vector>
#include "cocos-ext.h"
#include "cocos2d.h"

USING_NS_CC;
USING_NS_CC_EXT;


class JsonHttpClient : public CCObject {
public:
    struct RequestParam {
        RequestParam() {}
        RequestParam(const char * n, 
                     const char * v):
        name(n), value(v)
        {
        }
        std::string name;
        std::string value;
    };
    typedef std::vector<RequestParam> ReqParams;
    typedef std::function<void (int, rapidjson::Value *, JsonHttpClient*, const std::string & body)> ResponseFunc_t;
    JsonHttpClient();
    ~JsonHttpClient();

    int post( const char * url,
              const ReqParams * postData,
              std::vector<std::string> * customHeader,
              ResponseFunc_t func);

    int get( const char * url,
             const ReqParams * req,
             std::vector<std::string> * customHeader,
             ResponseFunc_t func);

    int post( const char * url,
              const std::string & data,
              std::vector<std::string> * customHeader,
              ResponseFunc_t func);
private:
    JsonHttpClient(const JsonHttpClient&) = delete;
    JsonHttpClient & operator=(JsonHttpClient& obj) = delete;
private:
    void CallbackForClient(CCHttpClient* client, CCHttpResponse* response);
    CCHttpRequest * mReq;
    ResponseFunc_t mFunc;
};

class JsonHttpClientWrapper {
public:
    template <class T>
    static void Destroy(void * p) {
        delete (T*)p;
    }

    typedef std::function< void(void*) > DestroyFunc;

    JsonHttpClientWrapper() {
        mClient = new JsonHttpClient;
        mData = NULL;
    }

    ~JsonHttpClientWrapper() {
        delete mClient;
        if (mData != NULL && mFunc) {
            mFunc(mData);
        }
    }

    JsonHttpClient * Client() {
        return mClient;
    }

    JsonHttpClientWrapper(JsonHttpClientWrapper&& obj) {
        *this = std::move(obj);
    }

    JsonHttpClientWrapper & operator=(JsonHttpClientWrapper&& obj) {
        this->mClient = obj.mClient;
        this->mFunc = obj.mFunc;
        this->mData = obj.mData;
        obj.mClient = NULL;
        obj.mData = NULL;
    }

    void SetData(void * data, DestroyFunc && func) {
        mData = data;
        mFunc = func;
    }

    void SetData(void * data, DestroyFunc * func = NULL ) {
        mData = data;
        if (func) {
            mFunc = *func;
        }
    }
    void ResetData() {
        mData = NULL;
        mFunc = DestroyFunc();
    }

    template<typename T>
    T * Data() {
        return (T*)(mData);
    }
private:
    JsonHttpClientWrapper(const JsonHttpClientWrapper&) = delete;
    JsonHttpClientWrapper & operator=(JsonHttpClientWrapper& obj) = delete;
private:
    JsonHttpClient * mClient;
    void * mData; 
    DestroyFunc mFunc;
};


#endif //__JsonHttpClient_H_
