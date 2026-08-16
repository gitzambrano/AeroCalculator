B4A=true
Group=Default Group
ModulesStructureVersion=1
Type=Activity
Version=5.8
@EndOfDesignText@
#Region  Activity Attributes 
	#FullScreen: False
	#IncludeTitle: False
#End Region

#Region  Module Attributes 
'#IgnoreWarnings: 1, 2, 3, 4, 5, 6
	'List of warnings that will be ignored in this module.
'#ExcludeFromDebugger: False
	'Whether to exclude this module from the debugger.
	'Debug information will not be added to this module.
	'Values: True or False
'#ExcludeFromLibrary: False
	'Whether to exclude this module during library compilation.
	'Values: True or False
#End Region

Sub Process_Globals
	'These global variables will be declared once when the application starts.
	'These variables can be accessed from all modules.
	
	Dim add As Int
	
	Private rp As RuntimePermissions
	
	
End Sub

Sub Globals
	'These global variables will be redeclared each time the activity is created.
	'These variables can only be accessed from this module.
	
	Dim pnlBack0 As Panel
	Dim scvMain0 As ScrollView
	Dim pnl1 As Panel 
	Dim pnl2 As Panel 
	Dim pnl3 As Panel 
	Dim pnl4 As Panel
	Dim pnl5 As Panel
	Dim pnlTransp1 As Panel
	Dim pnlTransp2 As Panel
	
	Dim lblCLmax As Label
	
	Dim edtName As EditText
	Dim edtSref As EditText
	Dim edtcref As EditText
	Dim edtWeight1 As EditText
	Dim edtWeight2 As EditText
	Dim edtWeight3 As EditText
	Dim edtWeight4 As EditText
	Dim edtWeight5 As EditText
	Dim edtWeight6 As EditText
	Dim edtCLmax0 As EditText
	Dim edtCLmax1 As EditText
	Dim edtCLmax2 As EditText
	Dim edtCLmax3 As EditText
	Dim edtCLmax4 As EditText
	Dim edtCLmax5 As EditText
	Dim edtCLmax6 As EditText
	Dim edtCLmax7 As EditText
	Dim edtCLmax8 As EditText
	Dim edtCLmax9 As EditText
	Dim edtCLmax10 As EditText
	Dim edtCLmax11 As EditText
	Dim edtCLmax12 As EditText
	Dim edtCLmax13 As EditText
	
	Dim btnSrefUnit As Button
	Dim btncrefUnit As Button
	Dim btnWeightUnit As Button
	
	Dim indSrefUnit As Int
	Dim indcrefUnit As Int
	Dim indWeightUnit As Int
	
	Dim ID As Int
	
	
End Sub

Sub Activity_Create (FirstTime As Boolean)
	'Do not forget to load the layout file created with the visual designer. For example:
	'Activity.LoadLayout("Layout1")

	indSrefUnit = 0
	indcrefUnit = 0
	indcrefUnit = 0
	
	If File.Exists(rp.GetSafeDirDefaultExternal(""), "airplanes.txt") Then
		'Main.a = File.ReadMap(File.DirDefaultExternal,"airplanes.txt")
		ID = Main.a.GetDefault("N",0) + 1
	Else
		ID = 1
	End If
	
	pnlBack0.Initialize("")
	pnlBack0.Color = Main.ColorPnlInput1
    scvMain0.Initialize(100%y-(50dip*Main.sc))
	pnlBack0.AddView(scvMain0, 0, 0, 100%x, Activity.Height)
	pnl1.Initialize("")
	pnl2.Initialize("")
	pnl3.Initialize("")
	pnl4.Initialize("")
	pnl5.Initialize("")
	
	Dim He,ii As Int
	For ii= 0 To 4
		If ii<3 Then
		He = 50dip
		Else If ii = 3 Then
			He = 4 * 50dip
		Else
			He = 50dip
		End If
		CreateItem(ii, He)
	Next

	Activity.AddView(pnlBack0, 0, 50dip*Main.sc, 100%x, Activity.Height-50dip*Main.sc)
	
	Dim pnltitle As Panel 
	pnltitle.Initialize("pnltitle")
	Activity.AddView(pnltitle, 0, 0, 100%x, 50dip*Main.sc)
	pnltitle.Color = Main.ColorPnlTitle
	
	Dim img2 As ImageView
	Dim bmpImage2 As Bitmap
	Dim label2 As Label
	Dim pnlTransparent2 As Panel
	pnlTransparent2.Initialize("pnlTransparent2")
	pnlTransparent2.Color =  Colors.Transparent
	pnltitle.AddView(pnlTransparent2,  50%x, 0, 50%x, 100%y)
	bmpImage2.Initialize(File.DirAssets,"ic_action_cancel.png")
	img2.Initialize("img2")
	img2.Bitmap = bmpImage2
	pnlTransparent2.AddView(img2, 0, 6dip*Main.sc, 34dip*Main.sc, 34dip*Main.sc)
	img2.Gravity = Gravity.FILL
	label2.Initialize("label2")
	label2.Color =  Colors.Transparent
	label2.Text = "Cancel"
	label2.TextColor = Main.ColorTitleText
	label2.TextSize = 16 * Main.sc
	label2.Gravity = Gravity.CENTER_VERTICAL
	Dim xx2 As Canvas
	Dim wid2 As Int
	xx2.Initialize(Activity)
	wid2=xx2.MeasureStringWidth("Cancel",Typeface.DEFAULT,16*Main.sc)
	If Main.sc > 1 Or Main.ld = 1 Or Main.xx>780 Then
				label2.TextSize=18*Main.sc
				wid2=xx2.MeasureStringWidth("Cancel",Typeface.DEFAULT,18*Main.sc)
	End If
	pnlTransparent2.AddView(label2, 34dip*Main.sc+5dip, 6dip * Main.sc, 50%x-34dip*Main.sc-5dip, 34dip * Main.sc)
	img2.Left = (50%x - img2.Width-5dip-wid2)/2
	label2.Left = img2.Left+img2.Width+5dip	
	
	Dim img3 As ImageView
	Dim bmpImage3 As Bitmap
	Dim label3 As Label
	Dim pnlTransparent3 As Panel
	pnlTransparent3.Initialize("pnlTransparent3")
	pnlTransparent3.Color =  Colors.Transparent
	pnltitle.AddView(pnlTransparent3,  0%x, 0, 50%x, 100%y)
	bmpImage3.Initialize(File.DirAssets,"ic_action_accept.png")
	img3.Initialize("img3")
	img3.Bitmap = bmpImage3
	pnlTransparent3.AddView(img3, 0, 6dip*Main.sc, 34dip*Main.sc, 34dip*Main.sc)
	img3.Gravity = Gravity.FILL
	label3.Initialize("label3")
	label3.Color =  Colors.Transparent
	label3.Text = "Save"
	label3.TextColor = Main.ColorTitleText
	label3.TextSize = 16 * Main.sc
	label3.Gravity = Gravity.CENTER_VERTICAL
	Dim xx3 As Canvas
	Dim wid3 As Int
	xx3.Initialize(Activity)
	wid3=xx3.MeasureStringWidth("Save",Typeface.DEFAULT,16*Main.sc)
	If Main.sc > 1 Or Main.ld = 1 Or Main.xx>780 Then
				label3.TextSize=18*Main.sc
				wid3=xx3.MeasureStringWidth("Save",Typeface.DEFAULT,18*Main.sc)
	End If
	pnlTransparent3.AddView(label3, 34dip*Main.sc+5dip, 6dip * Main.sc, 50%x-34dip*Main.sc-5dip, 34dip * Main.sc)
	img3.Left = (50%x - img3.Width-5dip-wid3)/2
	label3.Left = img3.Left+img3.Width+5dip
	
	Dim paneldiv As Panel
	paneldiv.Initialize("paneldiv")
	paneldiv.Color =  Colors.White
	pnltitle.AddView(paneldiv,  50%x, 0, 1dip, 100%y)
	
End Sub

