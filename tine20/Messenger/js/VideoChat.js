
Ext.ns('Tine.Messenger');

var VideoChatStates = {
    IDLE : 0,
    CALL_CALLING : 1,
    CALL_RINGING : 2,
    CALL_ESTABLISHED : 3
};

Tine.Messenger.VideoChat = {
    
    /**
     * Indicates if the video chat functionality is enabled.
     */
    enabled: false,
    
    /**
     * The RTMFP server url.
     */
    rtmfpServerUrl: '',
    
    /**
     * The videochat state.
     */
    state: VideoChatStates.IDLE,
    
    /**
     * Far user jid.
     */
    jid: null,
    
    /**
     * Cumulus connection id.
     */
    id:null,
    
    /**
     * Cumulus connection id of the user who is this videochat connected to.
     */
    farId:null,
    
    /**
     * Videochat invite message box.
     */
    invite: null,
    
    
    /**
     * Indicates if the videochat panel is hided.
     *
     */
    hided : true,
    
    originalChatWidth: 400,
    
    VIDEOCHAT_OBJECT_ID : 'messenger-chat-videochat-object',
    
    flashVideoWidth: 368,
    flashVideoHeight: 276,
    
    sendStartCall: function (jid, myId) {
	var to = typeof jid == 'string' ? jid : jid.node.attributes.jid;
                       
	var info = $msg({
	    'to': to + '/' + Tine.Messenger.registry.get('resource'),
	    'type': 'videochat'
	});
	
	info.c("startcall", {
	    'id': myId,
	    'user': Tine.Messenger.Util.getJidFromConfigNoResource()
	});
	
	Tine.Messenger.Application.connection.send(info);         
    },
    sendRejectCall: function(item){
	
	var to = typeof item == 'string' ? item : item.node.attributes.jid;
	               
	var info = $msg({
	    'to': to + '/' + Tine.Messenger.registry.get('resource'),
	    'type': 'videochat'
	});
	
	info.c("rejectcall", {
	    'user': Tine.Messenger.Util.getJidFromConfigNoResource()
	});
	
	Tine.Messenger.Application.connection.send(info);  
    },
    sendBusy: function(jid){
                       
	var info = $msg({
	    'to': jid + '/' + Tine.Messenger.registry.get('resource'),
	    'type': 'videochat'
	});
	
	info.c("busy", {
	    'user': Tine.Messenger.Util.getJidFromConfigNoResource()
	});
	
	Tine.Messenger.Application.connection.send(info);         
    },
    sendCancelCall: function(jid){
                       
	var info = $msg({
	    'to': jid + '/' + Tine.Messenger.registry.get('resource'),
	    'type': 'videochat'
	});
	
	info.c("cancelcall", {
	    'user': Tine.Messenger.Util.getJidFromConfigNoResource()
	});
	
	Tine.Messenger.Application.connection.send(info);         
    },
    
    onStartCall: function(msg){
	var startcall = $(msg).find('startcall'),
	id = startcall.attr('id'),
	user = startcall.attr('user');
	
	var app = Tine.Tinebase.appMgr.get('Messenger');
		
	if(Tine.Messenger.VideoChat.state == VideoChatStates.IDLE){
	    Tine.Messenger.VideoChat.state = VideoChatStates.CALL_RINGING;
		
	    Tine.Messenger.VideoChat.invite = Ext.MessageBox.show({
		title: 'Video chat', 
		msg: String.format(
		    app.i18n._('{0} is inviting you to a video chat. Do you Accept?'), 
		    user
		),
		
		buttons: Ext.Msg.YESNO, 
		icon: Ext.MessageBox.QUESTION,
		modal: false,
		fn: function(btn) {
		    if(btn == 'yes') {
			Tine.Messenger.VideoChat.farId = id;
			Tine.Messenger.VideoChat.jid = user;
			var chat = Tine.Messenger.ChatHandler.showChatWindow(user, '', 'chat', true);
			Tine.Messenger.VideoChat.loadVideoChat(chat);
		    }
		    else{
			Tine.Messenger.VideoChat.sendRejectCall(user);
			Tine.Messenger.VideoChat.state = VideoChatStates.IDLE;
		    }
		}
	    });
	}
	else{
	    Tine.Messenger.VideoChat.sendBusy(user);
	}
	    
    },
    onRejectCall: function(msg){
	var rejectcall = $(msg).find('rejectcall'),
	user = rejectcall.attr('user');
	    
	var chat = Tine.Messenger.VideoChat.getChatWindow(Tine.Messenger.VideoChat.jid);
	Tine.Messenger.VideoChat.unloadVideoChat(chat);
	Tine.Messenger.VideoChat.hideVideoChat(chat);
	
	var app = Tine.Tinebase.appMgr.get('Messenger');
	Tine.Messenger.ChatHandler.setChatMessage(
	    Tine.Messenger.VideoChat.jid, 
	    String.format(
		app.i18n._('{0} rejected your video chat call'), 
		user
	    ),
	    app.i18n._('Info'),
	    'messenger-notify'
	    );
	Tine.Messenger.VideoChat.state = VideoChatStates.IDLE;
	
    },
    onBusy: function(msg){
	var busy = $(msg).find('busy'),
	user = busy.attr('user');
	    
	var chat = Tine.Messenger.VideoChat.getChatWindow(Tine.Messenger.VideoChat.jid);
	Tine.Messenger.VideoChat.unloadVideoChat(chat);
	Tine.Messenger.VideoChat.hideVideoChat(chat);
	
	var app = Tine.Tinebase.appMgr.get('Messenger');
	Tine.Messenger.ChatHandler.setChatMessage(
	    Tine.Messenger.VideoChat.jid, 
	    String.format(
		app.i18n._('{0} is busy for video chat'), 
		user
	    ),
	    app.i18n._('Info'),
	    'messenger-notify'
	    );
	Tine.Messenger.VideoChat.state = VideoChatStates.IDLE;
	    
    },
    onCancelCall: function(msg){
	var cancelcall = $(msg).find('cancelcall'),
	user = cancelcall.attr('user');
	    
	if( Tine.Messenger.VideoChat.invite != null){
	    Tine.Messenger.VideoChat.invite.hide();
	    
	    var app = Tine.Tinebase.appMgr.get('Messenger');
	    Tine.Messenger.ChatHandler.setChatMessage(
		user, 
		String.format(
		    app.i18n._('One video chat call missed from {0}'), 
		    user
		),
		app.i18n._('Info'),
		'messenger-notify'
	    );
	}
	
	
	Tine.Messenger.VideoChat.state = VideoChatStates.IDLE;
	    
    },
    
    onRequest: function (msg) {
	
	if($(msg).find('startcall').length)
	    Tine.Messenger.VideoChat.onStartCall(msg);
	else if($(msg).find('rejectcall').length)
	    Tine.Messenger.VideoChat.onRejectCall(msg);
	else if($(msg).find('busy').length)
	    Tine.Messenger.VideoChat.onBusy(msg);
	else if($(msg).find('cancelcall').length)
	    Tine.Messenger.VideoChat.onCancelCall(msg);
	    
	
	return true;

    },
   
   
   
   
    // -------------------------------------------------------------------   
   
   
    startVideo: function (window_chat, id, jid){

	if(Tine.Messenger.VideoChat.state == VideoChatStates.IDLE){
	    Tine.Messenger.VideoChat.jid = jid;
	    Tine.Messenger.VideoChat.loadVideoChat(window_chat);
	    Tine.Messenger.VideoChat.showVideoChat(window_chat);
	    Tine.Messenger.VideoChat.state = VideoChatStates.CALL_CALLING;
	}
	else{
	    if(Tine.Messenger.VideoChat.jid != jid){
		var app = Tine.Tinebase.appMgr.get('Messenger');
		Tine.Messenger.ChatHandler.setChatMessage(
		    jid, 
		    app.i18n._('You are already in a video chat'), 
		    app.i18n._('Info'),
		    'messenger-notify'
		);
	    }
	}
	
	return true;
    },
        
   
    appLoaded: function()
    {
	Tine.Messenger.VideoChat.startApp();
    },
    startApp:function(){
	var movie = Tine.Messenger.VideoChat.getFlashMovie(); 
	
	if(movie && typeof(movie.startApp) != "undefined"){
	    movie.startApp(Tine.Messenger.VideoChat.rtmfpServerUrl, Tine.Messenger.Util.getJidFromConfigNoResource());
	}
	    
	return true;
    },
    /**
     * Both sides of videochat call this function. The side is identified by the state.
     */
    myId: function(id){
	
	Tine.Messenger.VideoChat.id = id;
	if(Tine.Messenger.VideoChat.state == VideoChatStates.CALL_CALLING){
	    Tine.Messenger.VideoChat.acceptCallFrom(Tine.Messenger.VideoChat.jid);
	    Tine.Messenger.VideoChat.sendStartCall(Tine.Messenger.VideoChat.jid, Tine.Messenger.VideoChat.id);
	}
	else if(Tine.Messenger.VideoChat.state == VideoChatStates.CALL_RINGING){
	    Tine.Messenger.VideoChat.placeCall(Tine.Messenger.VideoChat.farId);
	}

    },
    acceptCallFrom:function(jid){
	var movie = Tine.Messenger.VideoChat.getFlashMovie(); 
	if(movie && typeof(movie.acceptCallFrom) != "undefined"){
	    movie.acceptCallFrom(jid);
	}
    },
    placeCall: function(farId){
	var movie = Tine.Messenger.VideoChat.getFlashMovie(); 
	if(movie && typeof(movie.placeCall) != "undefined"){
	    movie.placeCall('', farId);
	}
    },
    
    callStarted: function(){
	
	var chat = Tine.Messenger.ChatHandler.showChatWindow(Tine.Messenger.VideoChat.jid, '', 'chat', true);
	Tine.Messenger.VideoChat.showVideoChat(chat);
	
	Tine.Messenger.VideoChat.state = VideoChatStates.CALL_ESTABLISHED;
    },
    hangup: function(_box){
	
	if(Tine.Messenger.VideoChat.state != VideoChatStates.IDLE){
	    
	    Tine.Messenger.VideoChat.hideVideoChat(_box);
	    
	    if (Tine.Messenger.VideoChat.state == VideoChatStates.CALL_CALLING){
		Tine.Messenger.VideoChat.sendCancelCall(Tine.Messenger.VideoChat.jid);
		
		// enquanto o hangup antes de haver conexao nao retornar callEnded (falanga)
		if(_box != null)
		    Tine.Messenger.VideoChat.unloadVideoChat(_box);
		Tine.Messenger.VideoChat.state = VideoChatStates.IDLE;
		Tine.Messenger.VideoChat.jid = null;
		
	    }
	    var movie = Tine.Messenger.VideoChat.getFlashMovie(); 
	    
	    if(movie && typeof(movie.hangup) != "undefined"){
		movie.hangup();
		
		//workaround: two flash calls to callEnded doesn't work
		Tine.Messenger.VideoChat.callEnded();
	    }
	    
	}
	
	
    },
    callEnded: function(id){
	var _jid = Tine.Messenger.VideoChat.jid;
	Tine.Messenger.VideoChat.jid = null;
	if(_jid !== null){
	    
	    var chat = Tine.Messenger.VideoChat.getChatWindow(_jid);

	    Tine.Messenger.VideoChat.hideVideoChat(chat);
	    if(chat !== null){
		Tine.Messenger.VideoChat.unloadVideoChat(chat);
	    }
	    Tine.Messenger.VideoChat.state = VideoChatStates.IDLE;
	    
	}
    },
    
    unloadVideoChat: function(_box){
	
	_box.getComponent('messenger-chat-videochat').removeAll();
	_box.doLayout();

	
    },
    
    
    
    loadVideoChat : function(_box){
	var app = Tine.Tinebase.appMgr.get('Messenger');
	var flash = new Ext.FlashComponent({
	    url: "Messenger/flash/ExpressoVideoChat.swf",
	    wmode:"direct",
	    flashParams:{
		wmode:"direct"
	    },
	    flashVars:{
		useExternalInterface: "true", 
		extNamespace : "Tine.Messenger.VideoChat"
	    },
	    id: Tine.Messenger.VideoChat.VIDEOCHAT_OBJECT_ID, 
	    allowScriptAccess:"sameDomain",
	    flashVersion: "10.0.0",
	    swfWidth: Tine.Messenger.VideoChat.flashVideoWidth,
	    swfHeight: Tine.Messenger.VideoChat.flashVideoHeight

	});
	    
	// create exit button and mute
	var options = new Ext.Panel({
	    itemId: 'messenger-chat-videochat-options',
	    height: 30,
	    width: Tine.Messenger.VideoChat.flashVideoWidth,
	    layout : {
		type  : 'hbox',
		pack  : 'center',
		align : 'middle'
	    },
	    border: false,
	    items: [
	    {
		xtype: 'button',
		//icon: 'images/messenger/icon_cancel.png',
		text: app.i18n._('End'),
		tooltip: app.i18n._('End video chat'),
		handler : function() { 
		    Tine.Messenger.VideoChat.hangup(
			Tine.Messenger.VideoChat.getChatWindow(Tine.Messenger.VideoChat.jid)
		    );
		}
	    }
	    //,new Ext.Button({text:'Mute'})
	    ]
	});
	
	_box.getComponent('messenger-chat-videochat').add(flash);
	_box.getComponent('messenger-chat-videochat').add(options);

	_box.doLayout();
    
    },
    showVideoChat: function(_box){
	if(Tine.Messenger.VideoChat.hided){
	    
	    _box.setWidth(Tine.Messenger.VideoChat.originalChatWidth + Tine.Messenger.VideoChat.flashVideoWidth);
	    _box.getComponent('messenger-chat-videochat').getEl().setWidth(Tine.Messenger.VideoChat.flashVideoWidth);
	    
	    _box.getTopToolbar().getComponent('messenger-chat-video').setVisible(false);
	    
	    _box.doLayout();

	    Tine.Messenger.VideoChat.hided = false;
	}
	
    },
   
    hideVideoChat : function(_box){
	if(!Tine.Messenger.VideoChat.hided){
	    _box.setWidth(Tine.Messenger.VideoChat.originalChatWidth);
	    _box.getComponent('messenger-chat-videochat').getEl().setWidth(0);
	    
	    _box.getTopToolbar().getComponent('messenger-chat-video').setVisible(
		!Tine.Messenger.RosterHandler.isContactUnavailable(Tine.Messenger.VideoChat.jid)
	    );

	    _box.doLayout();

	    Tine.Messenger.VideoChat.hided = true;
	}
	
    },
    
     
    getFlashMovie: function (){
	if (navigator.appName.indexOf("Microsoft") != -1) {
	    return window[Tine.Messenger.VideoChat.VIDEOCHAT_OBJECT_ID];
	} else {
	    return document[Tine.Messenger.VideoChat.VIDEOCHAT_OBJECT_ID];
	}
    },
    getChatWindow: function(jid){
	var chat_id = Tine.Messenger.ChatHandler.formatChatId(jid);
	var chat = Ext.getCmp(chat_id) ? Ext.getCmp(chat_id) : null;
	return chat;
    },
    
    
    
    
    setIconVisible: function(chat, visible){
	if(chat !== null && chat.getTopToolbar !== undefined){
	    chat.getTopToolbar().getComponent('messenger-chat-video').setVisible(visible);
	}
    }
    
    
};