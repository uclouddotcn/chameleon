/// <reference path="../user-events.d.ts" />

import crypto = require('crypto');
import restify = require('restify');
import querystring = require('querystring');
import _errorcode = require('../common/error-code');
import plugincommon = require('../common/plugin-common');

var ErrorCode = _errorcode.ErrorCode;

export interface CfgDesc {
    requestUri : string;
    appId : number;
    appKey : string;
    timeout ?: number;
}


export class Nd91Channel implements ChannelPlugin {
    private name: string;
    private cfg: CfgDesc;
    private userAction: UserAction;
    private logger: any;
    private client: restify.Client;

    constructor(name: string, 
                cfg: CfgDesc, 
                userAction: UserAction, 
                logger: any) {
        this.name = name;
        this.cfg = cfg;
        this.userAction = userAction;
        var timeout = cfg.timeout || 10;
        this.client = restify.createJsonClient({
            url: cfg.requestUri,
            retry: false,
            log: logger
        });
        this.logger = logger;
    }
    // start a request for verifing the login request to Channel 
    verifyLogin(token: string,
                others: string,
                callback: (err: any, result?: VerifyLoginResInf) => any) {
        var obj = JSON.parse(others);
        if (!obj.uin) {
            this.logger.error({others: others}, "uin is missing from others");
            return callback(new Error("can't find uin in other for nd91"));
        }
        var uin = obj.uin;
        var nick = obj.nick;
        var act = 4;
        var sign = calcVerifySessionSign(this.cfg.appId, act, obj.uin, 
                        token, this.cfg.appKey);
        var q = '/usercenter/AP.aspx?' + querystring.stringify({
            AppId: this.cfg.appId,
            Act: act,
            Uin: uin,
            SessionId: token,
            Sign: sign
        });
        
        this.client.get(q, 
            (err, req, res, obj) => {
                req.log.debug({req: req, err: err, obj: obj, q: q}, 'on result ');
                if (err) {
                    req.log.warn({err: err}, 'request error');
                    return callback(err);
                }  
                if (parseInt(obj.ErrorCode) === 1) {
                    var ret = new plugincommon.VerifyLoginRespond();
                    ret.code = 0;
                    ret.loginInfo = new plugincommon.UserLoginInfo();
                    ret.loginInfo.uid = uin;
                    ret.loginInfo.token = token;
                    ret.loginInfo.channel = this.name;
                    ret.loginInfo.name = nick;
                    return callback(null, ret);
                } else {
                    var ret = new plugincommon.VerifyLoginRespond();
                    ret.code = mapErrorCode(parseInt(obj.ErrorCode));
                    return callback(null, ret);
                }
            });
    }
    
    // get specific info of this channel
    getInfo() {
        return {
            appId: this.cfg.appId,
            appKey: this.cfg.appKey,
            requestUri: this.cfg.requestUri
        };
    }
    
    // get callback settings of the channel
    getChannelSubDir() {
        var payCallback = new plugincommon.ChannelSubUrls();
        payCallback.method = 'get';
        payCallback.path = 'pay';
        payCallback.callback = this.onPayCallback.bind(this);
        return [payCallback];
    }

    // reload cfg
    reloadCfg(cfg: any) {
        this.cfg= cfg;
        this.client = restify.createJsonClient({
            url: cfg.requestUri,
            retry: false,
            log: this.logger
        });
        return this;
    }

    private onPayCallback(req: restify.Request, 
                          res: restify.Response, 
                          next: restify.Next) {
        this.logger.debug({params: req.params}, 'recv pay callback');
        var params = req.params;
        // validates the appid
        if (parseInt(params.AppId) !== this.cfg.appId) {
            res.send(makeRes(2));
            return next();
        }
        // verify the sign
        var expectSign = calcPaySign(params, this.cfg.appKey);
        if (expectSign !== params.Sign) {
            res.send(makeRes(5));
            return next();
        }

        switch (params.Note) {
            case 'charge':
                this.userAction.charge(
                        this.name, 
                        params.Uin,
                        null,
                        params.CooOrderSerial,
                        parseInt(params.PayStatus),
                        parseInt(params.GoodsCount),
                        Math.floor(parseFloat(params.OrderMoney)*100),
                        {
                            createTime: params.CreateTime, 
                            consumeStreamId: params.ConsumeStreamId 
                        },
                        this.respondToPayCallback.bind(this, res, next)
                );
                break;
            case 'buy':
                this.userAction.buy(
                        this.name, 
                        params.Uin,
                        null,
                        params.CooOrderSerial,
                        parseInt(params.PayStatus),
                        params.GoodsId,
                        parseInt(params.GoodsCount),
                        Math.floor(parseFloat(params.OrderMoney)*100),
                        {
                            createTime: params.CreateTime, 
                            consumeStreamId: params.ConsumeStreamId 
                        },
                        this.respondToPayCallback.bind(this, res, next)
                );
                break;
            default:
                res.send(makeRes(4));
                next();
        }
        return;
    }

    private respondToPayCallback(res: restify.Response, 
                                 next: restify.Next,
                                 err: any, 
                                 result: any) {
        this.logger.debug({err: err, result: result}, 'respond pay');
        var code = 1;
        var msg = '';
        if (err) {
            code = 0;
            msg=  err.message;
            this.logger.warn({err: err}, 'fail to finish pay');
        }
        res.send(makeRes(code, msg));
        return next();
    }
}

function makeRes(errCode: number, errDesc?: string) : any{
    var desc = errDesc || "";
    return {ErrorCode: errCode.toString(), ErrorDesc: desc};
}

function calcPaySign(params: any, appKey: string) : string{
    var signStr = [params.AppId, params.Act, params.ProductName,
                   params.ConsumeStreamId, params.CooOrderSerial, 
                   params.Uin, params.GoodsId, params.GoodsInfo, 
                   params.GoodsCount, params.OriginalMoney,
                   params.OrderMoney, params.Note, params.PayStatus,
                   params.CreateTime, appKey].join('');
    signStr = signStr.toString();
    var md5sum = crypto.createHash('md5');
    md5sum.update(signStr, 'utf-8');
    return md5sum.digest('hex');
}

function calcVerifySessionSign(appId: number, 
                               act: number, 
                               uin: string, 
                               sessionId: string,
                               appKey: string): string {
    var signStr = [appId.toString(), act.toString(), uin, sessionId, appKey].join('');
    signStr = signStr.toString();
    var md5sum = crypto.createHash('md5');
    md5sum.update(signStr, 'utf-8');
    return md5sum.digest('hex');
}

function mapErrorCode(errorCode : number) : number {
    switch (errorCode) {
        case 1:
            return ErrorCode.ERR_OK;
        case 11:
            return ErrorCode.ERR_LOGIN_SESSION_INVALID;
        case 5:
            return ErrorCode.ERR_SIGN_NOT_MATCH;
        default:
            return ErrorCode.ERR_FAIL;
    }
}

export var name = 'nd91';
export var cfgDesc = {
    requestUri: 'string',
    appId: 'integer',
    appKey: 'string',
    timeout: '?integer'
}

export function create(name, cfgItem, userAction, logger) {
    return new Nd91Channel(name, cfgItem, userAction, logger);
}