Sub Activity_Resume
	If Main.ID_edt > 0 Then
		ID = Main.ID_edt
		edtName.Text = Main.a.Get(ID & "_Name")
		edtSref.Text = Main.a.Get(ID & "_S")
		edtcref.Text = Main.a.Get(ID & "_c")
		edtWeight1.Text = Main.a.Get(ID & "_W1")
		edtWeight2.Text = Main.a.Get(ID & "_W2")
		edtWeight3.Text = Main.a.Get(ID & "_W3")
		edtWeight4.Text = Main.a.Get(ID & "_W4")
		edtWeight5.Text = Main.a.GetDefault(ID & "_W5","")
		edtWeight6.Text = Main.a.GetDefault(ID & "_W6","")

		indSrefUnit = Main.a.Get(ID & "_Sunit")
		indcrefUnit = Main.a.Get(ID & "_cunit")
		indWeightUnit = Main.a.Get(ID & "_Wunit")
		add = 0
		SrefUnit
		crefUnit
		WeightUnit
		
		Dim f0,f1, f2, f3, f4,f5,f6,f7,f8,f9,f10,f11,f12,f13 As String
		f0 = Main.a.GetDefault(ID & "_F0","")
		f1 = Main.a.GetDefault(ID & "_F1","")
		f2 = Main.a.GetDefault(ID & "_F2","")
		f3 = Main.a.GetDefault(ID & "_F3","")
		f4 = Main.a.GetDefault(ID & "_F4","")
		f5 = Main.a.GetDefault(ID & "_F5","")
		f6 = Main.a.GetDefault(ID & "_F6","")
		f7 = Main.a.GetDefault(ID & "_F7","")
		f8 = Main.a.GetDefault(ID & "_F8","")
		f9 = Main.a.GetDefault(ID & "_F9","")
		f10 = Main.a.GetDefault(ID & "_F10","")
		f11 = Main.a.GetDefault(ID & "_F11","")
		f12 = Main.a.GetDefault(ID & "_F12","")
		f13 = Main.a.GetDefault(ID & "_F13","")
		
		Dim v As View
		If f0.CompareTo("")<>0 And f0.CompareTo("null")<>0 Then
			For ii=2 To 3 
			v = pnl5.GetView(ii)
			v.Visible = True
			Next
			pnl5.Height = 100dip
			scvMain0.Panel.Height = 450dip
			pnlTransp2.Top = 50dip
		End If
		If f1.CompareTo("")<>0 And f1.CompareTo("null")<>0 Then
			For ii=5 To 2 Step-1
			v = pnl5.GetView(ii)
			v.Visible = True
			Next
			pnl5.Height = 100dip
			scvMain0.Panel.Height = 450dip
			pnlTransp2.Top = 50dip
		End If		
		If f2.CompareTo("")<>0 And f2.CompareTo("null")<>0 Then
			For ii=7 To 2 Step-1
			v = pnl5.GetView(ii)
			v.Visible = True
			Next
			pnl5.Height = 150dip
			scvMain0.Panel.Height = 500dip
			pnlTransp2.Top = 100dip
		End If
		If f3.CompareTo("")<>0 And f3.CompareTo("null")<>0  Then
			For ii=9 To 2 Step-1
			v = pnl5.GetView(ii)
			v.Visible = True
			Next
			pnl5.Height = 150dip
			scvMain0.Panel.Height = 500dip
			pnlTransp2.Top = 100dip
		End If		
		If f4.CompareTo("")<>0 And f4.CompareTo("null")<>0 Then
			For ii=11 To 2 Step-1
			v = pnl5.GetView(ii)
			v.Visible = True
			Next
			pnl5.Height = 200dip
			scvMain0.Panel.Height = 550dip
			pnlTransp2.Top = 150dip
		End If
		If f5.CompareTo("")<>0 And f5.CompareTo("null")<>0 Then
			For ii=13 To 2 Step-1
			v = pnl5.GetView(ii)
			v.Visible = True
			Next
			pnl5.Height = 200dip
			scvMain0.Panel.Height = 550dip
			pnlTransp2.Top = 150dip
		End If
		If f6.CompareTo("")<>0 And f6.CompareTo("null")<>0 Then
			For ii=15 To 2 Step-1
			v = pnl5.GetView(ii)
			v.Visible = True
			Next
			pnl5.Height = 250dip
			scvMain0.Panel.Height = 600dip
			pnlTransp2.Top = 200dip
		End If
		If f7.CompareTo("")<>0 And f7.CompareTo("null")<>0 Then
			For ii=17 To 2 Step-1
			v = pnl5.GetView(ii)
			v.Visible = True
			Next
			pnl5.Height = 250dip
			scvMain0.Panel.Height = 600dip
			pnlTransp2.Top = 200dip
		End If
		If f8.CompareTo("")<>0 And f8.CompareTo("null")<>0 Then
			For ii=19 To 2 Step-1
			v = pnl5.GetView(ii)
			v.Visible = True
			Next
			pnl5.Height = 300dip
			scvMain0.Panel.Height = 650dip
			pnlTransp2.Top = 250dip
		End If
		If f9.CompareTo("")<>0 And f9.CompareTo("null")<>0 Then
			For ii=21 To 2 Step-1
			v = pnl5.GetView(ii)
			v.Visible = True
			Next
			pnl5.Height = 300dip
			scvMain0.Panel.Height = 650dip
			pnlTransp2.Top = 250dip
		End If
		If f10.CompareTo("")<>0 And f10.CompareTo("null")<>0 Then
			For ii=23 To 2 Step-1
			v = pnl5.GetView(ii)
			v.Visible = True
			Next
			pnl5.Height = 350dip
			scvMain0.Panel.Height = 700dip
			pnlTransp2.Top = 300dip
		End If
		If f11.CompareTo("")<>0 And f11.CompareTo("null")<>0 Then
			For ii=25 To 2 Step-1
			v = pnl5.GetView(ii)
			v.Visible = True
			Next
			pnl5.Height = 350dip
			scvMain0.Panel.Height = 700dip
			pnlTransp2.Top = 300dip
		End If
		If f12.CompareTo("")<>0 And f12.CompareTo("null")<>0 Then
			For ii=27 To 2 Step-1
			v = pnl5.GetView(ii)
			v.Visible = True
			Next
			pnl5.Height = 400dip
			scvMain0.Panel.Height = 750dip
			pnlTransp2.Top = 350dip
		End If
		If f13.CompareTo("")<>0 And f13.CompareTo("null")<>0 Then
			For ii=29 To 2 Step-1
			v = pnl5.GetView(ii)
			v.Visible = True
			Next
			pnl5.Height = 400dip
			scvMain0.Panel.Height = 750dip
			pnlTransp2.Top =350dip
		End If
		
		Dim pd As Panel
		pd = pnl5.GetView(0)
		pd.Top = pnl5.Height-1dip
		
		edtCLmax0.Text = Main.a.GetDefault(ID & "_F0","")
		edtCLmax1.Text = Main.a.GetDefault(ID & "_F1","")
		edtCLmax2.Text = Main.a.GetDefault(ID & "_F2","")
		edtCLmax3.Text = Main.a.GetDefault(ID & "_F3","")
		edtCLmax4.Text = Main.a.GetDefault(ID & "_F4","")
		edtCLmax5.Text = Main.a.GetDefault(ID & "_F5","")
		edtCLmax6.Text = Main.a.GetDefault(ID & "_F6","")
		edtCLmax7.Text = Main.a.GetDefault(ID & "_F7","")
		edtCLmax8.Text = Main.a.GetDefault(ID & "_F8","")
		edtCLmax9.Text = Main.a.GetDefault(ID & "_F9","")
		edtCLmax10.Text = Main.a.GetDefault(ID & "_F10","")
		edtCLmax11.Text = Main.a.GetDefault(ID & "_F11","")
		edtCLmax12.Text = Main.a.GetDefault(ID & "_F12","")
		edtCLmax13.Text = Main.a.GetDefault(ID & "_F13","")
		
	Else
		add=1
	End If
	scvMain0.Panel.Height = pnl1.Height+pnl2.Height+pnl3.Height+pnl4.Height+pnl5.Height + 50dip
End Sub

Sub Activity_Pause (UserClosed As Boolean)
	
End Sub

