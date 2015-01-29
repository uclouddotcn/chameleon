import xml.dom.minidom as xml
import tempfile, os, codecs, sys, re, shutil

class TempFile(object):
    def __init__(self, finalTargetFilePath):
        tmpfd, self.temppath = tempfile.mkstemp()
        self.tmpfo = os.fdopen(tmpfd, 'wb')
        self.targetPath = finalTargetFilePath

    def __enter__(self):
        return codecs.EncodedFile(self.tmpfo, 'utf-8', 'utf-8')

    def __exit__(self, exc_type, exc_value, traceback):
        self.tmpfo.close()
        if not exc_type:
            if os.path.exists(self.targetPath):
                os.remove(self.targetPath)
            shutil.move(self.temppath, self.targetPath)
        else:
            os.unlink(self.temppath)
        return None



class AndroidManifestInst(object):
    def __init__(self, path=None):
        if path is None:
            self._initEmptyManifest()
        else:
            self.doc = xml.parse(path)

    def getPermissions(self):
        parentNode = self.doc.documentElement
        return AndroidManifestInst._getChildrenNS(parentNode, 'uses-permission')

    def getPkgName(self):
        return self._rootNode.getAttribute('package')

    def replace(self, cfg):
        AndroidManifestInst._walkElementNode(self._rootNode, 
                lambda node: replaceNodeAttr(node, cfg))

    def replaceTargetSDK(self, target):
        children = AndroidManifestInst._getChildrenNS(self._rootNode, 'uses-sdk')
        if len(children) == 0:
            targetNode = self.doc.createElement('use-sdk')
            targetNode.setAttribute('android:minSdkVersion', '7')
        else:
            targetNode = children[0] 
        targetNode.setAttribute('android:targetSdkVersion', target)

    def replaceApplication(self, newApp):
        self._applicationNode.setAttribute('android:name', newApp)

    def replaceEntryActivity(self, orientation, channel):
        entryActivityNode = self._findEntryActivity()
        if entryActivityNode is None:
            raise RuntimeError('Fail to find the start entry')
        oldEntry = entryActivityNode.getAttribute('android:name')
        if oldEntry.startswith('.'):
            oldEntry = self.getPkgName()+oldEntry
        if oldEntry == 'prj.chameleon.channelapi.SplashScreenActivity':
            return
        
        intentNode = AndroidManifestInst._getChildNS(entryActivityNode,
                'intent-filter')
        mainActionNode = AndroidManifestInst._getChildNS(intentNode, 
                'action', [('android:name', 'android.intent.action.MAIN')])
        launchCatNode = AndroidManifestInst._getChildNS(intentNode, 
                'category', [('android:name', 'android.intent.category.LAUNCHER')])

        intentNode.removeChild(mainActionNode)
        intentNode.removeChild(launchCatNode)
        
        if channel == 'lenovo':
            _addLenovoSplashScreenActivity(self.doc, intentNode, orientation)
        else:
            splashActivity = self.doc.createElement('activity')
            _fillSplashScreenActivity(self.doc, splashActivity, 
                oldEntry, orientation)
            self._applicationNode.appendChild(splashActivity)        

    def merge(self, that):
        self._mergePermissions(that)
        self._mergeActivity(that)

    def setElement(self, parent, tag, attrs, valueAttrs):
        parentNode = self.doc.documentElement
        for p in parent:
            parentNode = AndroidManifestInst._getChildNS(parentNode, p)
            if parentNode is None:
                raise RuntimeError(u'fail to find element %s/%s' %(parent, tag))
        childNode = AndroidManifestInst._getChildNS(parentNode, tag, attrs)
        if childNode is None:
            childNode = self.doc.createElement(tag)
            parentNode.appendChild(childNode)
            for (name, value) in attrs:
                childNode.setAttribute(name, value)
        for (name, value) in valueAttrs:
            childNode.setAttribute(name, value)

    def setPkgName(self, pkgName):
        root = self.doc.documentElement
        root.setAttribute('package', pkgName)
    
    def createElement(self, parentPath, tag, attrs = None):
        parentNode = self.doc.documentElement
        for p in parentPath:
            if type(p) is tuple:
                if len(p) != 2:
                    raise RuntimeError(u'the path tule must be (tag, attr)')
                parentNode = AndroidManifestInst._getChildNs(parentNode, p[0], p[1])
                if parentNode is None:
                    raise RuntimeError(u'Fail to find the path ' + repr(p))
            elif type(p) is str:
                parentNode = AndroidManifestInst._getChildNS(parentNode, p)
        childNode = self.doc.createElement(tag)
        parentNode.append(childNode)
        if attrs is not None:
            for name, value in attrs:
                childNode.setAttribute(name, value)
        
    def setIcon(self, iconname):
        self.setElement([], 
                'application', 
                [],
                [('android:icon', '@drawable/'+iconname)])

    def setMetaData(self, name, value):
        self.setElement(['application'], 
                'meta-data', 
                [('android:name', name)], 
                [('android:value', value)])

    def _findEntryActivity(self):
        activityNodes = AndroidManifestInst._getChildrenNS(self._applicationNode, 
                'activity')
        for n in activityNodes:
            intentNode = AndroidManifestInst._getChildNS(n, 'intent-filter')
            if intentNode is not None:
                actionNode = AndroidManifestInst._getChildNS( intentNode, 
                        'action')
                actionNode = AndroidManifestInst._getChildNS( intentNode, 
                        'action', 
                        [('android:name', 'android.intent.action.MAIN')])
                categoryNode = AndroidManifestInst._getChildNS(intentNode,
                        'category', 
                        [('android:name', 'android.intent.category.LAUNCHER')])
                if actionNode is not None and categoryNode is not None:
                    return n


    def _mergeActivity(self, that):
        toMerge = [x for x in that._applicationNode.childNodes 
                if x.nodeType==x.ELEMENT_NODE]
        for m in toMerge:
            self._applicationNode.appendChild(m)

    def _mergePermissions(self, that):
        thatPerm = that.getPermissions()
        myPerm = self.getPermissions() 
        myNowPermission = [x.getAttribute('android:name') for x in myPerm]
        toAddPerm = [x for x in thatPerm 
                if x.getAttribute('android:name') not in myNowPermission]
        for p in toAddPerm:
            self._rootNode.appendChild(p)

    def _initEmptyManifest(self):
        self.doc = xml.getDOMImplementation().createDocument(None, 'manifest', None)
        root = self.doc.documentElement
        root.setAttribute('xmlns:android', 'http://schemas.android.com/apk/res/android')
        root.setAttribute('package', 'prj.chameleon.entry')
        applicationDoc = self.doc.createElement('application')
        root.appendChild(applicationDoc)

    def _getChildElement(self, parentNode, tag):
        if type(tag) is tuple:
            parentNode.childNodes

    def dump(self, path = None):
        if path is None:
            return self.doc.toprettyxml()
        else:
            f = codecs.open(path, 'w', 'utf8')
            return self.doc.writexml(f, indent="\t")

    def safeDump(self, path):
        with TempFile(path) as f:
            return f.write(self.doc.toxml('utf-8'))

    def fullQualifyName(self, pkgName):
        appNode = self._applicationNode
        for node in appNode.childNodes:
            if node.nodeType == node.ELEMENT_NODE:
                if node.tagName in ["activity", "service", "provider", 'receiver']:
                    self._fullQualifyName(node, 'android:name', pkgName)
                elif node.tagName == 'activity-alias':
                    self._fullQualifyName(node, 'android:name', pkgName)
                    self._fullQualifyName(node, 'android:targetActivity', pkgName)

    def _fullQualifyName(self, node, attrId, pkgName):
        val = node.getAttribute(attrId)
        if val is None:
            return
        if val.startswith(pkgName):
            pass
        elif val.startswith('.'):
            node.setAttribute(attrId, pkgName+val)
        elif val.find('.') == -1:
            node.setAttribute(attrId, pkgName+'.'+val)
        else:
            pass

    @property
    def _rootNode(self):
        return self.doc.documentElement

    @property
    def _applicationNode(self):
        return AndroidManifestInst._getChildNS(self._rootNode, 'application')

    @staticmethod
    def _getChildNS(node, tag, attrs=None):
        for n in node.childNodes:
            if AndroidManifestInst._matchNode(n, tag, attrs):
                return n
        return None

    @staticmethod
    def _getChildrenNS(node, tag, attrs = None):
        return [x for x in node.childNodes if 
                AndroidManifestInst._matchNode(x, tag, attrs)]
    
    @staticmethod
    def _matchNode(node, tag, attrs):
        return AndroidManifestInst._matchTag(node, tag) and AndroidManifestInst._matchAttr(node, attrs)

    @staticmethod
    def _matchTag(node, tag):
        return node.nodeType==node.ELEMENT_NODE and node.tagName == tag

    @staticmethod
    def _matchAttr(node, attrs):
        if attrs is None:
            return True
        for attr in attrs:
            if node.getAttribute(attr[0]) != attr[1]:
                return False
        return True

    @staticmethod
    def _walkElementNode(parentNode, func):
        func(parentNode)
        for n in parentNode.childNodes:
            if n.nodeType == n.ELEMENT_NODE:
                AndroidManifestInst._walkElementNode(n, func)
            

