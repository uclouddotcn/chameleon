import sys, codecs

stdoutEncoding = 'utf8'
stderrEncoding = 'utf8'

if sys.stdout.encoding:
    stdoutEncoding = sys.stdout.encoding

if sys.stderr.encoding:
    stderrEncoding = sys.stderr.encoding

mystdout = codecs.EncodedFile(sys.stdout, stdoutEncoding)
mystderr = codecs.EncodedFile(sys.stderr, stdoutEncoding)


def printStdout(s):
    mystdout.write(repr(s)+'\n')

def printStderr(s):
    mystderr.write(repr(s)+'\n')