Sub CreateItem(ii As Int, He As Int)
	Dim pnldiv As Panel : pnldiv.Initialize("")
	pnldiv.Color = Main.ColorPnlLine3
	Dim filter As IME
	filter.Initialize("")	
	Select ii
		Case 0
			pnl1.Color = Main.ColorPnlInput1
			scvMain0.Panel.AddView(pnl1, 0, 0, 100%x, He)
			pnl1.AddView (pnldiv,0,(pnl1.Height-1dip),100%x,1dip)
			Dim lblName As Label: lblName.Initialize("")
			lblName.Gravity = Gravity.LEFT
			lblName.Tag = ii 'The panel tag is reserved, so we use the label tag (this will be used later to sort)
			lblName.Text = "Name"
			lblName.TextColor = Main.ColorButText1
			lblName.TextSize = 15
			lblName.Typeface = Typeface.DEFAULT_BOLD
			pnl1.AddView(lblName, 1%x, 8dip, 20%x, 34dip)
			edtName.Initialize("edtName")
		    pnl1.AddView(edtName,21%x, 8dip, 55%x, 34dip)
			edtName.Hint = "Aircraft Name"	
			edtName.InputType = edtName.INPUT_TYPE_TEXT
			edtName.ForceDoneButton = True
			edtName.TextSize = 13
			edtName.TextColor = Main.ColorEdtText
			edtName.Color = Main.ColorEdt
			edtName.HintColor = Main.ColorEdtHint
			
		Case 1
			pnl2.Color = Main.ColorPnlInput1
			scvMain0.Panel.AddView(pnl2, 0, pnl1.Height + pnl1.Top, 100%x, He)
			pnl2.AddView (pnldiv,0,pnl2.Height-1dip,100%x,1dip)
			Dim lblSref As Label: lblSref.Initialize("")
			lblSref.Gravity = Gravity.LEFT
			lblSref.Tag = ii 'The panel tag is reserved, so we use the label tag (this will be used later to sort)
			Dim rs1 As RichString
			rs1.Initialize("S{T}{S}REF{T}{S}")
			rs1.Subscript2("{S}")
			rs1.RelativeSize2(.7,"{T}")
			lblSref.Text = rs1
			lblSref.TextColor = Main.ColorButText1
			lblSref.TextSize = 15
			lblSref.Typeface = Typeface.DEFAULT_BOLD
			pnl2.AddView(lblSref, 1%x, 8dip, 20%x, 34dip)
			edtSref.Initialize("edtSref")
		    pnl2.AddView(edtSref,21%x, 8dip, 55%x, 34dip)
			edtSref.Hint = "Reference Area"	
			edtSref.InputType = edtSref.INPUT_TYPE_DECIMAL_NUMBERS
			edtSref.ForceDoneButton = True
			edtSref.TextSize = 13
			filter.SetCustomFilter(edtSref, edtSref.INPUT_TYPE_DECIMAL_NUMBERS, "0123456789.")
			btnSrefUnit.Initialize("btnSrefUnit")
			btnSrefUnit.Background = ButtonGradient(Array As Int(Main.ColorBut1, Main.ColorBut2),Array As Int(Main.ColorBut1, Main.ColorPnlTitle))
		    pnl2.AddView(btnSrefUnit,77%x, 8dip, 20%x, 34dip)
		    btnSrefUnit.Text="m²"
			btnSrefUnit.TextSize = 11
			edtSref.TextColor = Main.ColorEdtText
			edtSref.Color = Main.ColorEdt
			edtSref.HintColor = Main.ColorEdtHint
			btnSrefUnit.TextColor = Main.ColorButText1
			
		Case 2
			pnl3.Color = Main.ColorPnlInput1
			scvMain0.Panel.AddView(pnl3,0,pnl2.Height+pnl2.Top,100%x,He)
			pnl3.AddView (pnldiv,0,pnl3.Height-1dip,100%x,1dip)
			Dim lblcref As Label: lblcref.Initialize("")
			lblcref.Gravity = Gravity.LEFT
			lblcref.Tag = ii 'The panel tag is reserved, so we use the label tag (this will be used later to sort)
			Dim rs2 As RichString
			rs2.Initialize("c{T}{S}REF{T}{S}")
			rs2.Subscript2("{S}")
			rs2.RelativeSize2(.7,"{T}")
			lblcref.Text = rs2
			lblcref.TextColor = Main.ColorButText1
			lblcref.TextSize = 15
			lblcref.Typeface = Typeface.DEFAULT_BOLD
			pnl3.AddView(lblcref, 1%x, 8dip, 20%x, 34dip)
			edtcref.Initialize("edtcref")
		    pnl3.AddView(edtcref,21%x, 8dip, 55%x, 34dip)
			edtcref.Hint = "Reference Chord"	
			edtcref.InputType = edtcref.INPUT_TYPE_DECIMAL_NUMBERS
			edtcref.ForceDoneButton = True
			edtcref.TextSize = 13
			filter.SetCustomFilter(edtcref, edtcref.INPUT_TYPE_DECIMAL_NUMBERS, "0123456789.")
			btncrefUnit.Initialize("btncrefUnit")
			btncrefUnit.Background = ButtonGradient(Array As Int(Main.ColorBut1, Main.ColorBut2),Array As Int(Main.ColorBut1, Main.ColorPnlTitle))
		    pnl3.AddView(btncrefUnit,77%x, 8dip, 20%x, 34dip)
		    btncrefUnit.Text="m"
			btncrefUnit.TextSize = 11
			edtcref.TextColor = Main.ColorEdtText
			edtcref.Color = Main.ColorEdt
			edtcref.HintColor = Main.ColorEdtHint
			btncrefUnit.TextColor = Main.ColorButText1
		
		Case 3
			pnl4.Color = Main.ColorPnlInput1
			scvMain0.Panel.AddView(pnl4,0,pnl3.Height+pnl3.Top,100%x,He)
			pnl4.AddView (pnldiv,0,pnl4.Height-1dip,100%x,1dip)
			
			Dim lblWeight As Label: lblWeight.Initialize("")
			lblWeight.Gravity = Gravity.LEFT
			lblWeight.Tag = ii 'The panel tag is reserved, so we use the label tag (this will be used later to sort)
			lblWeight.Text = "Weight"
			lblWeight.TextColor = Main.ColorButText1
			lblWeight.TextSize = 15
			lblWeight.Typeface = Typeface.DEFAULT_BOLD
			pnl4.AddView(lblWeight, 1%x, 8dip, 20%x, 34dip)
		
			btnWeightUnit.Initialize("btnWeightUnit")
			btnWeightUnit.Background = ButtonGradient(Array As Int(Main.ColorBut1, Main.ColorBut2),Array As Int(Main.ColorBut1, Main.ColorPnlTitle))
		    pnl4.AddView(btnWeightUnit,77%x, 8dip, 20%x, 34dip)
		    btnWeightUnit.Text="Kg"
			btnWeightUnit.TextSize = 11
			btnWeightUnit.TextColor = Main.ColorButText1
		
		 	Dim lblWeight1 As Label: lblWeight1.Initialize("")
			lblWeight1.Gravity = Bit.Or(Gravity.CENTER_VERTICAL, Gravity.RIGHT)
			lblWeight1.Tag = ii 'The panel tag is reserved, so we use the label tag (this will be used later to sort)
			lblWeight1.Text = "MTOW"
			lblWeight1.TextColor = Main.ColorButText1
			lblWeight1.TextSize = 15
			pnl4.AddView(lblWeight1, 1%x, 50dip, 20%x, 34dip)
			edtWeight1.Initialize("edtWeight1")
		    pnl4.AddView(edtWeight1,22%x, 50dip, 27%x, 34dip)
			edtWeight1.Hint = "MTOW"	
			edtWeight1.InputType = edtWeight1.INPUT_TYPE_DECIMAL_NUMBERS
			edtWeight1.ForceDoneButton = True
			edtWeight1.TextSize = 13
			filter.SetCustomFilter(edtWeight1, edtWeight1.INPUT_TYPE_DECIMAL_NUMBERS, "0123456789.")
			edtWeight1.TextColor = Main.ColorEdtText
			edtWeight1.Color = Main.ColorEdt
			edtWeight1.HintColor = Main.ColorEdtHint
		
			Dim lblWeight2 As Label: lblWeight2.Initialize("")
			lblWeight2.Gravity = Bit.Or(Gravity.CENTER_VERTICAL, Gravity.RIGHT)
			lblWeight2.Tag = ii 'The panel tag is reserved, so we use the label tag (this will be used later to sort)
			lblWeight2.Text = "MLW"
			lblWeight2.TextColor = Main.ColorButText1
			lblWeight2.TextSize = 15
			pnl4.AddView(lblWeight2, 50%x, 50dip, 20%x, 34dip)
			edtWeight2.Initialize("edtWeight2")
		    pnl4.AddView(edtWeight2,71%x, 50dip, 27%x, 34dip)
			edtWeight2.Hint = "MLW"	
			edtWeight2.InputType = edtWeight2.INPUT_TYPE_DECIMAL_NUMBERS
			edtWeight2.ForceDoneButton = True
			edtWeight2.TextSize = 13
			filter.SetCustomFilter(edtWeight2, edtWeight2.INPUT_TYPE_DECIMAL_NUMBERS, "0123456789.")
			edtWeight2.TextColor = Main.ColorEdtText
			edtWeight2.Color = Main.ColorEdt
			edtWeight2.HintColor = Main.ColorEdtHint
		
			Dim lblWeight3 As Label: lblWeight3.Initialize("")
			lblWeight3.Gravity = Bit.Or(Gravity.CENTER_VERTICAL, Gravity.RIGHT)
			lblWeight3.Tag = ii 'The panel tag is reserved, so we use the label tag (this will be used later to sort)
			lblWeight3.Text = "MZFW"
			lblWeight3.TextColor = Main.ColorButText1
			lblWeight3.TextSize = 15
			pnl4.AddView(lblWeight3, 1%x, 100dip, 20%x, 34dip)
			edtWeight3.Initialize("edtWeight3")
		    pnl4.AddView(edtWeight3,22%x, 100dip, 27%x, 34dip)
			edtWeight3.Hint = "MZFW"	
			edtWeight3.InputType = edtWeight3.INPUT_TYPE_DECIMAL_NUMBERS
			edtWeight3.ForceDoneButton = True
			edtWeight3.TextSize = 13
			filter.SetCustomFilter(edtWeight3, edtWeight3.INPUT_TYPE_DECIMAL_NUMBERS, "0123456789.")
			edtWeight3.TextColor = Main.ColorEdtText
			edtWeight3.Color = Main.ColorEdt
			edtWeight3.HintColor = Main.ColorEdtHint
		
			Dim lblWeight4 As Label: lblWeight4.Initialize("")
			lblWeight4.Gravity = Bit.Or(Gravity.CENTER_VERTICAL, Gravity.RIGHT)
			lblWeight4.Tag = ii 'The panel tag is reserved, so we use the label tag (this will be used later to sort)
			lblWeight4.Text = "BOW"
			lblWeight4.TextColor = Main.ColorButText1
			lblWeight4.TextSize = 15
			pnl4.AddView(lblWeight4, 50%x, 100dip, 20%x, 34dip)
			edtWeight4.Initialize("edtWeight4")
		    pnl4.AddView(edtWeight4,71%x, 100dip, 27%x, 34dip)
			edtWeight4.Hint = "BOW"	
			edtWeight4.InputType = edtWeight4.INPUT_TYPE_DECIMAL_NUMBERS
			edtWeight4.ForceDoneButton = True
			edtWeight4.TextSize = 13
			filter.SetCustomFilter(edtWeight4, edtWeight4.INPUT_TYPE_DECIMAL_NUMBERS, "0123456789.")
			edtWeight4.TextColor = Main.ColorEdtText
			edtWeight4.Color = Main.ColorEdt
			edtWeight4.HintColor = Main.ColorEdtHint
			
			Dim lblWeight5 As Label: lblWeight5.Initialize("")
			lblWeight5.Gravity = Bit.Or(Gravity.CENTER_VERTICAL, Gravity.RIGHT)
			lblWeight5.Tag = ii 'The panel tag is reserved, so we use the label tag (this will be used later to sort)
			lblWeight5.Text = "Heavy"
			lblWeight5.TextColor = Main.ColorButText1
			lblWeight5.TextSize = 15
			pnl4.AddView(lblWeight5, 1%x, 150dip, 20%x, 34dip)
			edtWeight5.Initialize("edtWeight5")
		    pnl4.AddView(edtWeight5,22%x, 150dip, 27%x, 34dip)
			edtWeight5.Hint = "Heavy"	
			edtWeight5.InputType = edtWeight5.INPUT_TYPE_DECIMAL_NUMBERS
			edtWeight5.ForceDoneButton = True
			edtWeight5.TextSize = 13
			filter.SetCustomFilter(edtWeight5, edtWeight5.INPUT_TYPE_DECIMAL_NUMBERS, "0123456789.")
			edtWeight5.TextColor = Main.ColorEdtText
			edtWeight5.Color = Main.ColorEdt
			edtWeight5.HintColor = Main.ColorEdtHint
		
			Dim lblWeight6 As Label: lblWeight6.Initialize("")
			lblWeight6.Gravity = Bit.Or(Gravity.CENTER_VERTICAL, Gravity.RIGHT)
			lblWeight6.Tag = ii 'The panel tag is reserved, so we use the label tag (this will be used later to sort)
			lblWeight6.Text = "Light"
			lblWeight6.TextColor = Main.ColorButText1
			lblWeight6.TextSize = 15
			pnl4.AddView(lblWeight6, 50%x, 150dip, 20%x, 34dip)
			edtWeight6.Initialize("edtWeight6")
		    pnl4.AddView(edtWeight6,71%x, 150dip, 27%x, 34dip)
			edtWeight6.Hint = "Light"	
			edtWeight6.InputType = edtWeight6.INPUT_TYPE_DECIMAL_NUMBERS
			edtWeight6.ForceDoneButton = True
			edtWeight6.TextSize = 13
			filter.SetCustomFilter(edtWeight6, edtWeight6.INPUT_TYPE_DECIMAL_NUMBERS, "0123456789.")
			edtWeight6.TextColor = Main.ColorEdtText
			edtWeight6.Color = Main.ColorEdt
			edtWeight6.HintColor = Main.ColorEdtHint
		
		Case 4
		    pnl5.Color = Main.ColorPnlInput1
			scvMain0.Panel.AddView(pnl5, 0, pnl4.Height + pnl4.Top, 100%x, He)
			pnl5.AddView (pnldiv,0,pnl5.Height-1dip,100%x,1dip)
			
			Dim rs3 As RichString
			rs3.Initialize("CL{T}{S}MAX{T}{S}")
			rs3.Subscript2("{S}")
			rs3.RelativeSize2(.7,"{T}")
			lblCLmax.Initialize("")
			lblCLmax.Gravity = Gravity.LEFT
			lblCLmax.Tag = ii 'The panel tag is reserved, so we use the label tag (this will be used later to sort)
			lblCLmax.Text = rs3
			lblCLmax.TextColor = Main.ColorButText1
			lblCLmax.TextSize = 15
			lblCLmax.Typeface = Typeface.DEFAULT_BOLD
			pnl5.AddView(lblCLmax, 1%x, 8dip, 20%x, 34dip)
		
			Dim aa As Double
			Dim bb As Double
		
			aa = 20%x
			bb = 18%x
		
			Dim lblCLmax0 As Label: lblCLmax0.Initialize("")
			lblCLmax0.Gravity = Bit.Or(Gravity.CENTER_VERTICAL, Gravity.RIGHT)
			lblCLmax0.Tag = ii 'The panel tag is reserved, so we use the label tag (this will be used later to sort)
			lblCLmax0.Text = "Flap 0"
			lblCLmax0.TextColor = Main.ColorButText1
			lblCLmax0.TextSize = 15
			pnl5.AddView(lblCLmax0, 1%x, 50dip, aa, 34dip)
			edtCLmax0.Initialize("edtCLmax0")
		    pnl5.AddView(edtCLmax0,lblCLmax0.Width+2%x, 50dip, bb, 34dip)
			edtCLmax0.Hint = "Flap 0"	
			edtCLmax0.InputType = edtCLmax0.INPUT_TYPE_DECIMAL_NUMBERS
			edtCLmax0.ForceDoneButton = True
			edtCLmax0.TextSize = 13
			filter.SetCustomFilter(edtCLmax0, edtCLmax0.INPUT_TYPE_DECIMAL_NUMBERS, "0123456789.")
			edtCLmax0.TextColor = Main.ColorEdtText
			edtCLmax0.Color = Main.ColorEdt
			edtCLmax0.HintColor = Main.ColorEdtHint
		
			Dim lblCLmax1 As Label: lblCLmax1.Initialize("")
			lblCLmax1.Gravity = Bit.Or(Gravity.CENTER_VERTICAL, Gravity.RIGHT)
			lblCLmax1.Tag = ii 'The panel tag is reserved, so we use the label tag (this will be used later to sort)
			lblCLmax1.Text = "Flap 1"
			lblCLmax1.TextColor = Main.ColorButText1
			lblCLmax1.TextSize = 15
			pnl5.AddView(lblCLmax1, (edtCLmax0.Left+edtCLmax0.Width)+1%x, 50dip, aa, 34dip)
			edtCLmax1.Initialize("edtCLmax1")
		    pnl5.AddView(edtCLmax1,(lblCLmax1.Left+lblCLmax1.Width)+1%x, 50dip, bb, 34dip)
			edtCLmax1.Hint = "Flap 1"	
			edtCLmax1.InputType = edtCLmax1.INPUT_TYPE_DECIMAL_NUMBERS
			edtCLmax1.ForceDoneButton = True
			edtCLmax1.TextSize = 13
			filter.SetCustomFilter(edtCLmax1, edtCLmax1.INPUT_TYPE_DECIMAL_NUMBERS, "0123456789.")
			edtCLmax1.TextColor = Main.ColorEdtText
			edtCLmax1.Color = Main.ColorEdt
			edtCLmax1.HintColor = Main.ColorEdtHint
		
			Dim lblCLmax2 As Label: lblCLmax2.Initialize("")
			lblCLmax2.Gravity = Bit.Or(Gravity.CENTER_VERTICAL, Gravity.RIGHT)
			lblCLmax2.Tag = ii 'The panel tag is reserved, so we use the label tag (this will be used later to sort)
			lblCLmax2.Text = "Flap 2"
			lblCLmax2.TextColor = Main.ColorButText1
			lblCLmax2.TextSize = 15
			pnl5.AddView(lblCLmax2, 1%x, 100dip, aa, 34dip)
			edtCLmax2.Initialize("edtCLmax2")
		    pnl5.AddView(edtCLmax2,lblCLmax2.Width+2%x, 100dip, bb, 34dip)
			edtCLmax2.Hint = "Flap 2"	
			edtCLmax2.InputType = edtCLmax2.INPUT_TYPE_DECIMAL_NUMBERS
			edtCLmax2.ForceDoneButton = True
			edtCLmax2.TextSize = 13
			filter.SetCustomFilter(edtCLmax2, edtCLmax2.INPUT_TYPE_DECIMAL_NUMBERS, "0123456789.")
			edtCLmax2.TextColor = Main.ColorEdtText
			edtCLmax2.Color = Main.ColorEdt
			edtCLmax2.HintColor = Main.ColorEdtHint
		
			Dim lblCLmax3 As Label: lblCLmax3.Initialize("")
			lblCLmax3.Gravity = Bit.Or(Gravity.CENTER_VERTICAL, Gravity.RIGHT)
			lblCLmax3.Tag = ii 'The panel tag is reserved, so we use the label tag (this will be used later to sort)
			lblCLmax3.Text = "Flap 3"
			lblCLmax3.TextColor = Main.ColorButText1
			lblCLmax3.TextSize = 15
			pnl5.AddView(lblCLmax3, (edtCLmax2.Left+edtCLmax2.Width)+1%x, 100dip, aa, 34dip)
			edtCLmax3.Initialize("edtCLmax3")
		    pnl5.AddView(edtCLmax3,(lblCLmax3.Left+lblCLmax3.Width)+1%x, 100dip, bb, 34dip)
			edtCLmax3.Hint = "Flap 3"	
			edtCLmax3.InputType = edtCLmax3.INPUT_TYPE_DECIMAL_NUMBERS
			edtCLmax3.ForceDoneButton = True
			edtCLmax3.TextSize = 13
			filter.SetCustomFilter(edtCLmax3, edtCLmax3.INPUT_TYPE_DECIMAL_NUMBERS, "0123456789.")
			edtCLmax3.TextColor = Main.ColorEdtText
			edtCLmax3.Color = Main.ColorEdt
			edtCLmax3.HintColor = Main.ColorEdtHint
		
			Dim lblCLmax4 As Label: lblCLmax4.Initialize("")
			lblCLmax4.Gravity = Bit.Or(Gravity.CENTER_VERTICAL, Gravity.RIGHT)
			lblCLmax4.Tag = ii 'The panel tag is reserved, so we use the label tag (this will be used later to sort)
			lblCLmax4.Text = "Flap 4"
			lblCLmax4.TextColor = Main.ColorButText1
			lblCLmax4.TextSize = 15
			pnl5.AddView(lblCLmax4, 1%x, 150dip, aa, 34dip)
			edtCLmax4.Initialize("edtCLmax4")
		    pnl5.AddView(edtCLmax4,lblCLmax4.Width+2%x, 150dip, bb, 34dip)
			edtCLmax4.Hint = "Flap 4"	
			edtCLmax4.InputType = edtCLmax4.INPUT_TYPE_DECIMAL_NUMBERS
			edtCLmax4.ForceDoneButton = True
			edtCLmax4.TextSize = 13
			filter.SetCustomFilter(edtCLmax4, edtCLmax4.INPUT_TYPE_DECIMAL_NUMBERS, "0123456789.")
			edtCLmax4.TextColor = Main.ColorEdtText
			edtCLmax4.Color = Main.ColorEdt
			edtCLmax4.HintColor = Main.ColorEdtHint
		
			Dim lblCLmax5 As Label: lblCLmax5.Initialize("")
			lblCLmax5.Gravity = Bit.Or(Gravity.CENTER_VERTICAL, Gravity.RIGHT)
			lblCLmax5.Tag = ii 'The panel tag is reserved, so we use the label tag (this will be used later to sort)
			lblCLmax5.Text = "Flap 5"
			lblCLmax5.TextColor = Main.ColorButText1
			lblCLmax5.TextSize = 15
			pnl5.AddView(lblCLmax5, (edtCLmax4.Left+edtCLmax4.Width)+1%x, 150dip, aa, 34dip)
			edtCLmax5.Initialize("edtCLmax5")
		    pnl5.AddView(edtCLmax5,(lblCLmax5.Left+lblCLmax5.Width)+1%x, 150dip, bb, 34dip)
			edtCLmax5.Hint = "Flap 5"	
			edtCLmax5.InputType = edtCLmax5.INPUT_TYPE_DECIMAL_NUMBERS
			edtCLmax5.ForceDoneButton = True
			edtCLmax5.TextSize = 13
			filter.SetCustomFilter(edtCLmax5, edtCLmax5.INPUT_TYPE_DECIMAL_NUMBERS, "0123456789.")
			edtCLmax5.TextColor = Main.ColorEdtText
			edtCLmax5.Color = Main.ColorEdt
			edtCLmax5.HintColor = Main.ColorEdtHint
		
			Dim lblCLmax6 As Label: lblCLmax6.Initialize("")
			lblCLmax6.Gravity = Bit.Or(Gravity.CENTER_VERTICAL, Gravity.RIGHT)
			lblCLmax6.Tag = ii 'The panel tag is reserved, so we use the label tag (this will be used later to sort)
			lblCLmax6.Text = "Flap 6"
			lblCLmax6.TextColor = Main.ColorButText1
			lblCLmax6.TextSize = 15
			pnl5.AddView(lblCLmax6, 1%x, 200dip, aa, 34dip)
			edtCLmax6.Initialize("edtCLmax6")
		    pnl5.AddView(edtCLmax6,lblCLmax6.Width+2%x, 200dip, bb, 34dip)
			edtCLmax6.Hint = "Flap 6"	
			edtCLmax6.InputType = edtCLmax6.INPUT_TYPE_DECIMAL_NUMBERS
			edtCLmax6.ForceDoneButton = True
			edtCLmax6.TextSize = 13
			filter.SetCustomFilter(edtCLmax6, edtCLmax6.INPUT_TYPE_DECIMAL_NUMBERS, "0123456789.")
			edtCLmax6.TextColor = Main.ColorEdtText
			edtCLmax6.Color = Main.ColorEdt
			edtCLmax6.HintColor = Main.ColorEdtHint
		
			Dim lblCLmax7 As Label: lblCLmax7.Initialize("")
			lblCLmax7.Gravity = Bit.Or(Gravity.CENTER_VERTICAL, Gravity.RIGHT)
			lblCLmax7.Tag = ii 'The panel tag is reserved, so we use the label tag (this will be used later to sort)
			lblCLmax7.Text = "Flap 7"
			lblCLmax7.TextColor = Main.ColorButText1
			lblCLmax7.TextSize = 15
			pnl5.AddView(lblCLmax7, (edtCLmax6.Left+edtCLmax6.Width)+1%x, 200dip, aa, 34dip)
			edtCLmax7.Initialize("edtCLmax7")
		    pnl5.AddView(edtCLmax7,(lblCLmax7.Left+lblCLmax7.Width)+1%x, 200dip, bb, 34dip)
			edtCLmax7.Hint = "Flap 7"	
			edtCLmax7.InputType = edtCLmax7.INPUT_TYPE_DECIMAL_NUMBERS
			edtCLmax7.ForceDoneButton = True
			edtCLmax7.TextSize = 13
			filter.SetCustomFilter(edtCLmax7, edtCLmax7.INPUT_TYPE_DECIMAL_NUMBERS, "0123456789.")
			edtCLmax7.TextColor = Main.ColorEdtText
			edtCLmax7.Color = Main.ColorEdt
			edtCLmax7.HintColor = Main.ColorEdtHint
		
			Dim lblCLmax8 As Label: lblCLmax8.Initialize("")
			lblCLmax8.Gravity = Bit.Or(Gravity.CENTER_VERTICAL, Gravity.RIGHT)
			lblCLmax8.Tag = ii 'The panel tag is reserved, so we use the label tag (this will be used later to sort)
			lblCLmax8.Text = "Flap 8"
			lblCLmax8.TextColor = Main.ColorButText1
			lblCLmax8.TextSize = 15
			pnl5.AddView(lblCLmax8, 1%x, 250dip, aa, 34dip)
			edtCLmax8.Initialize("edtCLmax8")
		    pnl5.AddView(edtCLmax8,lblCLmax8.Width+2%x, 250dip, bb, 34dip)
			edtCLmax8.Hint = "Flap 8"	
			edtCLmax8.InputType = edtCLmax8.INPUT_TYPE_DECIMAL_NUMBERS
			edtCLmax8.ForceDoneButton = True
			edtCLmax8.TextSize = 13
			filter.SetCustomFilter(edtCLmax8, edtCLmax8.INPUT_TYPE_DECIMAL_NUMBERS, "0123456789.")
			edtCLmax8.TextColor = Main.ColorEdtText
			edtCLmax8.Color = Main.ColorEdt
			edtCLmax8.HintColor = Main.ColorEdtHint
		
			Dim lblCLmax9 As Label: lblCLmax9.Initialize("")
			lblCLmax9.Gravity = Bit.Or(Gravity.CENTER_VERTICAL, Gravity.RIGHT)
			lblCLmax9.Tag = ii 'The panel tag is reserved, so we use the label tag (this will be used later to sort)
			lblCLmax9.Text = "Flap 9"
			lblCLmax9.TextColor = Main.ColorButText1
			lblCLmax9.TextSize = 15
			pnl5.AddView(lblCLmax9, (edtCLmax8.Left+edtCLmax8.Width)+1%x, 250dip, aa, 34dip)
			edtCLmax9.Initialize("edtCLmax9")
		    pnl5.AddView(edtCLmax9,(lblCLmax9.Left+lblCLmax9.Width)+1%x, 250dip, bb, 34dip)
			edtCLmax9.Hint = "Flap 9"	
			edtCLmax9.InputType = edtCLmax9.INPUT_TYPE_DECIMAL_NUMBERS
			edtCLmax9.ForceDoneButton = True
			edtCLmax9.TextSize = 13
			filter.SetCustomFilter(edtCLmax9, edtCLmax9.INPUT_TYPE_DECIMAL_NUMBERS, "0123456789.")
			edtCLmax9.TextColor = Main.ColorEdtText
			edtCLmax9.Color = Main.ColorEdt
			edtCLmax9.HintColor = Main.ColorEdtHint
			
			Dim lblCLmax10 As Label: lblCLmax10.Initialize("")
			lblCLmax10.Gravity = Bit.Or(Gravity.CENTER_VERTICAL, Gravity.RIGHT)
			lblCLmax10.Tag = ii 'The panel tag is reserved, so we use the label tag (this will be used later to sort)
			lblCLmax10.Text = "Flap 10"
			lblCLmax10.TextColor = Main.ColorButText1
			lblCLmax10.TextSize = 15
			pnl5.AddView(lblCLmax10, 1%x, 300dip, aa, 34dip)
			edtCLmax10.Initialize("edtCLmax10")
		    pnl5.AddView(edtCLmax10,lblCLmax10.Width+2%x, 300dip, bb, 34dip)
			edtCLmax10.Hint = "Flap 10"	
			edtCLmax10.InputType = edtCLmax10.INPUT_TYPE_DECIMAL_NUMBERS
			edtCLmax10.ForceDoneButton = True
			edtCLmax10.TextSize = 13
			filter.SetCustomFilter(edtCLmax10, edtCLmax10.INPUT_TYPE_DECIMAL_NUMBERS, "0123456789.")
			edtCLmax10.TextColor = Main.ColorEdtText
			edtCLmax10.Color = Main.ColorEdt
			edtCLmax10.HintColor = Main.ColorEdtHint
		
			Dim lblCLmax11 As Label: lblCLmax11.Initialize("")
			lblCLmax11.Gravity = Bit.Or(Gravity.CENTER_VERTICAL, Gravity.RIGHT)
			lblCLmax11.Tag = ii 'The panel tag is reserved, so we use the label tag (this will be used later to sort)
			lblCLmax11.Text = "Flap 11"
			lblCLmax11.TextColor = Main.ColorButText1
			lblCLmax11.TextSize = 15
			pnl5.AddView(lblCLmax11, (edtCLmax10.Left+edtCLmax10.Width)+1%x, 300dip, aa, 34dip)
			edtCLmax11.Initialize("edtCLmax11")
		    pnl5.AddView(edtCLmax11,(lblCLmax11.Left+lblCLmax11.Width)+1%x, 300dip, bb, 34dip)
			edtCLmax11.Hint = "Flap 11"	
			edtCLmax11.InputType = edtCLmax11.INPUT_TYPE_DECIMAL_NUMBERS
			edtCLmax11.ForceDoneButton = True
			edtCLmax11.TextSize = 13
			filter.SetCustomFilter(edtCLmax11, edtCLmax11.INPUT_TYPE_DECIMAL_NUMBERS, "0123456789.")
			edtCLmax11.TextColor = Main.ColorEdtText
			edtCLmax11.Color = Main.ColorEdt
			edtCLmax11.HintColor = Main.ColorEdtHint
			
			Dim lblCLmax12 As Label: lblCLmax12.Initialize("")
			lblCLmax12.Gravity = Bit.Or(Gravity.CENTER_VERTICAL, Gravity.RIGHT)
			lblCLmax12.Tag = ii 'The panel tag is reserved, so we use the label tag (this will be used later to sort)
			lblCLmax12.Text = "Flap 12"
			lblCLmax12.TextColor = Main.ColorButText1
			lblCLmax12.TextSize = 15
			pnl5.AddView(lblCLmax12, 1%x, 350dip, aa, 34dip)
			edtCLmax12.Initialize("edtCLmax12")
		    pnl5.AddView(edtCLmax12,lblCLmax12.Width+2%x, 350dip, bb, 34dip)
			edtCLmax12.Hint = "Flap 12"	
			edtCLmax12.InputType = edtCLmax12.INPUT_TYPE_DECIMAL_NUMBERS
			edtCLmax12.ForceDoneButton = True
			edtCLmax12.TextSize = 13
			filter.SetCustomFilter(edtCLmax12, edtCLmax12.INPUT_TYPE_DECIMAL_NUMBERS, "0123456789.")
			edtCLmax12.TextColor = Main.ColorEdtText
			edtCLmax12.Color = Main.ColorEdt
			edtCLmax12.HintColor = Main.ColorEdtHint
		
			Dim lblCLmax13 As Label: lblCLmax13.Initialize("")
			lblCLmax13.Gravity = Bit.Or(Gravity.CENTER_VERTICAL, Gravity.RIGHT)
			lblCLmax13.Tag = ii 'The panel tag is reserved, so we use the label tag (this will be used later to sort)
			lblCLmax13.Text = "Flap 13"
			lblCLmax13.TextColor = Main.ColorButText1
			lblCLmax13.TextSize = 15
			pnl5.AddView(lblCLmax13, (edtCLmax12.Left+edtCLmax12.Width)+1%x, 350dip, aa, 34dip)
			edtCLmax13.Initialize("edtCLmax13")
		    pnl5.AddView(edtCLmax13,(lblCLmax13.Left+lblCLmax13.Width)+1%x, 350dip, bb, 34dip)
			edtCLmax13.Hint = "Flap 13"	
			edtCLmax13.InputType = edtCLmax13.INPUT_TYPE_DECIMAL_NUMBERS
			edtCLmax13.ForceDoneButton = True
			edtCLmax13.TextSize = 13
			filter.SetCustomFilter(edtCLmax13, edtCLmax13.INPUT_TYPE_DECIMAL_NUMBERS, "0123456789.")
			edtCLmax13.TextColor = Main.ColorEdtText
			edtCLmax13.Color = Main.ColorEdt
			edtCLmax13.HintColor = Main.ColorEdtHint			
			
			lblCLmax0.Visible = False
			lblCLmax1.Visible = False
			lblCLmax2.Visible = False
			lblCLmax3.Visible = False
			lblCLmax4.Visible = False
			lblCLmax5.Visible = False
			lblCLmax6.Visible = False
			lblCLmax7.Visible = False
			lblCLmax8.Visible = False
			lblCLmax9.Visible = False
			lblCLmax10.Visible = False
			lblCLmax11.Visible = False
			lblCLmax12.Visible = False
			lblCLmax13.Visible = False
			edtCLmax0.Visible = False
			edtCLmax1.Visible = False
			edtCLmax2.Visible = False
			edtCLmax3.Visible = False
			edtCLmax4.Visible = False
			edtCLmax5.Visible = False
			edtCLmax6.Visible = False
			edtCLmax7.Visible = False
			edtCLmax8.Visible = False
			edtCLmax9.Visible = False
			edtCLmax10.Visible = False
			edtCLmax11.Visible = False
			edtCLmax12.Visible = False
			edtCLmax13.Visible = False

			Dim img11 As ImageView
			Dim bmpImage11 As Bitmap
			bmpImage11.Initialize(File.DirAssets,"icon_plus.png")
			img11.Initialize("img11")
			img11.Bitmap = bmpImage11
			
			Dim img22 As ImageView
			Dim bmpImage22 As Bitmap
			Dim img22 As ImageView
			Dim bmpImage22 As Bitmap
			bmpImage22.Initialize(File.DirAssets,"icon_minus.png")
			img22.Initialize("img22")
			img22.Bitmap = bmpImage22

			pnlTransp1.Initialize("pnlTransp1")
			pnlTransp2.Initialize("pnlTransp2")
			pnlTransp1.Color = Colors.Transparent
			pnlTransp2.Color = Colors.Transparent
			pnl5.AddView(pnlTransp1,(edtCLmax1.Left+edtCLmax1.Width)+2%x, 2dip, (Activity.Width-edtCLmax1.Left-edtCLmax1.Width)-3%x, 40dip)
			pnl5.AddView(pnlTransp2,(edtCLmax1.Left+edtCLmax1.Width)+2%x, 50dip,(Activity.Width-edtCLmax1.Left-edtCLmax1.Width)-3%x, 34dip)
			pnlTransp1.AddView(img11, pnlTransp1.Width-34dip, 10dip, 34dip, 34dip)
			pnlTransp2.AddView(img22, 20dip, 9dip, 34dip, 34dip)
			img11.Height = 12dip
			img11.Width = 12dip
			img22.Height = 12dip
			img22.Width = 12dip
			img11.Left = (pnlTransp1.Width - img11.Width) / 2
			img22.Left = (pnlTransp2.Width - img22.Width) / 2 
			img11.Gravity = Gravity.FILL
			img22.Gravity = Gravity.FILL
			
			scvMain0.Panel.Height = pnl1.Height+pnl2.Height+pnl3.Height+pnl4.Height+pnl5.Height
	End Select

