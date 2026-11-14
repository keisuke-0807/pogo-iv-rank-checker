# src のファイルを1つのHTML(index.html)にまとめる: python src/build.py
import os
d=os.path.dirname(os.path.abspath(__file__))
js=''.join(open(os.path.join(d,f),encoding='utf-8').read()+'\n' for f in ['data.js','cpm.js','core.js','namer.js','app.js'])
h=open(os.path.join(d,'shell.html'),encoding='utf-8').read().replace('/*JS*/',js)
open(os.path.join(d,'..','index.html'),'w',encoding='utf-8').write(h)
print('built')
