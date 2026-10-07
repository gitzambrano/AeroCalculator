#!/usr/bin/env python3
import json, re, subprocess, sys, time
from pathlib import Path
import xml.etree.ElementTree as ET

APK=sys.argv[1]
API=sys.argv[2] if len(sys.argv)>2 else "unknown"
PKG="flightdyn.aerocalculator"
OUT=Path(f"smoke-results/api-{API}/input-matrix")
OUT.mkdir(parents=True,exist_ok=True)
REPORT=[]

PROFILES=[
 ("280dp","560x1120","320"),
 ("320dp","640x1280","320"),
 ("360dp","720x1440","320"),
 ("393dp","1080x2160","440"),
 ("411dp","1080x2160","420"),
]

def run(*args,text=True,check=True):
 p=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=text)
 if check and p.returncode:
  raise RuntimeError(" ".join(args)+"\n"+str(p.stdout))
 return p.stdout

def adb(*args,check=True):
 return run("adb",*args,check=check)

def norm(s):
 return re.sub(r"[^a-z0-9]+","",(s or "").lower())

def bounds(s):
 m=re.fullmatch(r"\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]",s or "")
 return tuple(map(int,m.groups())) if m else None

def center(n):
 x1,y1,x2,y2=bounds(n.attrib.get("bounds",""))
 return (x1+x2)//2,(y1+y2)//2

def dump(dirp,name):
 adb("shell","uiautomator","dump","/sdcard/window.xml",check=False)
 p=dirp/f"{name}.xml"
 adb("pull","/sdcard/window.xml",str(p),check=False)
 return ET.parse(p).getroot()

def shot(dirp,name):
 dirp.mkdir(parents=True,exist_ok=True)
 p=dirp/f"{name}.png"
 with p.open("wb") as fh:
  q=subprocess.run(["adb","exec-out","screencap","-p"],stdout=fh)
  if q.returncode: raise RuntimeError("screencap failed")

def nodes(root):
 return [n for n in root.iter("node") if n.attrib.get("package")==PKG]

def texts(root):
 return [n.attrib.get("text","").strip() for n in nodes(root) if n.attrib.get("text","").strip()]

def parent_map(root):
 return {c:p for p in root.iter() for c in p}

def find_any(root,candidates):
 qs={norm(x) for x in candidates}
 for n in nodes(root):
  if norm(n.attrib.get("text","")) in qs:
   return n
 return None

def find_sheet_text(root,wanted):
 q=norm(wanted); found=[]
 for n in nodes(root):
  if norm(n.attrib.get("text",""))==q:
   b=bounds(n.attrib.get("bounds",""))
   if b and b[2]>b[0] and b[3]>b[1]: found.append((b[1],n))
 return max(found,key=lambda x:x[0])[1] if found else None

def tap(n):
 x,y=center(n); adb("shell","input","tap",str(x),str(y)); time.sleep(.45)

def display_size():
 size=adb("shell","wm","size")
 m=re.search(r"Override size: (\d+)x(\d+)",size) or re.search(r"Physical size: (\d+)x(\d+)",size)
 return tuple(map(int,m.groups()))

def swipe(up=True):
 w,h=display_size()
 x=w//2
 sy=int(h*(.80 if up else .28)); ey=int(h*(.30 if up else .80))
 adb("shell","input","swipe",str(x),str(sy),str(x),str(ey),"350",check=False)
 time.sleep(.35)

def top(dirp):
 for i in range(12):
  r=dump(dirp,f"top-{i}")
  if find_any(r,["Airplane"]): return r
  swipe(False)
 return dump(dirp,"top-final")

def reachable(dirp,candidates):
 top(dirp)
 for i in range(13):
  r=dump(dirp,f"seek-{i}")
  n=find_any(r,candidates)
  if n is not None:return r,n
  swipe(True)
 raise AssertionError(f"unable to find {candidates}; visible={texts(r)[:80]}")

def visible_bounds_ok(root):
 ns=nodes(root)
 valid=[bounds(n.attrib.get("bounds","")) for n in ns]
 valid=[b for b in valid if b and b[2]>b[0] and b[3]>b[1]]
 if not valid:return False,[("empty",None)]
 left=min(b[0] for b in valid); right=max(b[2] for b in valid)
 bad=[]
 for n in ns:
  b=bounds(n.attrib.get("bounds",""))
  if not b or b[2]<=b[0] or b[3]<=b[1]: continue
  if b[0]<left-1 or b[2]>right+1: bad.append((n.attrib.get("text",""),b))
 return not bad,bad[:10]

def record(profile,state,root):
 ok,bad=visible_bounds_ok(root)
 REPORT.append({"profile":profile,"state":state,"ok":ok,"bad":bad,"texts":texts(root)[:120]})
 if not ok: raise AssertionError(f"{profile}:{state} bounds {bad}")