End Sub

Sub btnSrefUnit_Click
	Dim SrefUnits() As String
	SrefUnits = Array As String("m²", "ft²", "in²", "cm²", "mm²")
	Dim record As Int = indSrefUnit
	InputListAsync(SrefUnits, "Choose the Unit of Wing Area", record,True)
	Wait For InputList_Result (Index As Int)
	If Index=DialogResponse.Cancel Then
		indSrefUnit = record
	Else
		indcrefUnit = Index
	End If
	SrefUnit
End Sub

Sub SrefUnit
	If indSrefUnit < 0 Then
	Else If indSrefUnit = 0 Then
		btnSrefUnit.Text = "m²"
	Else If indSrefUnit = 1 Then
		btnSrefUnit.Text = "ft²"
	Else If indSrefUnit = 2 Then
		btnSrefUnit.Text = "in²"
	Else If indSrefUnit = 3 Then
		btnSrefUnit.Text = "cm²"
	Else If indSrefUnit = 4 Then
		btnSrefUnit.Text = "mm²"
	End If
End Sub

Sub btncrefUnit_Click
	Dim crefUnits() As String
	crefUnits = Array As String("m", "ft", "in", "cm", "mm")
	Dim record As Int = indcrefUnit
	InputListAsync(crefUnits, "Choose the Unit of Wing chord Lenght", record,True)
	Wait For InputList_Result (Index As Int)
	If Index=DialogResponse.Cancel Then
		indcrefUnit = record
	Else
		indcrefUnit = Index
	End If
	crefUnit