def parseReplaceVal(val):
    ts = val.split(';;')
    return [t.split('=') for t in ts]

REPLACE_RE = re.compile('%(.+?)%')

def replaceNodeAttr(node, cfg):
    replaceVal = node.getAttribute("chameleon:replace")
    def repl(o):
        c = o.group(1)
        if cfg.get(c) is None:
            return c
        return str(cfg.get(c))
    if len(replaceVal) != 0:
        replaceVal = parseReplaceVal(replaceVal)
        for name, val in replaceVal:
            realv = REPLACE_RE.sub(repl, str(val))
            node.setAttribute(name, realv)
        node.removeAttribute("chameleon:replace")

def _fillSplashScreenActivity(doc, splashActivity, oldEntryActivity, orientation):
    splashActivity.setAttribute('android:name', 
            'prj.chameleon.channelapi.SplashScreenActivity')

    if orientation is not None:
        splashActivity.setAttribute('android:screenOrientation', orientation)
    splashActivity.setAttribute('android:noHistory', "true")
    splashActivity.setAttribute('android:stateNotNeeded', "true")
    splashActivity.setAttribute('android:launchMode', "singleTask")
    splashActivity.setAttribute('android:theme', 
            "@android:style/Theme.NoTitleBar.Fullscreen")
    metaDataNode = doc.createElement('meta-data')
    metaDataNode.setAttribute('android:name', "prj.chameleon.intent.main")
    metaDataNode.setAttribute('android:value', oldEntryActivity)
    splashActivity.appendChild(metaDataNode)
    intentNode = doc.createElement('intent-filter')
    mainActionNode = doc.createElement('action')
    intentNode.appendChild(mainActionNode)
    mainActionNode.setAttribute('android:name', "android.intent.action.MAIN")
    splashActivity.appendChild(intentNode)
    categoryNode = doc.createElement('category')
    intentNode.appendChild(categoryNode)
    categoryNode.setAttribute('android:name', "android.intent.category.LAUNCHER")

def _addLenovoSplashScreenActivity(doc, intentNode, orientation):
    mainActionNode = doc.createElement('action')
    intentNode.appendChild(mainActionNode)
    mainActionNode.setAttribute('android:name', "lenovoid.MAIN")
    categoryNode = doc.createElement('category')
    intentNode.appendChild(categoryNode)
    categoryNode.setAttribute('android:name', "android.intent.category.DEFAULT")
