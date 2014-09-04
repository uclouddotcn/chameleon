import tempfile, os, codecs

class TempFile(object):
    def __init__(self, finalTargetFilePath):
        tmpfd, self.temppath = tempfile.mkstemp()
        self.tmpfo = os.fdopen(tmpfd, 'w')
        self.targetPath = finalTargetFilePath

    def __enter__(self):
        return self.tmpfo

    def __exit__(self, exc_type, exc_value, traceback):
        self.tmpfo.close()
        if not exc_type:
            if os.path.exists(self.targetPath):
                os.remove(self.targetPath)
            os.rename(self.temppath, self.targetPath)
        else:
            os.unlink(self.temppath)
        return None


