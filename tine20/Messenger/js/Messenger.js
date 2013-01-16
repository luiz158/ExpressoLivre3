Ext.ns('Tine.Messenger');

// Messenger Application constants
var MESSENGER_CHAT_ID_PREFIX = 'messenger-chat-',
    MESSENGER_DEBUG = false,
    PAGE_RELOAD = false;

Tine.Messenger.factory={
    statusStore : new Ext.data.SimpleStore({
        fields:["value","text"],
        data:[
              ["available","Online"]
             ,["away","Away"]
             ,["dnd","Do Not Disturb"]
             ,["unavailable","Unavailable"]
//             ,["chat","Chat"]
//             ,["xa","XA"]
            ]
        })
};


Tine.Messenger.Credential = {
    
    myJid: function(){
        return '';
    }
  , myNick: function(){
        return Tine.Tinebase.appMgr.get('Messenger').i18n._('ME');
    }
  , myAvatar: function(){
        return '/images/empty_photo_male.png';
    }
  , getHtml: function(){
            return '<div id="credential">'+
                    '     <img src="'+ this.myAvatar() +'" />'+
                    '     <span class="name">'+ this.myJid() +'</span>'+
                    '</div>';
    }
};

var IMConst = {
   // Status constants
   /*
    * _("Available")
    * _("Unavailable")
    * _("Away")
    * _("Auto Status (idle)")
    * _("Do Not Disturb")
    */
    ST_AVAILABLE : {id:"available", text:"Available"},
    ST_UNAVAILABLE : {id:"unavailable", text:"Unavailable"},
    ST_AWAY : {id:"away", text:"Away"},
    ST_XA : {id:"xa", text:"Auto Status (idle)"},
    ST_DONOTDISTURB : {id:"dnd", text:"Do Not Disturb"},
    
  // Subscription constants  
    SB_NONE : "none",
    SB_FROM : "from",
    SB_BOTH : "both",
    SB_TO : "to",
    SB_WAITING : "waiting",
    SB_SUBSCRIBE : "subscribe",
    SB_SUBSCRIBED : "subscribed",
    SB_UNSUBSCRIBE : "unsubscribe",
    SB_UNSUBSCRIBED : "unsubscribed"
    
};

