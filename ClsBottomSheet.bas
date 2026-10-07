B4A=true
Group=Default Group
ModulesStructureVersion=1
Type=Class
Version=13
@EndOfDesignText@
'
' ClsBottomSheet — modern bottom-sheet selection dialog.
' Replaces InputListAsync with a themed overlay + sliding panel.
'
Sub Class_Globals
	Private mActivity As Activity
	Private mCallback As Object
	Private mEventName As String
	Private pnlOverlay As Panel
	Private pnlSheet As Panel
	Private pnlHandle As Panel
	Private lblTitle As Label
	Private scvItems As ScrollView
	Private mSelectedIndex As Int
	Private mItemHeight As Int
	Private mTitleColor As Int
	Private mBackgroundColor As Int
	Private mTextColor As Int
	Private mSelectedTextColor As Int
	Private mDividerColor As Int
	Private mPending As Boolean
	Private mDragStartX As Float
	Private mDragStartY As Float
	Private mDragTracking As Boolean
End Sub

Public Sub Initialize(callback As Object, eventName As String)
	mCallback = callback
	mEventName = eventName
	mItemHeight = 52dip
	' Default colors (will be overridden by theme)
	mTitleColor = Colors.RGB(0, 145, 131)
	mBackgroundColor = Colors.White
	mTextColor = Colors.RGB(33, 33, 33)
	mSelectedTextColor = Colors.RGB(0, 145, 131)
	mDividerColor = Colors.RGB(224, 224, 224)
	mPending = False
End Sub

Public Sub SetColors(titleColor As Int, bgColor As Int, textColor As Int, selectedColor As Int, dividerColor As Int)
	mTitleColor = titleColor
	mBackgroundColor = bgColor
	mTextColor = textColor
	mSelectedTextColor = selectedColor
	mDividerColor = dividerColor
End Sub

