#encoding=utf8
class Category(object):
    def __init__(self, name, desc, priority):
        self.name = name
        self.desc = desc
        self.priority = priority

PROJECT_CAT = Category('project', u'设置项目相关', 1)
CHANNEL_CAT = Category('channel', u'在项目中设置渠道信息相关', 2)
TOOL_INFO_CAT = Category('toolinfo', u'查看Chameleon工具的信息', 3)