End Sub

Sub crefUnit
	If indcrefUnit < 0 Then
	Else If indcrefUnit = 0 Then
		btncrefUnit.Text = "m"
	Else If indcrefUnit = 1 Then
		btncrefUnit.Text = "ft"
	Else If indcrefUnit = 2 Then
		btncrefUnit.Text = "in"
	Else If indcrefUnit = 3 Then
		btncrefUnit.Text = "cm"
	Else If indcrefUnit = 4 Then
		btncrefUnit.Text = "mm"
	End If
End Sub

Sub btnWeightUnit_Click
	Dim WeightUnits() As String
	WeightUnits = Array As String("kg", "lb", "ton", "slug", "oz")
	Dim record As Int = indWeightUnit
	InputListAsync(WeightUnits, "Choose the Unit of Mass", record,True)
	Wait For InputList_Result (Index As Int)
	If Index=DialogResponse.Cancel Then
		indWeightUnit = record
	Else
		indWeightUnit = Index
	End If
	WeightUnit
End Sub

Sub WeightUnit
	If indWeightUnit < 0 Then
	Else If indWeightUnit = 0 Then
		btnWeightUnit.Text = "kg"
	Else If indWeightUnit = 1 Then
		btnWeightUnit.Text = "lb"
	Else If indWeightUnit = 2 Then
		btnWeightUnit.Text = "ton"
	Else If indWeightUnit = 3 Then
		btnWeightUnit.Text = "slug"
	Else If indWeightUnit = 4 Then
		btnWeightUnit.Text = "oz"
	End If
