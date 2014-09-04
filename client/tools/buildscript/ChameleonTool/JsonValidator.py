import urlparse
import codecs, json

def validateString(value):
    return isinstance(value, str) or isinstance(value, unicode)

def validateInt(value):
    return isinstance(value, int)

def validateUrl(value):
    return validateString(value) and urlparse.urlparse(value).scheme == 'http'

def validateFloat(value):
    return isinstance(value, float)

def validateBoolean(value):
    return validateString(value) and (str(value) == 'true' or str(value) == 'false')

_VALIDATOR = {
        u'string' : validateString,
        u'float' : validateFloat,
        u'int' : validateInt,
        u'url' : validateUrl,
        u'boolean' : validateBoolean
        }

_TYPE_MAP = {
        u'string' : ['putString', lambda x: '"%s"' %x, 's'],
        u'float' : ['putFloat', lambda x : str(x), 'f'],
        u'int' : ['putInt', lambda x : str(x), 'l'],
        u'url' : ['putString', lambda x : '"%s"' %x, 's'],
        u'boolean' : ['putBoolean', lambda x : str(x), 'b']
        }

AJAVA_PATTERN = u"""package {package};

class A {{
    {items}
}}

"""

def mapTypeAndVal(t, name, val):
    return 'bundle.%s("%s", %s);' %(_TYPE_MAP[t][0], name, _TYPE_MAP[t][1](val))

class CfgItem(object):
    def __init__(self, type, desc, default = None, ignoreInA = False):
        self.type = type
        self.desc = desc
        self.key = None
        self.default = default
        self.ignoreInA = ignoreInA
        self.optional = default is not None
        if not _VALIDATOR.has_key(type):
            raise RuntimeError(u"unknown type %s" %type)
        self.validFunc = _VALIDATOR[type]

    def isOptional(self):
        return self.optional

    def validate(self, value):
        if not self.validFunc(value):
            raise RuntimeError('', 'not valid')

    def getTypePrefix(self):
        if self.ignoreInA:
            return 'h'
        else:
            return _TYPE_MAP[self.type][2]

    def toString(self, indent):
        if self.optional:
            optionalstr = ", optional, default is %s" %self.default
        else:
            optionalstr = ''
        return ' ' * indent + u'"%s": "{%s} %s, %s %s"' %(self.key, self.type, self.key, self.desc, optionalstr)

    def toAJava(self, val):
        if self.ignoreInA:
            return ""
        else:
            return mapTypeAndVal(self.type, self.key, val)

class CfgItemSet(object):
    def __init__(self, items = None):
        self.items = items
        if items is not None:
            for k, v in items.items():
                v.key = k

    def validate(self, value):
        res = {}
        for (k, item) in self.items.items():
            itemVal = value.get(k)
            if itemVal is None:
                if not item.isOptional():
                    raise RuntimeError(u"required field %s is missing" %k)
                else:
                    res[item.getTypePrefix()+k] = item.default
            else:
                try:
                    item.validate(itemVal)
                    res[item.getTypePrefix()+k] = itemVal
                except RuntimeError, e:
                    if len(e.args[0]) > 0:
                        t =  unicode(k + '.' + e.args[0])
                        raise RuntimeError(t, *e.args[1:])
                    else:
                        raise RuntimeError(k, *e.args[1:])
        return res

    def toString(self, indent = 0):
        return '%s{\n' %(' '*indent) +  \
               '\n'.join(map(lambda x: x.toString(indent+4), self.items.values())) + \
               '\n%s}' %(' '*indent)

    def loadFromJson(self, items):
        if not isinstance(items, dict):
            raise RuntimeError(u'the cfg json is invalid. %s' %fname)
        ret = []
        for k, v in items.items():
            try:
                t = v["type"]
                desc = v["desc"]
                default = None
                ignoreInA = False
                if v.has_key("default"):
                    default = v["default"]
                if v.has_key("ignoreInA") and v["ignoreInA"] != 0:
                    ignoreInA = True
                ret.append((k, CfgItem(t, desc, default, ignoreInA)))
            except KeyError as e:
                raise RuntimeError(u"cfg item %s have not config %s" %(k, e.args[0]))
        self.items = dict(ret)
        for k, v in self.items.items():
            v.key = k

    def getBundleSetting(self, cfg):
        def _makeItem(cfgItem):
            if cfgItem.isOptional:
                val = cfg.get(cfgItem.key, cfgItem.default)
            else:
                val = cfg.get(cfgItem.key, None)
            if val is None:
                raise RuntimeError(u"fail to fill cfg item %s" %cfgItem.key)
            return cfgItem.toAJava(val)
        return '\n        '.join([_makeItem(x) for x in self.items.values()])

    def addItems(self, **items):
        self.items.update(items)
        for k, v in items.items():
            v.key = k

