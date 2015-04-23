#include "JsonHttpClient.h"

#include <algorithm>

#include "curl/curl.h"
#include "network/HttpClient.h"
#include "network/HttpRequest.h"
#include "network/HttpResponse.h"

USING_NS_CC;
USING_NS_CC_EXT;
using namespace std;

JsonHttpClient::JsonHttpClient():
mReq(NULL) {

}

JsonHttpClient::~JsonHttpClient() {
    if (mReq) {
        mReq->setResponseCallback(NULL, httpresponse_selector(JsonHttpClient::CallbackForClient));
    }
    mReq = NULL;
}


int JsonHttpClient::post( const char * url,
                          const ReqParams * postData,
                          std::vector<std::string> * customHeader,
                          ResponseFunc_t func) {

    auto req = new HttpRequest;
    req->setRequestType(HttpRequest::Type::POST);
    req->setUrl(url);
    if (postData != NULL && postData->size() > 0) {
        CURL * curl = curl_easy_init();
        std::string tmp;
        tmp.reserve(1024);
        bool isOK = true;
        for (size_t i = 0; i < postData->size(); ++i) {
            tmp += (*postData)[i].name;
            tmp += "=";
            char * encodedParam = curl_easy_escape(curl, 
              (*postData)[i].value.c_str(), (*postData)[i].value.size());
            if (encodedParam == NULL) {
                isOK = false;
                cocos2d::log("fail to url encode params");
                break;
            } else {
                tmp += encodedParam;
                curl_free(encodedParam );
            }
            tmp += "&";
        }
        if (isOK) {
            cocos2d::log("post %s", tmp.c_str());
            req->setRequestData(tmp.c_str(), tmp.size()-1);
            curl_easy_cleanup(curl);
        } else {
            curl_easy_cleanup(curl);
            return -1;
        }
    }
    req->setResponseCallback(this, 
      httpresponse_selector(JsonHttpClient::CallbackForClient));
    if (customHeader) {
        req->setHeaders(*customHeader);
    }
    HttpClient::getInstance()->send(req);
    mReq = req;
    mFunc = func;
    return 0;
}

int JsonHttpClient::post( const char * url,
                          const std::string & postData,
                          std::vector<std::string> * customHeader,
                          ResponseFunc_t func) {

    auto req = new HttpRequest;
    req->setRequestType(HttpRequest::Type::POST);
    req->setUrl(url);
    req->setRequestData(postData.c_str(), postData.size());
    req->setResponseCallback(this, 
      httpresponse_selector(JsonHttpClient::CallbackForClient));
    if (customHeader) {
        req->setHeaders(*customHeader);
    }
    HttpClient::getInstance()->send(req);
    mReq = req;
    mFunc = func;
    return 0;
}



int JsonHttpClient::get( const char * url,
                         const ReqParams * reqParams,
                         std::vector<std::string> * customHeader,
                         ResponseFunc_t func) {

    auto req = new HttpRequest;
    req->setRequestType(HttpRequest::Type::GET);
    std::string tmp;
    tmp.reserve(1024);
    tmp += url;
    if (reqParams != NULL && reqParams->size() > 0) {
        tmp += '?';
        CURL * curl = curl_easy_init();
        bool isOK = true;
        for (size_t i = 0; i < reqParams->size(); ++i) {
            tmp += (*reqParams)[i].name;
            tmp += "=";
            char * encodedParam = curl_easy_escape(curl, 
              (*reqParams)[i].value.c_str(), (*reqParams)[i].value.size());
            if (encodedParam == NULL) {
                isOK = false;
                cocos2d::log("fail to url encode params");
                break;
            } else {
                tmp += encodedParam;
                curl_free(encodedParam );
            }
            tmp += "&";
        }
        if (!isOK) {
            return -1;
        }
    }
    cocos2d::log("get url %s", tmp.substr(0, tmp.size()-1).c_str());
    req->setUrl(tmp.substr(0, tmp.size()-1).c_str());
    req->setResponseCallback(this, 
      httpresponse_selector(JsonHttpClient::CallbackForClient));
    if (customHeader) {
        req->setHeaders(*customHeader);
    }
    HttpClient::getInstance()->send(req);
    mReq = req;
    mFunc = func;
    return 0;
}

void JsonHttpClient::CallbackForClient(HttpClient* client, 
                                       HttpResponse* response) {
    cocos2d::log("recv callback");
    if (response == NULL) {
        mFunc(-1, NULL, this, "");
        return;
    }
    if (response->getResponseCode() != 200) {
        cocos2d::log("recv callback code %d", response->getResponseCode());
        mFunc(response->getResponseCode(), NULL, this, "");
        return;
    }
    rapidjson::Document d;
    std::string body(response->getResponseData()->data(), 
      response->getResponseData()->size());

    cocos2d::log("recv callback body %s", body.c_str());
    d.Parse<0>(body.c_str());
    if (d.HasParseError()) {
        cocos2d::log("parse json error %s", d.GetParseError());
        mFunc(-2, NULL, this, "");
        return; 
    }
    cocos2d::log("succeeded to parse json");
    // this function may destroy current instance, so it must the 
    // last clause
    mFunc(200, &d, this, body);
}