End Sub

Sub pnlTransparent3_Touch (Action As Int, X As Float, Y As Float)
	Dim pp As Panel
	pp = Sender	
	Select Action
	Case Activity.ACTION_DOWN
		pp.Color = Main.ColorEdt
	Case Activity.ACTION_UP
		pp.Color = Colors.Transparent
	' Escreve variaveis no arquivo interno airplanes.txt
	If Main.ID_edt < 1 Then
		Main.a.Put("N", ID)
	End If
	Main.a.Put(ID & "_Name", edtName.Text)
	Main.a.Put(ID & "_S", edtSref.Text)
	Main.a.Put(ID & "_c", edtcref.Text)
	Main.a.Put(ID & "_W1", edtWeight1.Text)
	Main.a.Put(ID & "_W2", edtWeight2.Text)
	Main.a.Put(ID & "_W3", edtWeight3.Text)
	Main.a.Put(ID & "_W4", edtWeight4.Text)
	Main.a.Put(ID & "_W5", edtWeight5.Text)
	Main.a.Put(ID & "_W6", edtWeight6.Text)
	Main.a.Put(ID & "_F0", edtCLmax0.Text)
	Main.a.Put(ID & "_F1", edtCLmax1.Text)
	Main.a.Put(ID & "_F2", edtCLmax2.Text)
	Main.a.Put(ID & "_F3", edtCLmax3.Text)
	Main.a.Put(ID & "_F4", edtCLmax4.Text)
	Main.a.Put(ID & "_F5", edtCLmax5.Text)
	Main.a.Put(ID & "_F6", edtCLmax6.Text)
	Main.a.Put(ID & "_F7", edtCLmax7.Text)
	Main.a.Put(ID & "_F8", edtCLmax8.Text)
	Main.a.Put(ID & "_F9", edtCLmax9.Text)
	Main.a.Put(ID & "_F10", edtCLmax10.Text)
	Main.a.Put(ID & "_F11", edtCLmax11.Text)
	Main.a.Put(ID & "_F12", edtCLmax12.Text)
	Main.a.Put(ID & "_F13", edtCLmax13.Text)
	Main.a.Put(ID & "_Sunit", indSrefUnit)
	Main.a.Put(ID & "_cunit", indcrefUnit)
	Main.a.Put(ID & "_Wunit", indWeightUnit)
	File.WriteMap(rp.GetSafeDirDefaultExternal(""), "airplanes.txt", Main.a)
	Dim HideK As IME
	HideK.Initialize("")
	HideK.HideKeyboard
	Activity.Finish
	'SetAnimation("file2", "file1")
	Return
	End Select