Public Sub Show(act As Activity, items As List, title As String, selectedIndex As Int) As ResumableSub
	Dismiss
	mActivity = act
	mSelectedIndex = selectedIndex

	' Dimmed overlay
	pnlOverlay.Initialize("pnlOverlay")
	pnlOverlay.Color = Colors.ARGB(178, 0, 0, 0)
	act.AddView(pnlOverlay, 0, 0, 100%x, 100%y)

	' Premium bottom sheet
	pnlSheet.Initialize("pnlSheetDrag")
	Dim gdSheet As GradientDrawable
	gdSheet.Initialize("TOP_BOTTOM", Array As Int(mBackgroundColor, mBackgroundColor))
	gdSheet.CornerRadius = 20dip
	pnlSheet.Background = gdSheet

	pnlHandle.Initialize("pnlSheetDrag")
	Dim gdHandle As GradientDrawable
	gdHandle.Initialize("TOP_BOTTOM", Array As Int(mDividerColor, mDividerColor))
	gdHandle.CornerRadius = 3dip
	pnlHandle.Background = gdHandle

	Dim itemCount As Int = items.Size
	Dim totalItemsH As Int = 0
	Dim i As Int
	For i = 0 To itemCount - 1
		Dim rawItem As String = items.Get(i)
		If rawItem.Contains("|") Then
			totalItemsH = totalItemsH + 62dip
		Else
			totalItemsH = totalItemsH + 54dip
		End If
	Next

	Dim scvH As Int = totalItemsH
	Dim contentHeight As Int = 64dip + scvH + 64dip
	Dim maxHeight As Int = 100%y - 40dip
	Dim sheetHeight As Int = Min(contentHeight, maxHeight)
	act.AddView(pnlSheet, 0, 100%y - sheetHeight, 100%x, sheetHeight)

	pnlSheet.AddView(pnlHandle, (100%x - 42dip) / 2, 8dip, 42dip, 4dip)

	lblTitle.Initialize("pnlSheetDrag")
	lblTitle.Text = FormatScriptedText(title)
	lblTitle.TextSize = 18
	lblTitle.TextColor = mTextColor
	lblTitle.Typeface = Typeface.DEFAULT_BOLD
	lblTitle.Gravity = Bit.Or(Gravity.CENTER_VERTICAL, Gravity.LEFT)
	pnlSheet.AddView(lblTitle, 20dip, 16dip, 100%x - 76dip, 44dip)

	Dim btnClose As Button
	btnClose.Initialize("btnSheetClose")
	btnClose.Text = Chr(215)
	btnClose.TextSize = 24
	btnClose.TextColor = mTextColor
	btnClose.Color = Colors.Transparent
	pnlSheet.AddView(btnClose, 100%x - 52dip, 18dip, 44dip, 40dip)

	Dim scrollHeight As Int = sheetHeight - 64dip - 60dip
	scvItems.Initialize(Max(scvH, scrollHeight))
	scvItems.Color = Colors.Transparent
	pnlSheet.AddView(scvItems, 0, 64dip, 100%x, scrollHeight)
	scvItems.Panel.Height = Max(scvH, scrollHeight)

	Dim yItem As Int = 0
	For i = 0 To itemCount - 1
		Dim itemStr As String = items.Get(i)
		Dim parts() As String = Regex.Split("\|", itemStr)
		Dim prim As String = parts(0).Trim
		Dim sec As String = ""
		If parts.Length > 1 Then sec = parts(1).Trim
		Dim sel As Boolean = (i = selectedIndex)

		Dim thisHeight As Int = 54dip
		If sec.Length > 0 Then thisHeight = 62dip

		Dim pnlItem As Panel
		pnlItem.Initialize("pnlItem")
		If sel Then
			Dim rr As Int = Bit.And(Bit.ShiftRight(mSelectedTextColor, 16), 0xFF)
			Dim gg As Int = Bit.And(Bit.ShiftRight(mSelectedTextColor, 8), 0xFF)
			Dim bb As Int = Bit.And(mSelectedTextColor, 0xFF)
			pnlItem.Color = Colors.ARGB(30, rr, gg, bb)
		Else
			pnlItem.Color = Colors.Transparent
		End If
		pnlItem.Tag = i
		scvItems.Panel.AddView(pnlItem, 0, yItem, 100%x, thisHeight)

		Dim lblPrim As Label
		lblPrim.Initialize("pnlItem")
		lblPrim.Tag = i
		lblPrim.Text = FormatScriptedText(prim)
		lblPrim.TextSize = 15
		lblPrim.SingleLine = True
		If sel Then
			lblPrim.TextColor = mSelectedTextColor
			lblPrim.Typeface = Typeface.DEFAULT_BOLD
		Else
			lblPrim.TextColor = mTextColor
			lblPrim.Typeface = Typeface.DEFAULT
		End If

		If sec.Length > 0 Then
			lblPrim.Gravity = Gravity.CENTER_VERTICAL
			pnlItem.AddView(lblPrim, 20dip, 7dip, 100%x - 76dip, 24dip)

			Dim lblSub As Label
			lblSub.Initialize("pnlItem")
			lblSub.Tag = i
			lblSub.Text = FormatScriptedText(sec)
			lblSub.TextSize = 12.5
			lblSub.TextColor = Colors.ARGB(170, Bit.And(Bit.ShiftRight(mTextColor, 16), 0xFF), Bit.And(Bit.ShiftRight(mTextColor, 8), 0xFF), Bit.And(mTextColor, 0xFF))
			lblSub.Gravity = Gravity.CENTER_VERTICAL
			lblSub.SingleLine = True
			Dim joSub As JavaObject = lblSub
			joSub.RunMethod("setMaxLines", Array(1))
			Dim ta As JavaObject
			ta.InitializeStatic("android.text.TextUtils$TruncateAt")
			joSub.RunMethod("setEllipsize", Array(ta.GetField("END")))
			pnlItem.AddView(lblSub, 20dip, 31dip, 100%x - 76dip, 23dip)
		Else
			lblPrim.Gravity = Gravity.CENTER_VERTICAL
			pnlItem.AddView(lblPrim, 20dip, 0, 100%x - 76dip, thisHeight)
		End If

		If sel Then
			Dim lblCheck As Label
			lblCheck.Initialize("pnlItem")
			lblCheck.Tag = i
			lblCheck.Text = Chr(10003)
			lblCheck.TextColor = mSelectedTextColor
			lblCheck.TextSize = 22
			lblCheck.Typeface = Typeface.DEFAULT_BOLD
			lblCheck.Gravity = Gravity.CENTER
			pnlItem.AddView(lblCheck, 100%x - 54dip, 0, 42dip, thisHeight)
		End If

		If i < itemCount - 1 Then
			Dim pnlDiv As Panel
			pnlDiv.Initialize("")
			pnlDiv.Color = mDividerColor
			scvItems.Panel.AddView(pnlDiv, 20dip, yItem + thisHeight - 1dip, 100%x - 40dip, 1dip)
		End If
		yItem = yItem + thisHeight
	Next

	Dim btnCancel As Button
	btnCancel.Initialize("btnSheetCancel")
	btnCancel.Text = "Cancel"
	btnCancel.TextSize = 15
	btnCancel.TextColor = mTextColor
	Dim cdCancel As ColorDrawable
	cdCancel.Initialize2(mBackgroundColor, 10dip, 1dip, mDividerColor)
	btnCancel.Background = cdCancel
	pnlSheet.AddView(btnCancel, 20dip, sheetHeight - 52dip, 100%x - 40dip, 42dip)

	mPending = True
	Wait For Sheet_Result(idx As Int)
	Return idx
