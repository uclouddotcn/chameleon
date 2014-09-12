///<reference path="node.d.ts"/>
declare module ncp {
    export function ncp(source: string, dest: string, options: {
        filter?: RegExp;
        transform?: (read: ReadableStream, write: WritableStream) => void ;
        clobber?: boolean;
        deference?: boolean;
        stopOnErr?: boolean;
        errs?: WritableStream
    }, callback : (err: Error) => void);
}


