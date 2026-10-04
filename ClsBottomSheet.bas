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
	
	' Overlay
	pnlOverlay.Initialize("pnlOverlay")
	pnlOverlay.Color = Colors.ARGB(128, 0, 0, 0)
	act.AddView(pnlOverlay, 0, 0, 100%x, 100%y)
	
	' Sheet panel
	pnlSheet.Initialize("pnlSheet")
	pnlSheet.Color = mBackgroundColor
	
	' Rounded top corners
	Dim gdSheet As GradientDrawable
	gdSheet.Initialize("TOP_BOTTOM", Array As Int(mBackgroundColor, mBackgroundColor))
	gdSheet.CornerRadius = 16dip
	pnlSheet.Background = gdSheet
	
	' Drag handle indicator
	pnlHandle.Initialize("")
	Dim gdHandle As GradientDrawable
	gdHandle.Initialize("TOP_BOTTOM", Array As Int(Colors.RGB(189, 189, 189), Colors.RGB(189, 189, 189)))
	gdHandle.CornerRadius = 3dip
	pnlHandle.Background = gdHandle
	pnlSheet.AddView(pnlHandle, (100%x - 40dip) / 2, 8dip, 40dip, 4dip)
	
	' Title
	lblTitle.Initialize("")
	lblTitle.Text = title
	lblTitle.TextSize = 16
	lblTitle.TextColor = mTitleColor
	lblTitle.Typeface = Typeface.DEFAULT_BOLD
	lblTitle.Gravity = Gravity.CENTER_VERTICAL
	lblTitle.Padding = Array As Int(20dip, 0, 20dip, 0)
	pnlSheet.AddView(lblTitle, 0, 16dip, 100%x, 40dip)
	
	' Calculate sheet height: title + items, capped at 75% screen
	Dim itemCount As Int = items.Size
	Dim totalItemsH As Int = 0
	Dim i As Int
	For i = 0 To itemCount - 1
		Dim rawItem As String = items.Get(i)
		If rawItem.Contains("|") Then
			totalItemsH = totalItemsH + 58dip
		Else
			totalItemsH = totalItemsH + 48dip
		End If
	Next
	Dim scvH As Int = totalItemsH + 8dip
	Dim contentHeight As Int = 56dip + scvH + 16dip
	Dim maxHeight As Int = 75%y
	Dim sheetHeight As Int = Min(contentHeight, maxHeight)
	
	act.AddView(pnlSheet, 0, 100%y - sheetHeight, 100%x, sheetHeight)
	
	' Items scroll view
	Dim scrollHeight As Int = sheetHeight - 56dip - 8dip
	scvItems.Initialize(scvH)
	pnlSheet.AddView(scvItems, 0, 56dip, 100%x, scrollHeight)
	scvItems.Panel.Height = scvH
	
	' Create item rows
	Dim yItem As Int = 0
	For i = 0 To itemCount - 1
		Dim itemStr As String = items.Get(i)
		Dim parts() As String = Regex.Split("\|", itemStr)
		Dim prim As String = parts(0).Trim
		Dim sec As String = ""
		If parts.Length > 1 Then sec = parts(1).Trim
		Dim sel As Boolean = (i = selectedIndex)
		
		Dim thisHeight As Int = 48dip
		If sec.Length > 0 Then thisHeight = 58dip
		
		Dim pnlItem As Panel
		pnlItem.Initialize("pnlItem")
		pnlItem.Color = mBackgroundColor
		pnlItem.Tag = i
		scvItems.Panel.AddView(pnlItem, 0, yItem, 100%x, thisHeight)
		
		' Radio indicator
		Dim lblRadio As Label
		lblRadio.Initialize("pnlItem")
		lblRadio.Tag = i
		If sel Then
			lblRadio.Text = Chr(9679) ' filled circle
			lblRadio.TextColor = mSelectedTextColor
		Else
			lblRadio.Text = Chr(9675) ' empty circle
			lblRadio.TextColor = mDividerColor
		End If
		lblRadio.TextSize = 16
		lblRadio.Gravity = Gravity.CENTER
		pnlItem.AddView(lblRadio, 10dip, 0, 32dip, thisHeight)
		
		' Item text
		If sec.Length > 0 Then
			Dim lblPrim As Label
			lblPrim.Initialize("pnlItem")
			lblPrim.Tag = i
			lblPrim.Text = prim
			lblPrim.TextSize = 15
			If sel Then
				lblPrim.TextColor = mSelectedTextColor
				lblPrim.Typeface = Typeface.DEFAULT_BOLD
			Else
				lblPrim.TextColor = mTextColor
				lblPrim.Typeface = Typeface.DEFAULT
			End If
			lblPrim.Gravity = Gravity.CENTER_VERTICAL
			pnlItem.AddView(lblPrim, 46dip, 5dip, 100%x - 58dip, 24dip)
			
			Dim lblSec As Label
			lblSec.Initialize("pnlItem")
			lblSec.Tag = i
			lblSec.Text = sec
			lblSec.TextSize = 12
			lblSec.TextColor = Colors.ARGB(160, Bit.And(Bit.ShiftRight(mTextColor, 16), 0xFF), Bit.And(Bit.ShiftRight(mTextColor, 8), 0xFF), Bit.And(mTextColor, 0xFF))
			lblSec.Gravity = Gravity.TOP
			pnlItem.AddView(lblSec, 46dip, 29dip, 100%x - 58dip, 24dip)
		Else
			Dim lblPrimOnly As Label
			lblPrimOnly.Initialize("pnlItem")
			lblPrimOnly.Tag = i
			lblPrimOnly.Text = prim
			lblPrimOnly.TextSize = 15
			If sel Then
				lblPrimOnly.TextColor = mSelectedTextColor
				lblPrimOnly.Typeface = Typeface.DEFAULT_BOLD
			Else
				lblPrimOnly.TextColor = mTextColor
				lblPrimOnly.Typeface = Typeface.DEFAULT
			End If
			lblPrimOnly.Gravity = Gravity.CENTER_VERTICAL
			pnlItem.AddView(lblPrimOnly, 46dip, 0, 100%x - 58dip, thisHeight)
		End If
		
		' Divider line
		If i < itemCount - 1 Then
			Dim pnlDiv As Panel
			pnlDiv.Initialize("")
			pnlDiv.Color = mDividerColor
			scvItems.Panel.AddView(pnlDiv, 46dip, yItem + thisHeight - 1dip, 100%x - 46dip, 1dip)
		End If
		
		yItem = yItem + thisHeight
	Next
	
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

Private Sub pnlOverlay_Click
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
