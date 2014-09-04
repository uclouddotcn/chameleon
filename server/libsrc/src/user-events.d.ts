/// <reference path="./node.d.ts" />
/// <reference path="./restify.d.ts" />

interface VerifyLoginResInf {
    // the return code
    code: number;
    // user login info
    loginInfo: UserLoginInfoInf;
}

interface UserLoginInfoInf {
    uid: string;
    token: string;
    channel: string;
    name: string;
    avartar: string;
    expire_in: number;
    others: string;
}

interface ChannelSubUrlsInf {
    method: string; // 'post' or 'get'
    path: string; // sub path for the payment callback
    callback: Function; // payment callback function
}




interface PayRespond {
    code: number;
}

// payment callback function prototype
interface PayCallback {
    (err: any, result?: PayRespond): any;
}

interface UserAction {
    // verify login request
    verifyUserLogin: (channel: string, 
                      token: string, 
                      others: string, 
                      callback: (err: any, result?: VerifyLoginResInf) => any) => any;
    
    // charge request
    charge: (channel: string,
             uid: string,
             appUid: string,
             cpOrderId: string,
             payStatus: number,
             currencyCount: number, 
             realPayMoney: number,
             other: Object,
             callback: PayCallback) => any;

    buy: (channel: string,
          uid: string,
          appUid: string,
          cpOrderId: string,
          payStatus: number,
          productId: string,
          productCount: number,
          realPayMoney: number,
          other: Object,
          callback: PayCallback) => any;
}

// interface for the channel plugins
interface ChannelPlugin {
    // start a request for verifing the login request to channel 
    verifyLogin: (token: string,
                  others: string,
                  callback?: (err: any, result: VerifyLoginResInf) => any) => any;
    
    // get specific info of this channel
    getInfo: () => any;
    
    // get callback settings of the channel
    getChannelSubDir: () => ChannelSubUrlsInf[];

    // reload cfg
    reloadCfg: (any) => any;
}

interface ModuleExports {
    name: string;
    cfgDesc: Object;
    create: (name: string, cfgItem: Object, userAction: UserAction, logger: any) => ChannelPlugin;
}