End Sub

Private Sub CloseViews
	If pnlSheet.IsInitialized Then
		Try
			pnlSheet.RemoveView
		Catch
		End Try
	End If
	If pnlOverlay.IsInitialized Then
		Try
			pnlOverlay.RemoveView
		Catch
		End Try
	End If
End Sub

Public Sub Dismiss
	If mPending Then
		mPending = False
		CallSubDelayed2(Me, "Sheet_Result", -1)
	End If
	CloseViews
End Sub

Public Sub getIsShowing As Boolean
	Return mPending
End Sub

Public Sub getCanSwipeDismiss As Boolean
	If Not(mPending) Then Return False
	If Not(scvItems.IsInitialized) Then Return True
	Try
		Dim jo As JavaObject = scvItems
		Dim scrollY As Int = jo.RunMethod("getScrollY", Null)
		Return scrollY <= 2dip
	Catch
		Return True
	End Try
End Sub

Private Sub pnlSheetDrag_Touch(Action As Int, X As Float, Y As Float) As Boolean
	Select Action
		Case mActivity.ACTION_DOWN
			mDragStartX = X
			mDragStartY = Y
			mDragTracking = True
			Return True
		Case mActivity.ACTION_MOVE
			If mDragTracking Then
				Dim dy As Float = Y - mDragStartY
				Dim dx As Float = X - mDragStartX
				If dy > 12dip And Abs(dy) > Abs(dx) * 1.15 Then
					' Consume a deliberate downward drag in the sheet header.
					Return True
				End If
			End If
		Case mActivity.ACTION_UP
			If mDragTracking Then
				mDragTracking = False
				Dim dy As Float = Y - mDragStartY
				Dim dx As Float = X - mDragStartX
				If dy >= 64dip And Abs(dy) > Abs(dx) * 1.15 Then
					Dismiss
				End If
			End If
			Return True
		Case 3 ' MotionEvent.ACTION_CANCEL
			mDragTracking = False
			Return True
	End Select
	Return True
End Sub

Private Sub pnlOverlay_Click
	Dismiss
End Sub

Private Sub btnSheetClose_Click
	Dismiss
End Sub

Private Sub btnSheetCancel_Click
	Dismiss
End Sub

Private Sub pnlItem_Click
	Dim v As View = Sender
	Dim index As Int = v.Tag
	If mPending Then
		mPending = False
		CallSubDelayed2(Me, "Sheet_Result", index)
	End If
	CloseViews
End Sub

Private Sub pnlSheet_Click
	' Consume click
End Sub

' Render compact mathematical identifiers such as H_P, S_{REF}, C_{L,MAX}, and m²
' without exposing markup characters in native Android labels.
Private Sub FormatScriptedText(Value As String) As CSBuilder
	Dim cs As CSBuilder
	cs.Initialize
	Dim pos As Int = 0
	Do While pos < Value.Length
		Dim marker As Int = Value.IndexOf2("_", pos)
		If marker < 0 Then
			cs.Append(Value.SubString(pos))
			Exit
		End If
		If marker > pos Then cs.Append(Value.SubString2(pos, marker))
		Dim subStart As Int = marker + 1
		If subStart >= Value.Length Then
			cs.Append("_")
			Exit
		End If
		Dim subEnd As Int
		If Value.SubString2(subStart, subStart + 1) = "{" Then
			Dim closeBrace As Int = Value.IndexOf2("}", subStart + 1)
			If closeBrace < 0 Then
				cs.Append(Value.SubString(marker))
				Exit
			End If
			subStart = subStart + 1
			subEnd = closeBrace
			pos = closeBrace + 1
		Else
			subEnd = Min(subStart + 1, Value.Length)
			pos = subEnd
		End If
		Dim subValue As String = Value.SubString2(subStart, subEnd)
		Dim baseChar As String = ""
		If marker > 0 Then baseChar = Value.SubString2(marker - 1, marker)
		' All Latin subscript letters are uppercase, except conventional impact pressure q_c.
		If Not(baseChar = "q" And subValue = "c") Then subValue = subValue.ToUpperCase
		Dim subShift As Int = 4dip
		If subValue = "P" And baseChar = "H" Then subShift = 3dip
		cs.VerticalAlign(subShift).RelativeSize(0.68).Append(subValue).Pop.Pop
	Loop
	Return cs
