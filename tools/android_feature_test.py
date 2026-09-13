#!/usr/bin/env python3
import json, re, subprocess, sys, time, xml.etree.ElementTree as ET
from pathlib import Path

# ==============================================================================
# FALLBACK CONFIGURATION (Used when running without CLI arguments)
# ==============================================================================
DEFAULT_APK_PATH = Path("Objects/AeroCalculator.apk")
DEFAULT_API_LEVEL = "36"

APK = sys.argv[1] if len(sys.argv) > 1 else str(DEFAULT_APK_PATH)
API = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_API_LEVEL
PKG = 'flightdyn.aerocalculator'
OUT = Path(f'smoke-results/api-{API}/feature-regression')
OUT.mkdir(parents=True, exist_ok=True)
R = {'api': API, 'checks': []}

def run(*a,check=True,text=True):
 p=subprocess.run(a,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=text)
 if check and p.returncode: raise RuntimeError(f"{' '.join(a)}\n{p.stdout}\n{p.stderr}")
 return p.stdout.strip() if text else p.stdout

def adb(*a,check=True): return run('adb',*a,check=check)
def report(): (OUT/'report.json').write_text(json.dumps(R,indent=2),encoding='utf-8')
def rec(name,ok,detail=''):
 R['checks'].append({'name':name,'pass':bool(ok),'detail':detail}); report()
 if not ok: raise AssertionError(f'{name}: {detail}')
def bounds(s):
 m=re.fullmatch(r'\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]',s or '')
 return tuple(map(int,m.groups())) if m else None
def center(n):
 x1,y1,x2,y2=bounds(n.attrib['bounds']); return (x1+x2)//2,(y1+y2)//2
def norm(s): return re.sub(r'[^a-z0-9]+','',(s or '').lower())
def dump(name):
 adb('shell','uiautomator','dump','/sdcard/window.xml',check=False); p=OUT/f'{name}.xml'; run('adb','pull','/sdcard/window.xml',str(p),check=False)
 return ET.parse(p).getroot()
def shot(name):
 run('adb','exec-out','screencap','-p',text=False,check=False); time.sleep(.45)
 (OUT/f'{name}.png').write_bytes(run('adb','exec-out','screencap','-p',text=False))
def nodes(root): return [n for n in root.iter('node') if n.attrib.get('package')==PKG]
def allnodes(root): return list(root.iter('node'))
def texts(root,app_only=True):
 src=nodes(root) if app_only else allnodes(root)
 return [n.attrib.get('text','').strip() for n in src if n.attrib.get('text','').strip()]
def find(root,t,app_only=True):
 q=norm(t); src=nodes(root) if app_only else allnodes(root)
 return next((n for n in src if norm(n.attrib.get('text',''))==q),None)
def find_contains(root,t,app_only=True):
 q=norm(t); src=nodes(root) if app_only else allnodes(root)
 return next((n for n in src if q and q in norm(n.attrib.get('text',''))),None)
def parents(root): return {c:p for p in root.iter() for c in p}
def tap(n):
 x,y=center(n); adb('shell','input','tap',str(x),str(y)); time.sleep(.8)
def taptext(t,app_only=True):
 r=dump('tap-'+norm(t)); n=find(r,t,app_only); rec('visible:'+t,n is not None,str(texts(r,app_only)[:60])); tap(n)
def wait_text(t,prefix,timeout=8,app_only=True):
 end=time.time()+timeout; i=0; last=[]
 while time.time()<end:
  r=dump(f'{prefix}-{i}'); last=texts(r,app_only)
  n=find(r,t,app_only)
  if n is not None:return r,n
  time.sleep(.35); i+=1
 raise AssertionError(f'{t!r} not visible; last={last[:80]}')
def foreground(stage,expected=None):
 s=adb('shell','dumpsys','activity','activities',check=False); line=next((x.strip() for x in s.splitlines() if 'mResumedActivity' in x or 'topResumedActivity' in x),'')
 rec('foreground:'+stage,PKG in line,line); rec('alive:'+stage,bool(adb('shell','pidof',PKG,check=False)),line)
 if expected: rec('activity:'+stage,expected.lower() in line.lower(),line)
 l=adb('logcat','-d',check=False); (OUT/f'{stage}-logcat.txt').write_text(l,encoding='utf-8',errors='replace')
 rec('runtime:'+stage,re.search(rf'FATAL EXCEPTION|ANR in {re.escape(PKG)}|Process: {re.escape(PKG)}.*has died',l,re.I) is None,'runtime failure')
def scrollview(root): return next((n for n in nodes(root) if n.attrib.get('class')=='android.widget.ScrollView' and n.attrib.get('scrollable')=='true'),None)
def scroll(root,up=True,required=True):
 sv=scrollview(root)
 if sv is None:
  if required: rec('scrollview',False,'missing scrollable ScrollView')
  return False
 x1,y1,x2,y2=bounds(sv.attrib['bounds']); x=(x1+x2)//2; h=y2-y1; sy=y1+int(h*(.82 if up else .28)); ey=y1+int(h*(.28 if up else .82))
 adb('shell','input','swipe',str(x),str(sy),str(x),str(ey),'420'); time.sleep(.6); return True