Tine.Messenger.Application = Ext.extend(Tine.Tinebase.Application, {
    // Tinebase.Application configs
    hasMainScreen: false,
    appName: 'Messenger',
    
    // Delayed Tasks
    showMessengerDelayedTask: null,
    startMessengerDelayedTask: null,
    
    // Upload XML emoticons information
    xml_raw: null,
    
    // Shows if an HTTP error occured
    http_error: false,
    
    debugFunction: function () {
        Tine.Messenger.Application.connection.xmlInput = function (xml) {
            console.log('\\/ |\\/| |     |  |\\ |');
            console.log('/\\ |  | |__   |  | \\|');
            console.log(xml);
            console.log('Copy >>> '+(new XMLSerializer()).serializeToString(xml));
            var challenge = $(xml).find('challenge');
            if (challenge.length > 0)
                console.log(challenge.text());
            console.log('============================');
        };
        Tine.Messenger.Application.connection.xmlOutput = function (xml) {
            console.log('\\/ |\\/| |     /==\\ | | ====');
            console.log('/\\ |  | |__   \\__/ |_|   |');
            console.log(xml);
            console.log('Copy >>> '+(new XMLSerializer()).serializeToString(xml));
            var response = $(xml).find('response');
            if (response.length > 0)
                console.log(response.text());
            console.log('============================');
        };
    },
    
    debugStrophe: function (level, message) {
        if (MESSENGER_DEBUG)
            switch (level) {
                case Strophe.LogLevel.DEBUG:
                    console.log('Strophe debug: ' + message);
                    break;
                case Strophe.LogLevel.INFO:
                    console.log('Strophe info: ' + message);
                    break;
                case Strophe.LogLevel.WARN:
                    console.log('Strophe warning: ' + message);
                    break;
                case Strophe.LogLevel.ERROR:
                    console.log('Strophe error: ' + message);
                    break;
                case Strophe.LogLevel.FATAL:
                    console.log('Strophe fatal error: ' + message);
                    break;
                default:
                    console.log('STROPHE LOG!!');
            }
    },
    
    handleHttpErrors: function (level, message) {
        if (level >= Strophe.LogLevel.WARN) {
            var app = Tine.Tinebase.appMgr.get('Messenger');
            var httpStatuses = [
                {status: 403, error: app.i18n._('Access to server is forbidden') + '!'},
                {status: 404, error: app.i18n._('Server does not exist') + '!'},
                {status: 500, error: app.i18n._('Server error') + '!'},
                {status: 501, error: app.i18n._('Server does not support the method') + '!'},
                //{status: 502, error: app.i18n._('Server received invalid response from proxy') + '!'},
                {status: 503, error: app.i18n._('Server is unavailable') + '!'}
            ];
            
            for (var i = 0; i < httpStatuses.length; i++) {
                var regex = new RegExp(httpStatuses[i].status);
                if (regex.test(message)) {
                    Tine.Tinebase.Application.http_error = true;
                    Ext.Msg.show({
                        title: Tine.Tinebase.appMgr.get('Messenger').i18n._('Error'),
                        msg: httpStatuses[i].error,
                        buttons: Ext.Msg.OK,
                        icon: Ext.MessageBox.ERROR
                    });
                    app.stopMessenger();
                    break;
                }
            }
        }
    },
    
    getTitle: function () {
        return this.i18n.ngettext('Messenger', 'Messengers', 1);
    },
    
    init: function () {
        // Shows IM window and starts communication
        this.initMessengerDelayedTask = new Ext.util.DelayedTask(this.initMessenger, this);
        this.initMessengerDelayedTask.delay(500);
        if (Tine.Messenger.registry.get('preferences').get('messengerStart') == 'loading') {
            this.startMessengerDelayedTask = new Ext.util.DelayedTask(this.startMessenger, this);
            this.startMessengerDelayedTask.delay(1000);
        }
        
        //this.isBlurred = false;
        this.blinking = false;
        this.windowOriginalTitle = null;
        this.blinkTitle = "IM Message"; // _('IM Message')
        this.blinkTimer = null;
    },
    
    initMessenger: function () {
        var IMwindow = new Tine.Messenger.ClientDialog();
        Tine.Tinebase.MainScreen.getMainMenu().insert(2, {
            xtype: 'button',
            id: 'messenger',
            text: 'Messenger',
            icon: '/images/messenger/talk-balloons-off.png',
            listeners: {
                click: function () {
                    IMwindow.show();
                    if (Tine.Messenger.registry.get('preferences').get('messengerStart') == 'clicking') {
                        this.startMessenger();
                    }
                },
                scope: this
            }
        });

        Tine.Tinebase.MainScreen.getMainMenu().doLayout();

        Ext.DomHelper.append(Ext.getBody(), '<div id="messenger-loghandler-status"></div>');

        Ext.EventManager.onWindowResize(function(w, h){
            Tine.Messenger.Window._onMoveWindowAction(IMwindow);
            // Do to all open chats
            var chats = Ext.query('.messenger-chat-window');
            Ext.each(chats, function (item, index) {
                Tine.Messenger.Window._onMoveWindowAction(Ext.getCmp(item.id));
            });
        });
        
        // Redefining Strophe log
        Strophe.log = function (level, msg) {
            Tine.Tinebase.appMgr.get('Messenger').handleHttpErrors(level, msg);
            Tine.Tinebase.appMgr.get('Messenger').debugStrophe(level, msg);
        };
    },
    
    startMessenger: function (status, statusText) {
        Tine.Messenger.Log.debug("Starting Messenger...");
        // Loading Messenger
        Ext.getCmp('connectloading').show();
        
        this.connectToJabber();
	this.initVideoChat();
        
        Ext.getCmp("ClientDialog").show();

        Ext.getCmp('ClientDialog').status = (status != null) ? status : IMConst.ST_AVAILABLE.id;
        
        // Setting the system button (on/off)
        Tine.Messenger.IM.changeSystemLogonButton(['shutdown', 'Logout']);
        Ext.getCmp('messenger-logout').systemOn = true;
    },
    
    stopMessenger: function () {
        Tine.Messenger.Log.debug("Stopping Messenger...");
        Tine.Tinebase.appMgr.get('Messenger').getConnection().disconnect();
        Tine.Messenger.Log.debug("Messenger Stopped!");
        Tine.Messenger.IM.changeSystemLogonButton(['startup', 'Login']);
    },
    
    initVideoChat: function(){
	var rtmfpServerUrl = Ext.util.Format.trim(Tine.Messenger.registry.get('rtmfpServerUrl'));
	Tine.Messenger.VideoChat.enabled = (rtmfpServerUrl != '');
	Tine.Messenger.VideoChat.rtmfpServerUrl = rtmfpServerUrl;
	
    },
    
    getConnection: function () {
        return Tine.Messenger.Application.connection;
    },
    
    connectToJabber: function () {
        Tine.Messenger.Application.connection = new Strophe.Connection("/http-bind");

        if (MESSENGER_DEBUG)
            Tine.Tinebase.appMgr.get('Messenger').debugFunction();
        
        var textToSend = Tine.Tinebase.registry.get('currentAccount').contact_id +
                         ':' +
                         Tine.Tinebase.registry.get('currentAccount').accountEmailAddress;
        Tine.Messenger.Application.connection.connect(
            Tine.Messenger.Util.getJidFromConfig(),
            Base64.encode(textToSend),
            Tine.Messenger.Util.callbackWrapper(Tine.Tinebase.appMgr.get('Messenger').connectionHandler),
            20
        );
            
//        window.onblur = function () {
//            console.log('====== BLUR =======');
//            Tine.Tinebase.appMgr.get('Messenger').isBlurred = true;
//        };
//        
        window.onfocus = function () {
            if (Tine.Tinebase.appMgr.get('Messenger').blinking) {
                document.title = Tine.Tinebase.appMgr.get('Messenger').windowOriginalTitle;
                window.clearInterval(Tine.Tinebase.appMgr.get('Messenger').blinkTimer);
                Tine.Tinebase.appMgr.get('Messenger').blinking = false;
            }
        };
    },
    
    connectionHandler: function (status, e) {
        if (e) console.log(e);
        console.log('STATUS: ' + status);
        if (status === Strophe.Status.CONNECTING) {  // Status = 1
            Tine.Messenger.Log.debug("Connecting...");
            // When connecting OK, take off the line below
            //Ext.getCmp('messenger-connect-cmd').setText(IM.i18n()._('Connecting')+'...').disable();
            //$('.messenger-connect-display img').css('display','block');
            
        } else if (status === Strophe.Status.CONNFAIL) {  // Status = 2
            Tine.Messenger.RosterHandler.clearRoster();
            // Disable components
            Tine.Messenger.IM.disableOnDisconnect();
            Tine.Messenger.Log.error("Connection failed!");
            Ext.Msg.show({
                title: Tine.Tinebase.appMgr.get('Messenger').i18n._('Error'),
                msg: Tine.Tinebase.appMgr.get('Messenger').i18n._('Can\'t connect to server')+'!',
                buttons: Ext.Msg.OK,
                icon: Ext.MessageBox.ERROR
            });
        } else if (status === Strophe.Status.AUTHENTICATING) {  // Status = 3
            Tine.Messenger.Log.debug("Authenticating...");
            // When connecting OK, take off the line below
        } else if (status === Strophe.Status.CONNECTED || status == Strophe.Status.ATTACHED) {  // Status = 5 or 8
            Tine.Messenger.Log.debug("Connected!");
            var XMPPConnection = Tine.Tinebase.appMgr.get('Messenger').getConnection();
            // Enable components
            Tine.Messenger.IM.enableOnConnect();
            
            // START THE HANDLERS
            // Chat Messaging handler
            XMPPConnection.addHandler(
                Tine.Messenger.Util.callbackWrapper(Tine.Messenger.ChatHandler.onIncomingMessage),
                null, 'message', 'chat'
            );
                
            // File Transfer
            XMPPConnection.addHandler(
                Tine.Messenger.Util.callbackWrapper(Tine.Messenger.FileTransfer.onRequest),
                null, 'message', 'filetransfer'
            );
	    
	    // Video Chat
            XMPPConnection.addHandler(
                Tine.Messenger.Util.callbackWrapper(Tine.Messenger.VideoChat.onRequest),
                null, 'message', 'videochat'
            );
                
            // Conference handler
            XMPPConnection.addHandler(
                Tine.Messenger.Util.callbackWrapper(Tine.Messenger.ChatHandler.onMUCMessage),
                null, 'message', 'normal'
            );
            
            // Getting Roster
            var roster = $iq({"type": "get"}).c("query", {"xmlns": "jabber:iq:roster"});
            XMPPConnection.sendIQ(
                roster, Tine.Messenger.Util.callbackWrapper(Tine.Messenger.RosterHandler._onStartRoster)
            );
                
            XMPPConnection.addHandler(
                Tine.Messenger.Util.callbackWrapper(Tine.Messenger.RosterHandler._onRosterResult),
                'jabber:client', 'iq', 'result'
            );
            
            XMPPConnection.addHandler(
                Tine.Messenger.Util.callbackWrapper(Tine.Messenger.LogHandler._onError),
                'jabber:client', 'iq', 'error'
            );

            XMPPConnection.addHandler(
                Tine.Messenger.Util.callbackWrapper(Tine.Messenger.LogHandler._onErrorMessage),
                null, 'message', 'error'
            );
                
            // Start unload events
            window.onbeforeunload = function () {
                Tine.Tinebase.appMgr.get('Messenger').stopMessenger(Tine.Tinebase.appMgr.get('Messenger').i18n._('Leave page') + '!');
            }

            // Leaving the page cause disconnection
            window.onunload = function () {
                Tine.Tinebase.appMgr.get('Messenger').stopMessenger(Tine.Tinebase.appMgr.get('Messenger').i18n._('Close window') + '!');
            }
        } else if (status === Strophe.Status.DISCONNECTED) {  // Status = 6
            Tine.Messenger.RosterHandler.clearRoster();
            // Disable components
            Tine.Messenger.IM.disableOnDisconnect();
            
            Tine.Tinebase.Application.http_error = false;

            window.onbeforeunload = null;
            window.onunload = null;
        } else if (status === Strophe.Status.AUTHFAIL) {  // Status = 4
            //Tine.Messenger.RosterHandler.clearRoster();
            Ext.Msg.show({
                title: Tine.Tinebase.appMgr.get('Messenger').i18n._('Error'),
                msg: Tine.Tinebase.appMgr.get('Messenger').i18n._('Authentication failed') + '!',
                buttons: Ext.Msg.OK,
                icon: Ext.MessageBox.ERROR
            });
            // Disable components
            Tine.Messenger.IM.disableOnDisconnect();
        } else if (status === Strophe.Status.DISCONNECTING) {// Status = 7
            Tine.Messenger.IM.disableOnDisconnect();
            if (Tine.Tinebase.Application.http_error) {
                Tine.Tinebase.appMgr.get('Messenger').getConnection()._onDisconnectTimeout();
                Tine.Tinebase.Application.http_error = false;
            }
        } else {
            //Tine.Messenger.RosterHandler.clearRoster();
            // Disable components
            Tine.Messenger.IM.disableOnDisconnect();
            Ext.Msg.show({
                title: Tine.Tinebase.appMgr.get('Messenger').i18n._('Error'),
                msg: Tine.Tinebase.appMgr.get('Messenger').i18n._('Unknown error') + '!',
                buttons: Ext.Msg.OK,
                icon: Ext.MessageBox.ERROR
            });
        }
    }
    
});