End Sub

Public Sub ShowHelp(act As Activity, key As String, fullText As String)
	Dismiss
	mActivity = act
	mPending = False

	' Overlay
	pnlOverlay.Initialize("pnlOverlay")
	pnlOverlay.Color = Colors.ARGB(170, 0, 0, 0)
	act.AddView(pnlOverlay, 0, 0, 100%x, 100%y)

	' Sheet panel
	pnlSheet.Initialize("pnlSheet")
	pnlSheet.Color = mBackgroundColor
	Dim gdSheet As GradientDrawable
	gdSheet.Initialize("TOP_BOTTOM", Array As Int(mBackgroundColor, mBackgroundColor))
	gdSheet.CornerRadius = 20dip
	pnlSheet.Background = gdSheet

	' Drag handle indicator
	pnlHandle.Initialize("")
	Dim gdHandle As GradientDrawable
	gdHandle.Initialize("TOP_BOTTOM", Array As Int(mDividerColor, mDividerColor))
	gdHandle.CornerRadius = 3dip
	pnlHandle.Background = gdHandle
	pnlSheet.AddView(pnlHandle, (100%x - 40dip) / 2, 8dip, 40dip, 4dip)

	' Parse help components from fullText
	Dim rawParts() As String = Regex.Split(CRLF & CRLF, fullText)
	Dim headerTitle As String = key
	Dim defText As String = ""
	Dim eqText As String = ""
	Dim unitText As String = ""
	Dim modelText As String = ""

	If rawParts.Length > 0 And rawParts(0).Trim.Length > 0 Then
		headerTitle = rawParts(0).Trim
	End If

	Dim pIdx As Int
	For pIdx = 1 To rawParts.Length - 1
		Dim part As String = rawParts(pIdx).Trim
		If part.StartsWith("Definition:") Then
			defText = part.SubString(11).Trim
		Else If part.StartsWith("Equation:") Then
			eqText = part.SubString(9).Trim
		Else If part.StartsWith("SI/reference unit:") Then
			unitText = part.SubString(18).Trim
		Else If part.StartsWith("Model:") Then
			modelText = part.SubString(6).Trim
		Else If part.StartsWith("Typical range:") Then
			If modelText.Length > 0 Then modelText = modelText & CRLF
			modelText = modelText & part
		Else If defText.Length = 0 Then
			defText = part
		End If
	Next

	' Header title
	lblTitle.Initialize("")
	lblTitle.Text = FormatScriptedText(headerTitle)
	lblTitle.TextSize = 16
	lblTitle.TextColor = mTitleColor
	lblTitle.Typeface = Typeface.DEFAULT_BOLD
	lblTitle.Gravity = Bit.Or(Gravity.CENTER_VERTICAL, Gravity.LEFT)
	pnlSheet.AddView(lblTitle, 20dip, 16dip, 100%x - 68dip, 40dip)

	' Close X button
	Dim btnClose As Button
	btnClose.Initialize("pnlOverlay")
	btnClose.Text = Chr(0xD7) ' ×
	btnClose.TextSize = 22
	btnClose.TextColor = mTextColor
	btnClose.Color = Colors.Transparent
	pnlSheet.AddView(btnClose, 100%x - 48dip, 16dip, 40dip, 40dip)

	' Content scroll view
	Dim scvHelp As ScrollView
	scvHelp.Initialize(1000dip)
	scvHelp.Color = Colors.Transparent
	scvHelp.Panel.Color = Colors.Transparent

	Dim y As Int = 8dip
	Dim contentW As Int = 100%x - 40dip

	' 1. Definition
	If defText.Length > 0 Then
		Dim lblDef As Label
		lblDef.Initialize("")
		lblDef.Text = defText
		lblDef.TextColor = mTextColor
		lblDef.TextSize = 14
		lblDef.Typeface = Typeface.DEFAULT
		Dim defH As Int = MeasureLabelHeight(lblDef, defText, 14, contentW)
		scvHelp.Panel.AddView(lblDef, 20dip, y, contentW, defH)
		y = y + defH + 14dip
	End If

	' 2. Equation Box (LaTeX typesetting via KaTeX)
	If eqText.Length > 0 Then
		Dim isTall As Boolean = eqText.Contains("\frac") Or eqText.Contains("\sqrt") Or eqText.Contains("\left")
		Dim eqH As Int = 56dip
		If isTall Then eqH = 80dip

		Dim pnlEqBox As Panel
		pnlEqBox.Initialize("")
		Dim cdEq As ColorDrawable
		cdEq.Initialize2(mBackgroundColor, 8dip, 1dip, mSelectedTextColor)
		pnlEqBox.Background = cdEq

		Dim wvEq As WebView
		wvEq.Initialize("wvEq")
		wvEq.Color = Colors.Transparent
		Dim hexColor As String = ColorToHex(mSelectedTextColor)
		Dim safeKey As String = ToSafeKey(key)

		Dim jo As JavaObject = Me
		jo.RunMethod("setupLatexView", Array(wvEq, safeKey, eqText, hexColor))

		pnlEqBox.AddView(wvEq, 8dip, 4dip, contentW - 16dip, eqH)
		scvHelp.Panel.AddView(pnlEqBox, 20dip, y, contentW, eqH + 8dip)
		y = y + eqH + 8dip + 14dip
	End If

	' 3. Model / Limits
	If modelText.Length > 0 Then
		Dim lblModelHdr As Label
		lblModelHdr.Initialize("")
		lblModelHdr.Text = "MODEL / ASSUMPTIONS"
		lblModelHdr.TextColor = Colors.RGB(0, 180, 120) ' emerald green
		lblModelHdr.TextSize = 12
		lblModelHdr.Typeface = Typeface.DEFAULT_BOLD
		scvHelp.Panel.AddView(lblModelHdr, 20dip, y, contentW, 20dip)
		y = y + 22dip

		Dim lblModelBody As Label
		lblModelBody.Initialize("")
		lblModelBody.Text = modelText
		lblModelBody.TextColor = mTextColor
		lblModelBody.TextSize = 13.5
		Dim modH As Int = MeasureLabelHeight(lblModelBody, modelText, 13.5, contentW)
		scvHelp.Panel.AddView(lblModelBody, 20dip, y, contentW, modH)
		y = y + modH + 14dip
	End If

	' 4. SI / Reference Unit
	If unitText.Length > 0 Then
		Dim lblUnitHdr As Label
		lblUnitHdr.Initialize("")
		lblUnitHdr.Text = "SI / REFERENCE UNIT"
		lblUnitHdr.TextColor = Colors.RGB(230, 130, 0) ' amber
		lblUnitHdr.TextSize = 12
		lblUnitHdr.Typeface = Typeface.DEFAULT_BOLD
		scvHelp.Panel.AddView(lblUnitHdr, 20dip, y, contentW, 20dip)
		y = y + 22dip

		Dim lblUnitBody As Label
		lblUnitBody.Initialize("")
		lblUnitBody.Text = unitText
		lblUnitBody.TextColor = mSelectedTextColor
		lblUnitBody.TextSize = 14
		lblUnitBody.Typeface = Typeface.DEFAULT_BOLD
		scvHelp.Panel.AddView(lblUnitBody, 20dip, y, contentW, 24dip)
		y = y + 36dip
	End If

	scvHelp.Panel.Height = y + 16dip

	Dim maxSheetH As Int = 78%y
	Dim sheetH As Int = Min(56dip + scvHelp.Panel.Height, maxSheetH)
	pnlSheet.AddView(scvHelp, 0, 56dip, 100%x, sheetH - 56dip)

	act.AddView(pnlSheet, 0, 100%y - sheetH, 100%x, sheetH)
