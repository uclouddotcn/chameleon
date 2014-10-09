///<reference path="node.d.ts"/>

declare module "adm-zip" {

    interface ZipEntry {

    }

    class AdmZip {
        constructor();

        constructor(path:string);

        constructor(buf:NodeBuffer);

        constructor(obj?:any);

        /**
         * Extracts the given entry from the archive and returns the content as a Buffer object
         * @param entry ZipEntry object or String with the full path of the entry
         *
         * @return Buffer or Null in case of error
         */
        readFile(entry:any):NodeBuffer;

        /**
         * Asynchronous readFile
         * @param entry ZipEntry object or String with the full path of the entry
         * @param callback
         *
         * @return Buffer or Null in case of error
         */
        readFileAsync(entry:any, callback:Function):NodeBuffer;

        /**
         * Extracts the given entry from the archive and returns the content as plain text in the given encoding
         * @param entry ZipEntry object or String with the full path of the entry
         * @param encoding Optional. If no encoding is specified utf8 is used
         *
         * @return String
         */
        readAsText(entry:any, encoding?:string):string;

        /**
         * Asynchronous readAsText
         * @param entry ZipEntry object or String with the full path of the entry
         * @param callback
         * @param encoding Optional. If no encoding is specified utf8 is used
         *
         * @return String
         */
        readAsTextAsync(entry:any, callback:Function, encoding?:string):string;

        /**
         * Remove the entry from the file or the entry and all it's nested directories and files if the given entry is a directory
         *
         * @param entry
         */
        deleteFile(entry:any);

        /**
         * Adds a comment to the zip. The zip must be rewritten after adding the comment.
         *
         * @param comment
         */
        addZipComment(comment:string);

        /**
         * Returns the zip comment
         *
         * @return String
         */
        getZipComment():string;

        /**
         * Adds a comment to a specified zipEntry. The zip must be rewritten after adding the comment
         * The comment cannot exceed 65535 characters in length
         *
         * @param entry
         * @param comment
         */
        addZipEntryComment(entry:any, comment:string);

        /**
         * Returns the comment of the specified entry
         *
         * @param entry
         * @return String
         */
        getZipEntryComment(entry:any):string;

        /**
         * Updates the content of an existing entry inside the archive. The zip must be rewritten after updating the content
         *
         * @param entry
         * @param content
         */
        updateFile(entry:any, content:NodeBuffer);

        /**
         * Adds a file from the disk to the archive
         *
         * @param localPath
         */
        addLocalFile(localPath:string, zipPath:string);

        /**
         * Adds a local directory and all its nested files and directories to the archive
         *
         * @param localPath
         */
        addLocalFolder(localPath:string, zipPath:string);

        /**
         * Allows you to create a entry (file or directory) in the zip file.
         * If you want to create a directory the entryName must end in / and a null buffer should be provided.
         * Comment and attributes are optional
         *
         * @param entryName
         * @param content
         * @param comment
         * @param attr
         */
        addFile(entryName:string, content:NodeBuffer, comment:string, attr:number);

        /**
         * Returns an array of ZipEntry objects representing the files and folders inside the archive
         *
         * @return Array
         */
        getEntries():any[];

        /**
         * Returns a ZipEntry object representing the file or folder specified by ``name``.
         *
         * @param name
         * @return ZipEntry
         */
        getEntry(name:string):any;

        /**
         * Extracts the given entry to the given targetPath
         * If the entry is a directory inside the archive, the entire directory and it's subdirectories will be extracted
         *
         * @param entry ZipEntry object or String with the full path of the entry
         * @param targetPath Target folder where to write the file
         * @param maintainEntryPath If maintainEntryPath is true and the entry is inside a folder, the entry folder
         *                          will be created in targetPath as well. Default is TRUE
         * @param overwrite If the file already exists at the target path, the file will be overwriten if this is true.
         *                  Default is FALSE
         *
         * @return Boolean
         */
        extractEntryTo(entry:any, targetPath:string, maintainEntryPath:boolean, overwrite:boolean):boolean;

        /**
         * Extracts the entire archive to the given location
         *
         * @param targetPath Target location
         * @param overwrite If the file already exists at the target path, the file will be overwriten if this is true.
         *                  Default is FALSE
         */
        extractAllTo(targetPath:string, overwrite:boolean);

        /**
         * Writes the newly created zip file to disk at the specified location or if a zip was opened and no ``targetFileName`` is provided, it will overwrite the opened zip
         *
         * @param targetFileName
         * @param callback
         */
        writeZip(targetFileName:string, callback?:Function);

        /**
         * Returns the content of the entire zip file as a Buffer object
         *
         * @return Buffer
         */
        toBuffer(onSuccess:Function, onFail:Function, onItemStart:Function, onItemEnd:Function):NodeBuffer;
    }

export = AdmZip;

}

