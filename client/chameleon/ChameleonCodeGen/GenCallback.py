import os
import re
import sys
import clang.cindex
from optparse import OptionParser
from mako.template import Template

targetLang = ''
targetFile = ''
clang.cindex.Config.set_library_file('/usr/lib64/llvm/libclang.so')


class PARAMETER(object):
    def __init__(self, cursor):
        self.name = cursor.displayname
        self.type = cursor.type.spelling
        print "type: ", self.type, "name: ", self.name, " kind: ", cursor.type.kind

class DECLARE(object):
    def __init__(self, cursor):
        self.name = cursor.displayname
        self.kind = cursor.spelling
        self.params = []
        self.sig = ''
        self.rsig = ''
        self.needtransform = False
        for c in cursor.get_children():
            para = PARAMETER(c)
            self.params.append(para)
            if c.type.kind == clang.cindex.TypeKind.INT:
                self.sig += 'i'
            if c.type.kind == clang.cindex.TypeKind.POINTER:
                self.sig += 's'
            if c.type.spelling == 'bool':
                self.sig += 'b'
            print self.name

        if cursor.result_type.kind == clang.cindex.TypeKind.POINTER :
            self.rsig += 's'
        if cursor.result_type.kind == clang.cindex.TypeKind.INT:
            self.rsig += 'i'


class FUNCTION(object):
    def __init__(self, cursor):
        self.name = cursor.spelling
        self.resultType = cursor.result_type.spelling
        self.params = []
        self.sig = ""
        self.rsig = ''
        self.needtransform = False
        for c in cursor.get_children():
            para = PARAMETER(c)
            self.params.append(para)
            if c.type.kind == clang.cindex.TypeKind.INT:
                self.sig += 'i'
            if c.type.kind == clang.cindex.TypeKind.POINTER:
                self.sig += 's'
            if c.type.spelling == 'bool':
                self.sig += 'b'
        if cursor.result_type.kind == clang.cindex.TypeKind.POINTER :
            self.rsig += 's'
        if cursor.result_type.kind == clang.cindex.TypeKind.INT:
            self.rsig += 'i'
        if self.sig == 'si' and re.match("^get.*", self.name) is not None:
            self.needtransform = 1 
            self.sig = ''
            self.rsig = 's'
            self.resultType = self.params[0].type
            
        print "sig: ", self.sig

def parse(cursor):
    global  targetFile
    decls = []
    print cursor.kind
    print 'spelling', cursor.spelling
    print 'displayname', cursor.displayname

    if cursor.kind == clang.cindex.CursorKind.FIELD_DECL:
        func = DECLARE(cursor)
        decls.append(func)
    if cursor.kind == clang.cindex.CursorKind.FUNCTION_DECL:
        func = FUNCTION(cursor)
        decls.append(func)
    for c in cursor.get_children():
        if c.location.file.name != targetFile: 
            continue
        if c.kind == clang.cindex.CursorKind.TYPEDEF_DECL:
            continue
        decls.extend(parse(c))

    return decls


def main():
    parser = OptionParser()
    parser.add_option('-l', '--language', dest='lang', help='the target language you wanna generate.') 
    parser.add_option('-f', '--file', dest='headerfile', help='The header file you wanna process.')
    parser.add_option('-a', '--apiName', dest='apiName', help='The api library name you finally get.')

    (options, values) = parser.parse_args()

    if options.lang is None or options.headerfile is None:
        parser.print_help()
        return 1
    
    global targetLang, targetFile
    targetLang = options.lang
    targetFile = options.headerfile

    index = clang.cindex.Index.create()

    translation_unit = index.parse(options.headerfile)
    decls = parse(translation_unit.cursor)

    api_name = ''
    if options.apiName is None:
        api_name = ''
    else:
        api_name = options.apiName
        
    tpl = Template(filename=targetLang+'_bind.mako')
    rendered = tpl.render(
        decls=decls,
        include_files=[options.headerfile],
        api_name=api_name    
    )

    with open("{}_bind.c".format(targetLang), "w") as f:
        f.write(rendered)

    return 0

if __name__ == '__main__':
    sys.exit(main())