End Sub

Private Sub MeasureLabelHeight(lbl As Label, txt As String, textSize As Float, maxW As Int) As Int
	Try
		Dim jo As JavaObject = lbl
		Dim vw As JavaObject
		vw.InitializeStatic("android.view.View$MeasureSpec")
		jo.RunMethod("measure", Array(vw.RunMethod("makeMeasureSpec", Array(maxW, 1073741824)), vw.RunMethod("makeMeasureSpec", Array(0, 0))))
		Dim h As Int = jo.RunMethod("getMeasuredHeight", Null) + 4dip
		Return Max(h, 24dip)
	Catch
		Dim approxLines As Int = Max(1, txt.Length / 35 + 1)
		Return approxLines * 22dip
	End Try
End Sub

Private Sub FormatRichEquation(text As String) As CSBuilder
	Dim cs As CSBuilder
	cs.Initialize
	Dim m As Matcher = Regex.Matcher("(_\{([^}]+)\}|_([A-Za-z0-9]+))|(\^\{([^}]+)\}|\^([0-9]+(?:\.[0-9]+)?|[A-Za-z0-9]+))", text)
	Dim prev As Int = 0
	Do While m.Find
		cs.Append(text.SubString2(prev, m.GetStart(0)))
		If m.Group(1) <> Null Then
			Dim subText As String = m.Group(2)
			If subText = Null Then subText = m.Group(3)
			cs.VerticalAlign(2dip).RelativeSize(0.72).Append(subText).Pop.Pop
		Else
			Dim supText As String = m.Group(5)
			If supText = Null Then supText = m.Group(6)
			cs.VerticalAlign(-4dip).RelativeSize(0.72).Append(supText).Pop.Pop
		End If
		prev = m.GetEnd(0)
	Loop
	cs.Append(text.SubString(prev))
	Return cs