def launch(size,density):
 adb("shell","am","force-stop",PKG,check=False)
 adb("shell","wm","size",size)
 adb("shell","wm","density",density)
 adb("shell","settings","put","system","accelerometer_rotation","0",check=False)
 adb("shell","settings","put","system","user_rotation","0",check=False)
 adb("shell","cmd","window","user-rotation","lock","0",check=False)
 adb("shell","pm","clear",PKG,check=False)
 adb("shell","monkey","-p",PKG,"-c","android.intent.category.LAUNCHER","1")
 time.sleep(2.5)

def open_picker(dirp,button_candidates,expected,state):
 _,n=reachable(dirp,button_candidates); tap(n); time.sleep(.35)
 d=dump(dirp,state+"-sheet")
 missing=[x for x in expected if find_sheet_text(d,x) is None]
 REPORT.append({"profile":dirp.name,"state":state+"-options","ok":not missing,"missing":missing,"texts":texts(d)[:120]})
 if missing: raise AssertionError(f"{dirp.name}:{state} missing options {missing}")
 shot(dirp,state+"-sheet")
 return d

def choose(dirp,button_candidates,expected,choice,state):
 d=open_picker(dirp,button_candidates,expected,state)
 n=find_sheet_text(d,choice)
 if n is None: raise AssertionError(f"{state}: missing choice {choice}")
 tap(n); time.sleep(.45)
 r=dump(dirp,state)
 record(dirp.name,state,r)
 shot(dirp,state)
 return r

def row_unit_node(root,label_candidates):
 n=find_any(root,label_candidates)
 if n is None:return None
 pm=parent_map(root); p=pm.get(n)
 for _ in range(4):
  if p is None: break
  cand=[]
  for x in p.iter("node"):
   b=bounds(x.attrib.get("bounds",""))
   if b and b[2]>b[0] and b[3]>b[1] and x.attrib.get("clickable")=="true":
    cand.append((b[0],x))
  if len(cand)>=2:
   return max(cand,key=lambda z:z[0])[1]
  p=pm.get(p)
 return None

def cycle_units(dirp,label_candidates,options,state):
 for idx,opt in enumerate(options):
  r,_=reachable(dirp,label_candidates)
  unit=row_unit_node(r,label_candidates)
  if unit is None: raise AssertionError(f"{state}: unit control missing")
  tap(unit); time.sleep(.25)
  d=dump(dirp,f"{state}-unit-{idx}-sheet")
  missing=[x for x in options if find_sheet_text(d,x) is None]
  if missing: raise AssertionError(f"{state}: missing units {missing}")
  n=find_sheet_text(d,opt)
  if n is None: raise AssertionError(f"{state}: cannot select {opt}")
  tap(n); time.sleep(.3)
  rr=dump(dirp,f"{state}-unit-{idx}")
  record(dirp.name,f"{state}-unit-{opt}",rr)
 shot(dirp,f"{state}-units-final")

FIELDS={
 "alt":{
  "buttons":["HP","Altitude HP","HG","Altitude HGEOM","HGEOM","P","Static Pressure"],
  "expected":["Pressure Altitude","Geometric Altitude","Altitude from GPS","Pressure","Pressure from Sensor"],
  "choices":["Pressure Altitude","Geometric Altitude","Pressure"],
 },
 "temp":{
  "buttons":["Δ ISA","OAT","Temperature OAT"],
  "expected":["Δ ISA","Outside Air Temperature","Temperature from Sensor"],
  "choices":["Δ ISA","Outside Air Temperature"],
 },
 "speed":{
  "buttons":["TAS","CAS","EAS","Airspeed TAS","Airspeed CAS","Airspeed EAS","Mach","CL","VS Factor","VS Fact","Ground Speed","Grnd Speed","q","qc","Dynamic Pressure","Impact Pressure"],
  "expected":["TAS","CAS","EAS","Mach","Lift Coefficient","Stall-Speed Factor","Ground Speed","GroundSpeed from GPS","Dynamic Pressure","Impact Pressure"],
  "choices":["TAS","CAS","EAS","Mach","Lift Coefficient","Stall-Speed Factor","Ground Speed","Dynamic Pressure","Impact Pressure"],
 },
 "nz":{
  "buttons":["NZ (Pull-up)","NZ (Turn)","NZ","Bank Angle","Bank"],
  "expected":["Normal Load Factor (Pull-up)","Normal Load Factor (Wind-up Turn)","Bank Angle (Wind-up Turn)"],
  "choices":["Normal Load Factor (Pull-up)","Normal Load Factor (Wind-up Turn)","Bank Angle (Wind-up Turn)"],
 },
 "angle1":{
  "buttons":["Track Angle","Track","Heading Angle","Heading"],
  "expected":["Track Angle (Course)","Heading Angle"],
  "choices":["Track Angle (Course)","Heading Angle"],
 },
 "angle2":{
  "buttons":["Sideslip Angle","Sideslip","Drift Angle","Drift"],
  "expected":["Sideslip Angle β","Drift Angle"],
  "choices":["Sideslip Angle β","Drift Angle"],
 },
 "wind":{
  "buttons":["HeadWind","HeadWnd","WindSpd","Wind Spd","Wind Speed"],
  "expected":["Headwind / Crosswind","WindSpeed / WindDirection"],
  "choices":["Headwind / Crosswind","WindSpeed / WindDirection"],
 },
}

