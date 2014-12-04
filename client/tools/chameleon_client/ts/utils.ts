
export enum ErrorCode {
    UNKNOWN = 1,
    SDK_PATH_ILLEGAL,
    OP_FAIL,
    CFG_ERROR
}

export interface CallbackFunc<T> {
    (err: ChameleonError, result?: T) : void;
}

export class Version {
    major: number;
    medium: number;
    minor: number;
    constructor(ver: string) {
        var t = ver.split('.');
        this.major = parseInt(t[0]);
        this.medium = parseInt(t[1]);
        if (t.length == 3) {
            this.minor = parseInt(t[2]);
        } else {
            this.minor = 0;
        }
    }

    cmp (that: Version): number {
        if (this.major > that.major) {
            return 1;
        } else if (this.major < that.major) {
            return -1;
        } else {
            if (this.medium < that.medium) {
                return -1;
            } else if (this.medium > that.medium) {
                return 1;
            } else {
                if (this.minor < that.minor) {
                    return -1;
                } else if (this.minor > that.minor){
                    return 1;
                } else {
                    return 0;
                }
            }

        }
    }

    isMajorUpgrade(that: Version) {
        return (this.major > that.major) || (this.major === that.major && this.medium > that.medium);
    }

    toString(): string {
        return this.major+'.'+this.medium+'.'+this.minor;
    }
}

export class ChameleonError implements Error {
    name:string;
    message:string;
    errCode:ErrorCode;

    constructor(code: ErrorCode, message = "", name = "") {
        this.name = name;
        this.message = message;
        this.errCode = code;
    }

    static newFromError (err: Error, code = ErrorCode.UNKNOWN): ChameleonError {
        console.log(err);
        var e = new ChameleonError(code);
        e.name = err.name;
        e.message = err.message;
        return e;
    }
}