End Sub

Sub pnlTransparent2_Touch (Action As Int, X As Float, Y As Float)
	Dim pp As Panel
	pp = Sender
	Select Action
	Case Activity.ACTION_DOWN
		pp.Color = Main.ColorEdt
	Case Activity.ACTION_UP
		pp.Color = Colors.Transparent
		DialogCancel
		Return
	End Select
End Sub

Sub DialogCancel
	Msgbox2Async("Are you sure you want to discard changes?","Warning","Save","Cancel","Discard",LoadBitmap(File.DirAssets,"icon_warning.png"),True)
	Wait For Msgbox_Result (confirm2 As Int)
	If confirm2 = DialogResponse.POSITIVE Then
	' Escreve variaveis no arquivo interno airplanes.txt
		If Main.ID_edt < 1 Then
			Main.a.Put("N", ID)
		End If
		Main.a.Put(ID & "_Name", edtName.Text)
		Main.a.Put(ID & "_S", edtSref.Text)
		Main.a.Put(ID & "_c", edtcref.Text)
		Main.a.Put(ID & "_W1", edtWeight1.Text)
		Main.a.Put(ID & "_W2", edtWeight2.Text)
		Main.a.Put(ID & "_W3", edtWeight3.Text)
		Main.a.Put(ID & "_W4", edtWeight4.Text)
		Main.a.Put(ID & "_W5", edtWeight5.Text)
		Main.a.Put(ID & "_W6", edtWeight6.Text)
		Main.a.Put(ID & "_F0", edtCLmax0.Text)
		Main.a.Put(ID & "_F1", edtCLmax1.Text)
		Main.a.Put(ID & "_F2", edtCLmax2.Text)
		Main.a.Put(ID & "_F3", edtCLmax3.Text)
		Main.a.Put(ID & "_F4", edtCLmax4.Text)
		Main.a.Put(ID & "_F5", edtCLmax5.Text)
		Main.a.Put(ID & "_F6", edtCLmax6.Text)
		Main.a.Put(ID & "_F7", edtCLmax7.Text)
		Main.a.Put(ID & "_F8", edtCLmax8.Text)
		Main.a.Put(ID & "_F9", edtCLmax9.Text)
		Main.a.Put(ID & "_F10", edtCLmax10.Text)
		Main.a.Put(ID & "_F11", edtCLmax11.Text)
		Main.a.Put(ID & "_F12", edtCLmax12.Text)
		Main.a.Put(ID & "_F13", edtCLmax13.Text)
		Main.a.Put(ID & "_Sunit", indSrefUnit)
		Main.a.Put(ID & "_cunit", indcrefUnit)
		Main.a.Put(ID & "_Wunit", indWeightUnit)
		File.WriteMap(rp.GetSafeDirDefaultExternal(""), "airplanes.txt", Main.a)
		Dim HideK As IME
		HideK.Initialize("")
		HideK.HideKeyboard
		Activity.Finish
		'SetAnimation("file2", "file1")
	Else If confirm2 = DialogResponse.CANCEL Then
	Else If confirm2 = DialogResponse.NEGATIVE Then
		add = -1
		Main.ID_edt = 0
		Activity.Finish
		'SetAnimation("file2", "file1")
	End If