def fill_vsfactor(dirp):
 choose(dirp,FIELDS["speed"]["buttons"],FIELDS["speed"]["expected"],"Stall-Speed Factor","vsfactor")
 r,n=reachable(dirp,FIELDS["speed"]["buttons"])
 pm=parent_map(r); p=pm.get(n); edits=[]
 for _ in range(4):
  if p is None: break
  edits=[]
  for x in p.iter("node"):
   if x.attrib.get("class")=="android.widget.EditText":
    b=bounds(x.attrib.get("bounds",""))
    if b and b[2]>b[0]: edits.append((b[0],x))
  if len(edits)>=2: break
  p=pm.get(p)
 for k,(_,e) in enumerate(sorted(edits)):
  tap(e)
  for _ in range(12): adb("shell","input","keyevent","67",check=False)
  adb("shell","input","text","1.30" if k==0 else "10")
  adb("shell","input","keyevent","4",check=False)
 r=dump(dirp,"vsfactor-filled"); record(dirp.name,"vsfactor-filled",r); shot(dirp,"vsfactor-filled")

def exercise_profile(label,size,density):
 dirp=OUT/label; dirp.mkdir(parents=True,exist_ok=True)
 launch(size,density)
 r=dump(dirp,"baseline"); record(label,"baseline",r); shot(dirp,"baseline")

 for key in ["alt","temp","speed","nz","angle1","angle2","wind"]:
  spec=FIELDS[key]
  for j,choice in enumerate(spec["choices"]):
   choose(dirp,spec["buttons"],spec["expected"],choice,f"{key}-{j}-{norm(choice)[:28]}")

 fill_vsfactor(dirp)

 choose(dirp,FIELDS["alt"]["buttons"],FIELDS["alt"]["expected"],"Pressure Altitude","alt-length-mode")
 cycle_units(dirp,FIELDS["alt"]["buttons"],["ft","m","km","nm","mi","in"],"alt-length")
 choose(dirp,FIELDS["alt"]["buttons"],FIELDS["alt"]["expected"],"Pressure","alt-pressure-mode")
 cycle_units(dirp,FIELDS["alt"]["buttons"],["mbar","Pa","hPa","atm","mmHg","psi"],"alt-pressure")

 choose(dirp,FIELDS["temp"]["buttons"],FIELDS["temp"]["expected"],"Outside Air Temperature","temp-mode")
 cycle_units(dirp,FIELDS["temp"]["buttons"],["°C","°F","K"],"temp")

 choose(dirp,FIELDS["speed"]["buttons"],FIELDS["speed"]["expected"],"TAS","speed-mode")
 cycle_units(dirp,FIELDS["speed"]["buttons"],["kt","m/s","km/h","mph","ft/s"],"speed")
 choose(dirp,FIELDS["speed"]["buttons"],FIELDS["speed"]["expected"],"Dynamic Pressure","speed-pressure-mode")
 cycle_units(dirp,FIELDS["speed"]["buttons"],["mbar","Pa","hPa","atm","mmHg","psi"],"speed-pressure")

 cycle_units(dirp,["Weight"],["kg","lb","ton","slug","oz"],"weight")
 cycle_units(dirp,["SREF","Area SREF"],["m²","ft²","in²","cm²","mm²"],"sref")
 cycle_units(dirp,["cREF","Chord cREF"],["m","ft","in","cm","mm"],"cref")
 cycle_units(dirp,FIELDS["angle1"]["buttons"],["deg","rad"],"angle1")
 cycle_units(dirp,FIELDS["angle2"]["buttons"],["deg","rad"],"angle2")
 cycle_units(dirp,FIELDS["wind"]["buttons"],["kt","m/s","km/h"],"wind-speed")
 cycle_units(dirp,["Runway Angle","Rnwy Angle","Wind Direction","WindDir","Wind Dir"],["deg","rad"],"wind-angle")

 top(dirp); rr=dump(dirp,"final-top"); record(label,"final-top",rr); shot(dirp,"final-top")
 for _ in range(8): swipe(True)
 rr=dump(dirp,"final-bottom"); record(label,"final-bottom",rr); shot(dirp,"final-bottom")

def main():
 adb("wait-for-device")
 adb("install","-r",APK)
 for profile,size,density in PROFILES:
  exercise_profile(profile,size,density)
 (OUT/"report.json").write_text(json.dumps(REPORT,indent=2,ensure_ascii=False),encoding="utf-8")
 print(json.dumps({"profiles":[p[0] for p in PROFILES],"checks":len(REPORT)},indent=2))

try:
 main()
except Exception as e:
 REPORT.append({"error":f"{type(e).__name__}: {e}"})
 (OUT/"report.json").write_text(json.dumps(REPORT,indent=2,ensure_ascii=False),encoding="utf-8")
 raise
finally:
 adb("shell","wm","size","reset",check=False)
 adb("shell","wm","density","reset",check=False)
 adb("shell","cmd","window","user-rotation","free",check=False)
