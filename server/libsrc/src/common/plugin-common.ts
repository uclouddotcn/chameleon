/// <reference path="../user-events.d.ts" />

export class VerifyLoginRespond implements VerifyLoginResInf {
    // the return code
    code: number;
    // user login info
    loginInfo: UserLoginInfo;
}

export class UserLoginInfo implements UserLoginInfoInf {
    uid: string;
    token: string;
    channel: string;
    name: string;
    avartar: string;
    expire_in: number;
    others: string;
}

export class ChannelSubUrls implements ChannelSubUrlsInf {
    method: string; // 'post' or 'get'
    path: string; // sub path for the payment callback
    callback: Function; // payment callback function
}



