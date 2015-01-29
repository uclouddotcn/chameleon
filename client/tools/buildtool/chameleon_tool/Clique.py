__author__ = 'Peter Zhu'
import os, sys

FILEROOT = os.path.dirname(__file__)


def read_file():
    filename = os.path.join(FILEROOT, 'train.txt')
    lines = os.open(filename, "r").readlines()
    for line in lines:
        nums = str(line).split(' ')
        for num in nums:
            if num != '':
                num = float(num)
                print(num)



read_file()