End Sub

Private Sub ColorToHex(col As Int) As String
	Dim r As Int = Bit.And(Bit.ShiftRight(col, 16), 0xFF)
	Dim g As Int = Bit.And(Bit.ShiftRight(col, 8), 0xFF)
	Dim b As Int = Bit.And(col, 0xFF)
	Return "#" & PadHex(Bit.ToHexString(r)) & PadHex(Bit.ToHexString(g)) & PadHex(Bit.ToHexString(b))
End Sub

Private Sub PadHex(h As String) As String
	If h.Length = 0 Then Return "00"
	If h.Length = 1 Then Return "0" & h
	If h.Length > 2 Then Return h.SubString(h.Length - 2)
	Return h
End Sub

Private Sub BuildLatexHtml(latex As String, colorHex As String) As String
	Dim jsLatex As String = latex.Replace("\", "\\").Replace("""", "\""")
	Dim sb As StringBuilder
	sb.Initialize
	sb.Append("<!DOCTYPE html><html><head><meta charset='utf-8'>")
	sb.Append("<meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'>")
	sb.Append("<link rel='stylesheet' href='katex.min.css'>")
	sb.Append("<script src='katex.min.js'></script>")
	sb.Append("<style>")
	sb.Append("html,body{margin:0;padding:0;width:100%;height:100%;background:transparent;display:flex;justify-content:center;align-items:center;overflow-x:auto;overflow-y:hidden;-webkit-user-select:none;user-select:none;box-sizing:border-box;color:").Append(colorHex).Append(";font-size:16px;}")
	sb.Append("#m{padding:2px 8px;text-align:center;white-space:nowrap;}")
	sb.Append(".katex-display{margin:0 !important;}")
	sb.Append("</style></head><body>")
	sb.Append("<div id='m'></div>")
	sb.Append("<script>")
	sb.Append("try{katex.render(""").Append(jsLatex).Append(""", document.getElementById('m'), {displayMode:true,throwOnError:false});}")
	sb.Append("catch(e){document.getElementById('m').innerText=""").Append(jsLatex).Append(""";}")
	sb.Append("</script></body></html>")
	Return sb.ToString
End Sub

Private Sub ConfigureWebView(wv As WebView)
	wv.Color = Colors.Transparent
	wv.ZoomEnabled = False
	wv.JavaScriptEnabled = True
	Try
		Dim jo As JavaObject = wv
		jo.RunMethod("setBackgroundColor", Array(0))
		jo.RunMethod("setVerticalScrollBarEnabled", Array(False))
		jo.RunMethod("setHorizontalScrollBarEnabled", Array(False))
	Catch
		Log("ConfigureWebView: " & LastException.Message)
	End Try
End Sub

Private Sub ToSafeKey(k As String) As String
	Dim s As String = k.Replace("Δ", "Delta").Replace("δ", "delta").Replace("σ", "sigma").Replace("θ", "theta")
	s = s.Replace("φ", "phi").Replace("Ψ", "psi").Replace("β", "beta").Replace("ρ", "rho").Replace("μ", "mu")
	Dim sb As StringBuilder
	sb.Initialize
	For i = 0 To s.Length - 1
		Dim c As String = s.SubString2(i, i + 1)
		Dim cp As Int = Asc(c)
		If (cp >= 65 And cp <= 90) Or (cp >= 97 And cp <= 122) Or (cp >= 48 And cp <= 57) Or c = "_" Then
			sb.Append(c)
		Else
			sb.Append("_")
		End If
	Next
	Dim res As String = sb.ToString
	Do While res.Contains("__")
		res = res.Replace("__", "_")
	Loop
	If res.StartsWith("_") Then res = res.SubString(1)
	If res.EndsWith("_") Then res = res.SubString2(0, res.Length - 1)
	Return res
End Sub

Sub wvEq_OverrideUrl(Url As String) As Boolean
	If Url.StartsWith("http://") Or Url.StartsWith("https://") Then Return True
	Return False
End Sub

#If Java
public void setupLatexView(final android.webkit.WebView w, String safeKey, String fallbackLatex, String hexColor) {
    if (w == null) return;
    android.webkit.WebSettings st = w.getSettings();
    st.setJavaScriptEnabled(true);
    try {
        st.setAllowFileAccess(true);
        st.setAllowContentAccess(true);
    } catch (Exception e) {}
    st.setSupportZoom(false);
    st.setBuiltInZoomControls(false);
    st.setDisplayZoomControls(false);
    w.setBackgroundColor(0);
    w.setVerticalScrollBarEnabled(false);
    w.setHorizontalScrollBarEnabled(false);

    final android.content.Context ctx = anywheresoftware.b4a.BA.applicationContext;

    w.setWebViewClient(new android.webkit.WebViewClient() {
        @Override
        public android.webkit.WebResourceResponse shouldInterceptRequest(android.webkit.WebView view, android.webkit.WebResourceRequest request) {
            String path = request.getUrl().getPath();
            if (path != null && path.contains(".woff2")) {
                String fontFile = path.substring(path.lastIndexOf("/") + 1).toLowerCase();
                try {
                    String[] rList = ctx.getAssets().list("");
                    if (rList != null) {
                        for (String a : rList) {
                            if (a.toLowerCase().endsWith(fontFile)) {
                                java.io.InputStream is = ctx.getAssets().open(a);
                                return new android.webkit.WebResourceResponse("font/woff2", null, is);
                            }
                        }
                    }
                } catch (Exception e) {}
            }
            return super.shouldInterceptRequest(view, request);
        }
    });

    String html = "";
    String target = safeKey.toLowerCase() + ".html";
    String foundAsset = null;
    try {
        String[] rList = ctx.getAssets().list("");
        if (rList != null) {
            for (String a : rList) {
                if (a.toLowerCase().endsWith(target)) {
                    foundAsset = a;
                    break;
                }
            }
        }
    } catch (Exception ex) {}

    if (foundAsset != null) {
        try {
            java.io.InputStream is = ctx.getAssets().open(foundAsset);
            java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
            byte[] buf = new byte[4096];
            int len;
            while ((len = is.read(buf)) != -1) {
                baos.write(buf, 0, len);
            }
            is.close();
            html = new String(baos.toByteArray(), "UTF-8");
        } catch (Exception e) {}
    }

    if (html.length() > 0) {
        html = html.replace("#009183", hexColor).replace("COLOR_PLACEHOLDER", hexColor);
    } else {
        html = "<!DOCTYPE html><html><body style='margin:0;background:transparent;display:flex;align-items:center;justify-content:center;color:" + hexColor + ";font-family:serif;font-size:16px;'><div style='margin:auto;text-align:center;'>" + fallbackLatex + "</div></body></html>";
    }

    w.loadDataWithBaseURL("https://appassets.local/katex/", html, "text/html", "utf-8", null);
}
#End If
