Ext.ns('Tine.Messenger');

Tine.Messenger.HtmlEditor = Ext.extend(Ext.form.HtmlEditor, {
    frame : true,
    height: 80,
    boxMinHeight: 50,
    autoScroll: true,
    enableSourceEdit: false,
    enableLinks: false,
    enableColors: false,
    enableAlignments: false,
    enableLists: false,
    enableFontSize: false,
    initComponent : function() {
        Tine.Messenger.HtmlEditor.superclass.initComponent.call(this);
        this.addEvents('submit');
    },
    initEditor : function(editor) {
        Tine.Messenger.HtmlEditor.superclass.initEditor.call(this);
        
        if (Ext.isGecko) {
            Ext.EventManager.on(this.iframe.contentWindow.document.body, 'keypress', this.keyPress, this);
        }
        if (Ext.isIE || Ext.isWebKit || Ext.isOpera) {
            Ext.EventManager.on(this.iframe.contentWindow.document.body, 'keydown', this.keyPress, this);
        }
        
        var i18n = Tine.Tinebase.appMgr.get('Messenger').i18n,
            title = '<b>' + i18n._('Send Message') + ' (Ctrl+ENTER)</b><br/>' + i18n._('Sends the formated message below') + '.';
        this.getToolbar().addButton([
            {
                xtype: 'tbseparator'
            },
            {
                icon: '/images/messenger/send-message.png',
                scope: this,
                overflowText: i18n._('Send Message'),
                tooltip: title,
                handler: function (cmp, e) {
                    var chat_id = this.ownerCt.ownerCt.ownerCt.id,
                        type = this.ownerCt.ownerCt.ownerCt.type,
                        private_chat = this.ownerCt.ownerCt.ownerCt.privy,
                        old_id = this.ownerCt.ownerCt.ownerCt.initialConfig.id,
                        message = this.getValue();
                    
                    this.sendMessage(chat_id, type, private_chat, old_id, message, e);
                }
            }
        ]);
        this.getToolbar().doLayout();
        
        this.focus();
        Tine.Messenger.Chat.alreadySentComposing = false;
    },
    getValue: function () {
        var value = this.superclass().getValue.call(this);
        
        value = value.replace(/<div.*?>(.+?)<\/div>/g, '<br>$1')
                     .replace(/<b>(.+)<\/b>/g, '<strong>$1</strong>')
                     .replace(/<i>(.+)<\/i>/g, '<em>$1</em>')
                     .replace(/<u>(.+)<\/u>/g, '<span style="text-decoration: underline;">$1</span>')
                     .replace(/<font (face="(.+?)")+>(.+?)<\/font>/g, '<span style="font-family: $2;">$3</span>')
                     .replace(/<br>$/, '');

        return value;
    },
    keyPress: function(e) {
        var chat_id = this.ownerCt.ownerCt.ownerCt.id,
            type = this.ownerCt.ownerCt.ownerCt.type,
            private_chat = this.ownerCt.ownerCt.ownerCt.privy,
            old_id = this.ownerCt.ownerCt.ownerCt.initialConfig.id,
            message = this.getValue();
        
        if (e.ctrlKey && e.getKey() == Ext.EventObject.ENTER && !this.isVoidMessage()) {
            this.sendMessage(chat_id, type, private_chat, old_id, message, e);
        } else {
            this.sendChatStatus(type, chat_id);
        }
    },
    sendChatStatus: function (type, id) {
        // Envia apenas na primeira quando começa a digitar
        if(type == 'chat' && !Tine.Messenger.Chat.alreadySentComposing) {
            Tine.Messenger.ChatHandler.sendState(id, 'composing');
            Tine.Messenger.Chat.alreadySentComposing = true;
        }
        if(type == 'groupchat' && !Tine.Messenger.Chat.alreadySentComposing) {
            try {
                Tine.Messenger.Groupie.sendState(id, 'composing');
            } catch(err) {
                Tine.Messenger.Log.error(err);
            }
            Tine.Messenger.Chat.alreadySentComposing = true;
        }
        // Verifica se parou de digitar
        if (Tine.Messenger.Chat.checkPauseInterval)
            window.clearTimeout(Tine.Messenger.Chat.checkPauseInterval);
        Tine.Messenger.Chat.checkPauseInterval = window.setTimeout(function () {
            Tine.Messenger.ChatHandler.sendState(id, 'paused');
            Tine.Messenger.Chat.alreadySentComposing = false;
        }, 2000);
    },
    sendMessage: function (chat_id, type, private_chat, old_id, message, ev) {
        if (!this.voidMessage(message)) {
            if(type == 'chat' || private_chat) {
                window.clearTimeout(Tine.Messenger.Chat.checkPauseInterval);
                Tine.Messenger.Chat.checkPauseInterval = null;
                Tine.Messenger.Chat.alreadySentComposing = false;
                if(type == 'chat')
                    Tine.Messenger.ChatHandler.sendMessage(message, chat_id);
                if(type == 'groupchat')
                    Tine.Messenger.Groupie.sendPrivMessage(message, chat_id, old_id);
            } else {
                this.sendMUCMessage(private_chat, chat_id, message);
            }
        }
        
        this.setValue("");
    },
    sendMUCMessage: function (private_chat, chat_id, message) {
        if(private_chat)
            Tine.Messenger.Groupie.sendPrivMessage(message, chat_id);
        else
            Tine.Messenger.Groupie.sendPublMessage(message, chat_id);
    },
    isVoidMessage: function () {
        return this.getValue() == '' || this.getValue() == '<br>' || this.getValue() == '<br/>';
    },
    voidMessage: function (message) {
        return message == '' || message == '<br>' || message == null;
    }
});

Ext.reg('imhtmleditor', Tine.Messenger.HtmlEditor);