End Sub

Sub Activity_KeyPress (KeyCode As Int) As Boolean 'Return True to consume the event
    ' Tecla voltar vai para a pagina de Inputs
	If KeyCode = KeyCodes.KEYCODE_BACK Then
		DialogCancel
		Return True 
	Else
	   Return False
	End If
End Sub

Sub pnlTransp1_Touch (Action As Int, X As Float, Y As Float) As Boolean
	Dim pp As Panel
	pp = Sender	
	Select Action
	Case Activity.ACTION_DOWN
		pp.Color = Main.ColorEdt
	Case Activity.ACTION_UP
		pp.Color = Colors.Transparent
		Dim v As Label
		Dim pd As Panel
		For ii=2 To 29
		v = pnl5.GetView(ii)
		If v.Visible = False Then
			v.Visible = True
			v = pnl5.GetView(ii + 1)
			v.Visible = True
			pnl5.Height = 100dip
			scvMain0.Panel.Height = 500dip
			pnlTransp2.Visible = True
			pnlTransp2.Top = 50dip
			If ii > 5 And ii<10 Then
					pnl5.Height = 150dip
					scvMain0.Panel.Height = 550dip
					pnlTransp2.Top = 100dip
			End If
			If ii > 9 And ii<14 Then
					pnl5.Height = 200dip
					scvMain0.Panel.Height = 600dip
					pnlTransp2.Top = 150dip
			End If
			If ii > 13 And ii<18 Then
					pnl5.Height = 250dip
					scvMain0.Panel.Height = 650dip
					pnlTransp2.Top = 200dip
			End If
			If ii > 17 And ii<22 Then
					pnl5.Height = 300dip
					scvMain0.Panel.Height = 700dip
					pnlTransp2.Top = 250dip
			End If
			If ii > 21 And ii<26 Then
					pnl5.Height = 350dip
					scvMain0.Panel.Height = 750dip
					pnlTransp2.Top = 300dip
			End If
			If ii > 25 Then
					pnl5.Height = 400dip
					scvMain0.Panel.Height = 800dip
					pnlTransp2.Top = 350dip
			End If
			pd = pnl5.GetView(0)
			pd.Top = pnl5.Height-1dip
			DoEvents
			scvMain0.ScrollPosition=9999
			Return True
		End If
		Next
	End Select
	Return True
End Sub

Sub pnlTransp2_Touch (Action As Int, X As Float, Y As Float) As Boolean
	Dim pp As Panel
	pp = Sender
	Select Action
	Case Activity.ACTION_DOWN
		pp.Color = Main.ColorEdt

	Case Activity.ACTION_UP
		pp.Color = Colors.Transparent
		Dim v As View
		Dim v1 As EditText
		Dim pd As Panel
		For ii = pnl5.NumberOfViews-3 To 3 Step-1
			v = pnl5.GetView(ii)
			If v.Visible = True Then
				v.Visible = False
				v1 = v
				v1.Text = ""
				v = pnl5.GetView(ii - 1)
				v.Visible = False
				pnl5.Height = 400dip
				scvMain0.Panel.Height = 800dip
				If ii < 28 Then
					pnl5.Height = 350dip
					scvMain0.Panel.Height = 750dip
					pnlTransp2.Top = 300dip
				End If
				If ii < 24 And ii>19 Then
					pnl5.Height = 300dip
					scvMain0.Panel.Height = 700dip
					pnlTransp2.Top = 250dip
				End If
				If ii < 20 And ii>15 Then
					pnl5.Height = 250dip
					scvMain0.Panel.Height = 650dip
					pnlTransp2.Top = 200dip
				End If
				If ii < 16 And ii>11 Then
					pnl5.Height = 200dip
					scvMain0.Panel.Height = 600dip
					pnlTransp2.Top = 150dip
				End If
				If ii < 12 And ii>7 Then
					pnl5.Height = 150dip
					scvMain0.Panel.Height = 550dip
					pnlTransp2.Top = 100dip
				End If
				If ii < 8 And ii>2 Then
					pnl5.Height = 100dip
					scvMain0.Panel.Height = 500dip
					pnlTransp2.Top =50dip
				End If	
				If ii < 4 Then
					pnl5.Height = 50dip
					scvMain0.Panel.Height = 450dip
					pnlTransp2.Visible = False
				End If
				pd = pnl5.GetView(0)
				pd.Top = pnl5.Height-1dip
				Return True
		End If
		Next
	End Select
	Return True
End Sub

Sub ButtonGradient(ColorList() As Int,ColorList2() As Int) As StateListDrawable
    ' Define a GradientDrawable for Enabled state
    Dim gdwEnabled As GradientDrawable
    gdwEnabled.Initialize("TOP_BOTTOM",ColorList)
    gdwEnabled.CornerRadius = 4
    ' Define a GradientDrawable for Pressed state
    Dim gdwPressed As GradientDrawable
    gdwPressed.Initialize("BOTTOM_TOP",ColorList2)
    gdwPressed.CornerRadius = 8
    ' Define a GradientDrawable for Disabled state
    Dim gdwDisabled As GradientDrawable
    gdwDisabled.Initialize("TOP_BOTTOM", Array As Int(Colors.LightGray, Colors.DarkGray))
    gdwDisabled.CornerRadius = 4
    ' Define a StateListDrawable
    Dim stdGradient As StateListDrawable
    stdGradient.Initialize
    stdGradient.AddState2(Array As Int(stdGradient.State_enabled, -stdGradient.State_Pressed), gdwEnabled)
    stdGradient.AddState(stdGradient.State_Pressed, gdwPressed)
    stdGradient.AddState(stdGradient.State_Disabled, gdwDisabled)
    Return stdGradient
End Sub