def until(names,prefix,n=12):
 seen=[]
 for i in range(n+1):
  r=dump(f'{prefix}-{i}'); ts=texts(r); seen += [x for x in ts if x not in seen]
  for name in names:
   q=find(r,name)
   if q is not None:return r,q,seen
  if i<n: scroll(r,True)
 raise AssertionError(f'{names} not reachable; seen={seen}')
def top():
 for i in range(12):
  r=dump(f'top-{i}')
  if find(r,'Airplane') is not None:return r
  scroll(r,False)
 return dump('top-final')
def layout(root,name):
 ns=nodes(root); rec('app-tree:'+name,bool(ns),'empty')
 rb=bounds(ns[0].attrib.get('bounds','')); rec('root-bounds:'+name,rb is not None,str(rb)); x1,_,x2,_=rb; bad=[]
 for n in ns:
  z=bounds(n.attrib.get('bounds',''))
  if z and (z[0]<x1-1 or z[2]>x2+1 or z[2]<=z[0] or z[3]<=z[1]): bad.append((n.attrib.get('text'),z))
 rec('horizontal-overflow:'+name,not bad,str(bad[:8]))
def edit(label,value):
 top()
 for i in range(10):
  r=dump(f'edit-{norm(label)}-{i}'); pm=parents(r); lab=find(r,label)
  if lab is not None:
   p=pm.get(lab); e=next((x for x in p.iter('node') if x.attrib.get('class')=='android.widget.EditText'),None) if p is not None else None
   if e is not None:
    tap(e); adb('shell','input','keyevent','123',check=False)
    for _ in range(18): adb('shell','input','keyevent','67',check=False)
    adb('shell','input','text',str(value)); adb('shell','input','keyevent','4',check=False); time.sleep(.4); return
  scroll(r,True)
 raise AssertionError('edit not found '+label)
def result(label):
 for i in range(18):
  r=dump(f'result-{norm(label)}-{i}'); pm=parents(r); n=find(r,label)
  if n is not None:
   p=pm.get(n); vals=[x.attrib.get('text','').strip() for x in p.iter('node') if x is not n and x.attrib.get('text','').strip()]
   if vals:return vals[0]
  scroll(r,True)
 raise AssertionError('output missing '+label)
def num(s):
 m=re.search(r'[-+]?\d+(?:[.,]\d+)?',s.replace(' ','')); return float(m.group(0).replace(',','.')) if m else float('nan')
def header_icon(which):
 r=dump('icon-'+which); imgs=[]
 for n in nodes(r):
  if n.attrib.get('class')!='android.widget.ImageView': continue
  z=bounds(n.attrib.get('bounds',''))
  if z and z[1] < 420: imgs.append((center(n)[0],n))
 imgs.sort(key=lambda p:p[0],reverse=True)
 idx=0 if which=='menu' else 1
 rec('header-icon:'+which,len(imgs)>idx,str([(x,n.attrib.get('bounds')) for x,n in imgs]))
 tap(imgs[idx][1])
def open_menu(stage='menu'):
 header_icon('menu'); r,_=wait_text('Clear Inputs',stage)
 required=['Clear Inputs','Import Airplanes','Export Airplanes','Settings','Send Feedback','About']
 miss=[x for x in required if find(r,x) is None]
 rec('menu-items:'+stage,not miss,f'missing={miss}; visible={texts(r)}')
 shot(stage)
 return r
def select_menu(item,stage):
 r=open_menu(stage+'-menu'); n=find(r,item); rec('menu-select:'+item,n is not None,str(texts(r))); tap(n); time.sleep(.8)
def back(): adb('shell','input','keyevent','4',check=False); time.sleep(.8)
def return_to_main(stage):
 r,_=wait_text('AIRPLANES',stage)
 foreground(stage,'.main')
 return r

