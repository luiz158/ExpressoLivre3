Ext.ns('Tine.Messenger');

Tine.Messenger.Chat = Ext.extend(Ext.Window, {
    
    constructor: function () {
        var app = Tine.Tinebase.appMgr.get('Messenger');
        Ext.apply(this, {
        iconCls:     'messenger-icon',
        cls:         'messenger-chat-window',
        width:       460,
        minWidth:    400,
        height:      378,
        minHeight:   378,
        closeAction: 'hide', //'close' - destroy the component
        collapsible: true,
        plain:       true,
        layout:      'border',
        tbar: {
            items:[
                {
                    xtype: 'button',
                    plugins: [new Ext.ux.file.BrowsePlugin({
                        //multiple: true
                    })],
                    itemId: 'messenger-chat-send',
                    icon: '/images/messenger/page_go.png',
                    tooltip: app.i18n._('Send file'),
                    handler: function(filebrowser) { // has second argument: EventObject (optional)
                        var window_chat = filebrowser.component.ownerCt.ownerCt,
                            id = window_chat.id.substr(MESSENGER_CHAT_ID_PREFIX.length),
                            jid = Tine.Messenger.Util.idToJid(id);

                        Tine.Messenger.FileTransfer.sendRequest(jid, filebrowser);
                    }
                },
                {
                    xtype: 'button',
                    itemId: 'messenger-chat-video',
                    icon: '/images/messenger/webcam.png',
                    tooltip: app.i18n._('Start video chat'),
                    hidden: true,
                    handler: function() {
						var window_chat = this.ownerCt.ownerCt,
						id = window_chat.id.substr(MESSENGER_CHAT_ID_PREFIX.length),
                        jid = Tine.Messenger.Util.idToJid(id);

						Tine.Messenger.VideoChat.startVideo(window_chat, id, jid);
                  
                    }
                 },
                 {
                    xtype: 'button',
                    itemId: 'messenger-chat-emoticons',
                    icon: '/images/messenger/emoticons/smile.png',
                    tooltip: app.i18n._('Choose a Emoticon'),
                    listeners: {
                        scope: this,
                        click: function() {
                            var emoticonWindow,
                                mainChatWindow = this,
                                emoticonsPath = '/images/messenger/emoticons',
                                check = [];
                                
                            if (Ext.getCmp('emoticon-window-choose')) {
                                emoticonWindow = Ext.getCmp('emoticon-window-choose');
                            } else {
                                emoticonWindow = new Ext.Window({
                                    id: 'emoticon-window-choose',
                                    autoScroll: true,
                                    closeAction: 'hide',
                                    layout: {
                                        type: 'table',
                                        columns: 10
                                    },
                                    margins: {
                                        top: 5,
                                        left: 5
                                    },
                                    height: 175,
                                    width: 290,
                                    title: app.i18n._('Choose a Emoticon')
                                });

                                Ext.each(EMOTICON.emoticons, function (item, index) {
                                    if (check.indexOf(EMOTICON.translates[index]) < 0) {
                                        check.push(EMOTICON.translates[index]);
                                        emoticonWindow.add({
                                            xtype: 'button',
                                            icon: emoticonsPath + '/' + EMOTICON.translates[index] + '.png',
                                            cls: 'emoticon-button',
                                            tooltip: EMOTICON.translates[index].toUpperCase(),
                                            emoticon: item,
                                            handler: function () {
                                                var textfield = mainChatWindow.getComponent('messenger-chat-textchat').getComponent(1).getComponent(0);
                                                textfield.insertAtCursor('<img src="' + this.icon + '" />');
                                                emoticonWindow.close();
                                            }
                                        });
                                    }
                                });
                            }
                            
                            emoticonWindow.show();
                        }
                    }
                 },
                 {
                     xtype: 'button',
                     itemId: 'messenger-history',
                     icon: '/images/messenger/folder.png',
                     tooltip: app.i18n._('Contact Chat History'),
                     listeners: {
                         scope: this,
                         click: function (button) {
                             var mainChatWindow = this,
                                 id = mainChatWindow.id.substr(MESSENGER_CHAT_ID_PREFIX.length),
                                 contact_jid = Tine.Messenger.Util.idToJid(id),
                                 jid = Strophe.getBareJidFromJid(Tine.Tinebase.appMgr.get('Messenger').getConnection().jid);
                                 
                             var history_window = new Tine.Messenger.HistoryWindow({
                                 jid: jid,
                                 contact: contact_jid
                             });
                             
                             history_window.show();
                         }
                     }
                 }
            ]
        },
        listeners: {
            beforerender: function(_box){
                Tine.Messenger.AddItems(_box);
            },
            resize: function(_box, _width, _height){
                Tine.Messenger.ChatHandler.adjustChatAreaHeight(_box.id, _width, _height);
            },
            show: function () {
                this.setTextfieldFocus();
            },
            activate: function () {
                this.setTextfieldFocus();
            },
            expand: function () {
                this.setTextfieldFocus();
            },
            move: function(_box){
                Tine.Messenger.Window._onMoveWindowAction(_box);
            },
	    beforehide: function(_box){
		// only if the chat being closed is the one using videochat
		if(Tine.Messenger.VideoChat.jid != null && Tine.Messenger.VideoChat.getChatWindow(Tine.Messenger.VideoChat.jid).id == _box.id){
		    Tine.Messenger.VideoChat.hangup(_box);
		}
	    },
	    beforecollapse: function(_box){
		if(Tine.Messenger.VideoChat.state != VideoChatStates.IDLE){
		    return false;
		}
	    }
        }
  });
        Tine.Messenger.Chat.superclass.constructor.apply(this, arguments);
    },
    
    setTextfieldFocus: function () {
        this.getComponent('messenger-chat-textchat').getComponent(1).getComponent(0).focus(false, 200); // foco no textfield
    }
    
});