Tine.Messenger.IM = {
    getLocalServerInfo: 'Messenger.getLocalServerInfo',
    
    enableOnConnect: function(){
        // Change IM icon
        Ext.getCmp('messenger').setIcon('/images/messenger/talk-balloons.png');
        
        Ext.getCmp("ClientDialog").setIconClass('messenger-icon');
        Ext.getCmp("ClientDialog").connected = true;
        
        Ext.getCmp('messenger-contact-add').enable();
        Ext.getCmp('messenger-change-status-button')
            .enable()
            .setIcon('/images/messenger/user_online.png');
        
        // Enable action Add Group
        Ext.getCmp('messenger-group-mngt-add').enable();
        
        // Enable Show/Hide offline contacts
        Ext.getCmp('messenger-show-offline-contacts').enable();
        var delayed = new Ext.util.DelayedTask(Tine.Messenger.IM.verifyOfflineContactsDisplay, this);
        delayed.delay(500);
        
        // Enable Priority settings
        Ext.getCmp('messenger-change-priority').enable();
        
        // Enable Collapse/Expand Groups
        Ext.getCmp('messenger-expand-collapse-groups').enable();
    },
    disableOnDisconnect: function(){
        // Change IM icon
        Ext.getCmp('messenger').setIcon('/images/messenger/talk-balloons-off.png');
        
        // Unsetting main window configs
        var IMwindow = Ext.getCmp("ClientDialog");
        if (IMwindow) {
            Ext.getCmp("ClientDialog").setIconClass('messenger-icon-off');
            Ext.getCmp("ClientDialog").connected = false;
            Ext.getCmp("ClientDialog").status = IMConst.ST_UNAVAILABLE.id;
        }

        // Disable action Add Group
        Ext.getCmp('messenger-group-mngt-add').disable();
        Ext.getCmp('messenger-contact-add').disable();
        Ext.getCmp('messenger-change-status-button')
            .setIcon('/images/messenger/user_unavailable.png');

        // Disable Show/Hide offline contacts
        Ext.getCmp('messenger-show-offline-contacts').disable();
        
        // Disable Priority settings
        Ext.getCmp('messenger-change-priority').disable();
        
        // Disable Collapse/Expand Groups
        Ext.getCmp('messenger-expand-collapse-groups').disable();

        // Close all chats
        var chats = Ext.query('.messenger-chat-window');
        Ext.each(chats, function (item, index) {
            var chat = Ext.getCmp(item.id);
            
            PAGE_RELOAD = true;
            chat.destroy();
        });

        Ext.getCmp('connectloading').hide();
    },
    changeOfflineContactsDisplay: function () {
        // Change the display based on the button
        var displayBt = Ext.getCmp('messenger-show-offline-contacts');
        var i18n = Tine.Tinebase.appMgr.get('Messenger').i18n;
        
        if (displayBt.showOffline) {
            $('div.unavailable').hide();
            displayBt.setTooltip(i18n._('Show offline contacts'));
            displayBt.setIcon('images/messenger/icon_unavailable.png');
        } else {
            $('div.unavailable').show();
            displayBt.setTooltip(i18n._('Hide offline contacts'));
            displayBt.setIcon('images/messenger/hidden_icon_unavailable.png');
        }
    },
    verifyOfflineContactsDisplay: function (by_display_button) {
        by_display_button = by_display_button || false;
        // Verify if is showing or hiding
        var displayBt = Ext.getCmp('messenger-show-offline-contacts'),
            i18n = Tine.Tinebase.appMgr.get('Messenger').i18n,
            comparison;
        
        comparison = by_display_button ?
            displayBt.showOffline :
            Tine.Messenger.registry.get('preferences').get('offlineContacts') == 'show';

        if (comparison) {
            $('div.unavailable').show();
            displayBt.setTooltip(i18n._('Hide offline contacts'));
            displayBt.setIcon('images/messenger/hidden_icon_unavailable.png');
            displayBt.showOffline = true;
        } else {
            $('div.unavailable').hide();
            displayBt.setTooltip(i18n._('Show offline contacts'));
            displayBt.setIcon('images/messenger/icon_unavailable.png');
            displayBt.showOffline = false;
        }
    },
    changeSystemLogonButton: function (texts) {
        var pn = Ext.getCmp('messenger-logout'),
            i18n = Tine.Tinebase.appMgr.get('Messenger').i18n;
        
        pn.setIcon('images/messenger/' + texts[0] + '.png');
        pn.setTooltip(i18n._(texts[1]));
    },
    changeTreeviewGroupsDisplay: function (button) {
        var i18n = Tine.Tinebase.appMgr.get('Messenger').i18n;
        
        if (button.collapsed) {
            Tine.Messenger.RootNode().expandChildNodes(true);
            button.setTooltip(i18n._('Collapse groups'));
            button.setIcon('/images/messenger/collapse.png');
            button.collapsed = false;
        } else {
            Tine.Messenger.RootNode().collapseChildNodes(true);
            button.setTooltip(i18n._('Expand groups'));
            button.setIcon('/images/messenger/expand.png');
            button.collapsed = true;
        }
    }
};