def main():
 adb('install','-r',APK); adb('shell','wm','size','1080x2340'); adb('shell','wm','density','440'); adb('shell','cmd','window','user-rotation','lock','0',check=False); adb('shell','pm','clear',PKG,check=False); adb('logcat','-c',check=False)
 adb('shell','monkey','-p',PKG,'-c','android.intent.category.LAUNCHER','1'); time.sleep(3); foreground('launch','.main')
 r=dump('inputs-top'); layout(r,'inputs-top'); shot('inputs-top')
 for t in ['AIRPLANES','INPUTS','CALCULATE','Hp','OAT','CAS']: rec('input:'+t,find(r,t) is not None,str(texts(r)[:50]))
 rb,_,seen=until(['HeadWind','HeadWnd','WindSpd','Wind Spd','Wind Speed'],'inputs-bottom'); rec('inputs-bottom',True,str(seen[-20:])); layout(rb,'inputs-bottom'); shot('inputs-bottom')

 top(); r=dump('selector'); tap(find(r,'Hp')); d,_=wait_text('Pressure Altitude','alt-dialog'); rec('alt-selector',find(d,'Geometric Altitude') is not None,str(texts(d))); shot('altitude-selector'); tap(find(d,'Pressure Altitude'))
 time.sleep(.5); r=dump('unit'); tap(find(r,'ft')); d,_=wait_text('km','unit-dialog'); rec('unit-selector',find(d,'m') is not None,str(texts(d))); shot('altitude-unit-selector'); tap(find(d,'ft')); time.sleep(.5)

 for lab,val in [('Hp','0'),('OAT','15'),('CAS','100'),('Weight','1000'),('S_ref_wing','16'),('c_ref_wing','1.5'),('CLMAX','1.5'),('Nz (Pull-up)','1')]: edit(lab,val)
 top(); taptext('CALCULATE'); time.sleep(1); foreground('calculate','.main'); r=dump('outputs-top'); layout(r,'outputs-top'); shot('outputs-top')
 for lab,exp,tol in [('Pressure',1013.25,1),('Temperature',15,.2),('Density',1.225,.03),('Calibrated Airspeed',100,.5)]:
  s=result(lab); v=num(s); rec('calc:'+lab,abs(v-exp)<=tol,f'{s} expected {exp}±{tol}')
 r,_,seen=until(['AlongTrack Crosswind'],'outputs-bottom',18); rec('outputs-bottom',True,str(seen[-20:])); shot('outputs-bottom')

 taptext('INPUTS'); taptext('AIRPLANES'); foreground('airplanes','.main'); r=dump('airplanes'); layout(r,'airplanes'); shot('airplanes')
 header_icon('plus'); foreground('aircraft-editor','.airp'); r=dump('aircraft-editor'); rec('editor-open',all(find(r,x) is not None for x in ['Save','Cancel','Name']),str(texts(r)[:80])); layout(r,'editor'); shot('editor-top')
 if scrollview(r) is not None:
  before=tuple(texts(r)); scroll(r,True,required=False); r2=dump('editor-bottom'); rec('editor-scroll',tuple(texts(r2))!=before,str(texts(r2)[:80])); shot('editor-bottom')
 else:
  rec('editor-fits-without-scroll',True,str(texts(r)[:80]))
 c=find(dump('editor-close'),'Cancel'); tap(c) if c is not None else back(); d,_=wait_text('Discard','editor-discard')
 rec('editor-discard-dialog',find_contains(d,'discard changes') is not None,str(texts(d))); shot('editor-discard-dialog'); tap(find(d,'Discard'))
 return_to_main('editor-discard-return')

 open_menu('main-menu'); back(); return_to_main('menu-close')

 select_menu('Clear Inputs','clear-inputs'); d,_=wait_text('Confirm','clear-dialog'); rec('clear-dialog',find(d,'Cancel') is not None and find_contains(d,'clear the inputs') is not None,str(texts(d))); shot('clear-inputs-dialog'); tap(find(d,'Cancel')); return_to_main('clear-cancel-return')

 select_menu('About','about'); d,_=wait_text('About','about-dialog'); rec('about-dialog',find_contains(d,'AeroCalculator') is not None,str(texts(d))); shot('about-dialog'); back(); return_to_main('about-return')

 select_menu('Send Feedback','feedback'); d,_=wait_text('Feedback and Bug Report','feedback-dialog'); rec('feedback-dialog',find_contains(d,'Choose the means') is not None,str(texts(d))); shot('feedback-dialog'); back(); return_to_main('feedback-return')

 select_menu('Settings','settings'); d,_=wait_text('Theme','settings-screen'); foreground('settings','preference'); rec('settings-items',find(d,'Altitude Unit') is not None and find(d,'Pressure Unit') is not None,str(texts(d)[:80])); layout(d,'settings'); shot('settings'); back(); return_to_main('settings-return')

 select_menu('Export Airplanes','export'); d,_=wait_text('OK','export-explorer'); rec('export-explorer',find(d,'OK') is not None,str(texts(d)[:80])); layout(d,'export-explorer'); shot('export-explorer'); back(); return_to_main('export-return')

 select_menu('Import Airplanes','import'); time.sleep(1.2); d=dump('import-system-chooser'); rec('import-system-chooser',bool(texts(d,app_only=False)),str(texts(d,app_only=False)[:80])); shot('import-system-chooser'); back(); return_to_main('import-return')

 report(); print(json.dumps(R,indent=2))

try: main()
except Exception as e:
 R['error']=f'{type(e).__name__}: {e}'; report()
 try: shot('failure')
 except Exception: pass
 raise
finally:
 adb('shell','wm','size','reset',check=False); adb('shell','wm','density','reset',check=False); adb('shell','cmd','window','user-rotation','free',check=False)