Tine.Messenger.Util = {
    
    getJidFromConfig: function () {
        var domain = Tine.Messenger.registry.get('domain'),
            resource = Tine.Messenger.registry.get('resource'),
            name = Tine.Messenger.Util.getJabberName(Tine.Messenger.registry.get('format'));
        
        return name + '@' + domain + '/' + resource;
    },
    
    getJidFromConfigNoResource: function () {
        var domain = Tine.Messenger.registry.get('domain'),
            name = Tine.Messenger.Util.getJabberName(Tine.Messenger.registry.get('format')),
            jid = '';
            
        if (name != null)
            jid = name + '@' + domain;
            
        return jid;
    },
    
    getJabberName: function (format) {
        var name = '';
        
        switch (format) {
            case 'email':
                name = Tine.Messenger.Util.extractNameFromEmail(Tine.Tinebase.registry.get('userContact').email);
                break;
            case 'login':
                name = Tine.Tinebase.registry.get('userContact').account_id;
                break;
            default:
                name = Tine.Messenger.registry.get('preferences').map.name;
        }
        
        return name;
    },
    
    extractNameFromEmail: function (email) {
        return (email.indexOf('@') >= 0) ? email.substring(0, email.indexOf('@')) : email;
    },
    
    createJabberIDFromName: function () {
        var first_name = Tine.Tinebase.registry.get('userContact').n_given,
            last_name = Tine.Tinebase.registry.get('userContact').n_family;

        return first_name.toLowerCase() + '.' + last_name.toLowerCase();
    },

    jidToId: function (jid) {
        var atpos = jid.indexOf('@'),
            name = jid.substr(0, atpos),
            server = jid.substr(atpos);

        return name.replace(/\./g, "_") +
               server.replace(/@/g, "__").replace(/\./g, "-").replace(/\//g, "_");
    },

    idToJid: function (id) {
        var clean = (id.indexOf(MESSENGER_CHAT_ID_PREFIX) >= 0) ?
            id.substring(MESSENGER_CHAT_ID_PREFIX.length) :
            id;
        var seppos = clean.indexOf('__'),
            name = clean.substr(0, seppos),
            server = clean.substr(seppos);

        return name.replace(/_/g, ".") +
               server.replace(/__/g, "@").replace(/\-/g, ".").replace(/_/g, "/");
    },
    
    getStatusClass: function(status){
        
        var AVAILABLE_CLS = 'available',
            UNAVAILABLE_CLS = 'unavailable',
            AWAY_CLS = 'away',
            XA_CLS = 'xa',
            DONOTDISTURB_CLS = 'donotdisturb';
            
        switch(status){
            case IMConst.ST_AVAILABLE:
                return AVAILABLE_CLS;
                
            case IMConst.ST_UNAVAILABLE:
                return UNAVAILABLE_CLS;
                
            case IMConst.ST_AWAY:
                return AWAY_CLS;
                
            case IMConst.ST_XA:
                return XA_CLS;
                
            case IMConst.ST_DONOTDISTURB:
                return DONOTDISTURB_CLS;
                
            case 'ALL':
                return  AVAILABLE_CLS
                  +','+ UNAVAILABLE_CLS
                  +','+ AWAY_CLS
                  +','+ XA_CLS
                  +','+ DONOTDISTURB_CLS;
              
            default:
                return '';
        }
        return null;
    },
    
    getSubscriptionClass: function(subscription){
        
        var WAITING_CLS = 'waiting',
            SUBSCRIBE_CLS = 'subscribe',
            FROM_CLS = 'from',
            NONE_CLS = 'none',
            UNSUBSCRIBED_CLS = 'unsubscribed';
            
        switch(subscription){
            case IMConst.SB_WAITING:
                return WAITING_CLS;
                
            case IMConst.SB_SUBSCRIBE:
            case IMConst.SB_TO:
                return SUBSCRIBE_CLS;
                
            case IMConst.SB_FROM:
                return FROM_CLS;
                
            case IMConst.SB_NONE:
                return NONE_CLS;
                
            case IMConst.SB_UNSUBSCRIBED:
                return UNSUBSCRIBED_CLS;
                
            case 'ALL':
                return  WAITING_CLS
                  +','+ SUBSCRIBE_CLS
                  +','+ FROM_CLS
                  +','+ NONE_CLS
                  +','+ UNSUBSCRIBED_CLS;
              
            default:
                return '';
        }
        return null;
    },
    
    getStatusObject: function(_show){
        switch(_show){
            case 'away':
                return IMConst.ST_AWAY;
            case 'dnd':
                return IMConst.ST_DONOTDISTURB;
            case 'xa':
                return IMConst.ST_XA;
            case 'unavailable':
                return IMConst.ST_UNAVAILABLE;
            default:
                return IMConst.ST_AVAILABLE
        }
    },
    
    returnTimestamp: function(stamp){
        var TZ = 3;
        if(stamp){
            var t = stamp.match(/(\d{2})\:(\d{2})\:(\d{2})/);
            return t[1] - TZ + ":" + t[2] + ":" + t[3];
        }
        return (new Date()).toTimeString().match(/\d{2}\:\d{2}\:\d{2}/)[0];
    },
    
    insertAtCursor: function (myField, myValue) {
        myField = myField.el.dom;
        if (document.selection) {
            myField.focus();
            var sel = document.selection.createRange();
            sel.text = myValue;
        } else if (myField.selectionStart || myField.selectionStart == '0') {
            var startPos = myField.selectionStart;
            var endPos = myField.selectionEnd;
            myField.value = myField.value.substring(0, startPos)
                          + myValue
                          + myField.value.substring(endPos, myField.value.length);

        } else {
            myField.value += myValue;
        }
    },
    
    callbackWrapper: function (callback) {
        return function() {
            try {
                callback(arguments[0], arguments[1]);
            } catch (e){
                console.log('======== REAL ERROR: ' + (e.stack ? e.stack : e));
            }

            // Return true to keep calling the callback.
            return true;
        };
    }
};
