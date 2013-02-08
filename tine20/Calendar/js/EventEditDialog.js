/*
 * Tine 2.0
 * 
 * @package     Calendar
 * @license     http://www.gnu.org/licenses/agpl.html AGPL Version 3
 * @author      Cornelius Weiss <c.weiss@metaways.de>
 * @copyright   Copyright (c) 2009-2012 Metaways Infosystems GmbH (http://www.metaways.de)
 *
 */
 
Ext.ns('Tine.Calendar');

/**
 * @namespace Tine.Calendar
 * @class Tine.Calendar.EventEditDialog
 * @extends Tine.widgets.dialog.EditDialog
 * Calendar Edit Dialog <br>
 * 
 * @author      Cornelius Weiss <c.weiss@metaways.de>
 */
Tine.Calendar.EventEditDialog = Ext.extend(Tine.widgets.dialog.EditDialog, {
    /**
     * @cfg {Number} containerId initial container id
     */
    containerId: -1,
    
    labelAlign: 'side',
    windowNamePrefix: 'EventEditWindow_',
    appName: 'Calendar',
    recordClass: Tine.Calendar.Model.Event,
    recordProxy: Tine.Calendar.backend,
    showContainerSelector: false,
    tbarItems: [{xtype: 'widget-activitiesaddbutton'}],
    
    mode: 'local',
    
    // note: we need up use new action updater here or generally in the widget!
    evalGrants: false,
    
    onResize: function() {
        Tine.Calendar.EventEditDialog.superclass.onResize.apply(this, arguments);
        this.setTabHeight.defer(100, this);
    },
    
     /**
     * @private
     */
    onSaveAndClose: function(button, event){
        this.onApplyChanges(button, event, true);
        this.fireEvent('saveAndClose');
    },
     /**
     * generic apply changes handler
     */
    onApplyChanges: function(button, event, closeWindow) {
        // we need to sync record before validating to let (sub) panels have 
        // current data of other panels
        this.onRecordUpdate();
        if(this.isValid()) {
            this.loadMask.show();
            if (this.mode !== 'local') {
                this.fireEvent('save');
                this.recordProxy.saveRecord(this.record, {
                    scope: this,
                    success: function(record) {
                        // override record with returned data
                        this.record = record;
                        
                        if (! (closeWindow && typeof this.window.cascade == 'function')) {
                            // update form with this new data
                            // NOTE: We update the form also when window should be closed,
                            //       cause sometimes security restrictions might prevent
                            //       closing of native windows
                            this.onRecordLoad();
                        }
                        this.fireEvent('update', Ext.util.JSON.encode(this.record.data), this.mode);
                        
                        // free 0 namespace if record got created
                        this.window.rename(this.windowNamePrefix + this.record.id);
                        
                        if (closeWindow) {
                            this.purgeListeners();
                            this.window.close();
                        }
                    },
                    failure: this.onRequestFailed,
                    timeout: 300000 // 5 minutes
                }, {
                    duplicateCheck: this.doDuplicateCheck
                });
            } else {
                this.onRecordLoad();
                this.fireEvent('update', Ext.util.JSON.encode(this.record.data), this.mode);
                
                // free 0 namespace if record got created
                this.window.rename(this.windowNamePrefix + this.record.id);
                        
                if (closeWindow) {
                    this.purgeListeners();
                    this.window.close();
                }
            }
        } else {
            Ext.MessageBox.alert(_('Errors'), this.getValidationErrorMessage());
        }
    },   
/**
     * init attachment grid + add button to toolbar
     */
    initAttachmentGrid: function() {
        if (! this.attachmentGrid) {
        
            this.attachmentGrid = new Tine.widgets.grid.FileUploadGrid({
                fieldLabel: this.app.i18n._('Attachments'),
                hideLabel: true,
                filesProperty: 'attachments',
                anchor: '100% 95%'
            });
        }
    },

    /**
     * returns dialog
     * 
     * NOTE: when this method gets called, all initalisation is done.
     * @return {Object} components this.itmes definition
     */
    getFormItems: function() { 
        this.initAttachmentGrid();
        return {
            xtype: 'tabpanel',
            border: false,
            plugins: [{
                ptype : 'ux.tabpanelkeyplugin'
            }],
            plain:true,
            activeTab: 0,
            border: false,
            items:[{
                title: this.app.i18n.n_('Event', 'Events', 1),
                border: false,
                frame: true,
                layout: 'border',
                items: [{
                    region: 'center',
                    layout: 'hfit',
                    border: false,
                    items: [{
                        layout: 'hbox',
                        items: [{
                            margins: '5',
                            width: 100,
                            xtype: 'label',
                            text: this.app.i18n._('Summary')
                        }, {
                            flex: 1,
                            xtype:'textfield',
                            name: 'summary',
                            listeners: {render: function(field){field.focus(false, 250);}},
                            allowBlank: false,
                            requiredGrant: 'editGrant',
                            maxLength: 255
                        }]
                    }, {
                        layout: 'hbox',
                        items: [{
                            margins: '5',
                            width: 100,
                            xtype: 'label',
                            text: this.app.i18n._('View')
                        }, Ext.apply(this.perspectiveCombo, {
                            flex: 1
                        })]
                    }, {
                        layout: 'hbox',
                        height: 115,
                        layoutConfig: {
                            align : 'stretch',
                            pack  : 'start'
                        },
                        items: [{
                            flex: 1,
                            xtype: 'fieldset',
                            layout: 'hfit',
                            margins: '0 5 0 0',
                            title: this.app.i18n._('Details'),
                            items: [{
                                xtype: 'columnform',
                                labelAlign: 'side',
                                labelWidth: 100,
                                formDefaults: {
                                    xtype:'textfield',
                                    anchor: '100%',
                                    labelSeparator: '',
                                    columnWidth: .7
                                },
                                items: [[{
                                    columnWidth: 1,
                                    fieldLabel: this.app.i18n._('Location'),
                                    name: 'location',
                                    requiredGrant: 'editGrant',
                                    maxLength: 255
                                }], [{
                                    xtype: 'datetimefield',
                                    fieldLabel: this.app.i18n._('Start Time'),
                                    listeners: {scope: this, change: this.onDtStartChange},
                                    name: 'dtstart',
                                    requiredGrant: 'editGrant'
                                }, {
                                    columnWidth: .19,
                                    xtype: 'checkbox',
                                    hideLabel: true,
                                    boxLabel: this.app.i18n._('whole day'),
                                    listeners: {scope: this, check: this.onAllDayChange},
                                    name: 'is_all_day_event',
                                    requiredGrant: 'editGrant'
                                }], [{
                                    xtype: 'datetimefield',
                                    fieldLabel: this.app.i18n._('End Time'),
                                    listeners: {scope: this, change: this.onDtEndChange},
                                    name: 'dtend',
                                    requiredGrant: 'editGrant'
                                }, {
                                    columnWidth: .3,
                                    xtype: 'combo',
                                    hideLabel: true,
                                    readOnly: true,
                                    hideTrigger: true,
                                    disabled: true,
                                    name: 'originator_tz',
                                    requiredGrant: 'editGrant'
                                }], [ this.containerSelectCombo = new Tine.widgets.container.selectionComboBox({
                                    columnWidth: 1,
                                    id: this.app.appName + 'EditDialogContainerSelector' + Ext.id(),
                                    fieldLabel: _('Saved in'),
                                    ref: '../../../../../../../../containerSelect',
                                    //width: 300,
                                    //listWidth: 300,
                                    name: this.recordClass.getMeta('containerProperty'),
                                    recordClass: this.recordClass,
                                    containerName: this.app.i18n.n_hidden(this.recordClass.getMeta('containerName'), this.recordClass.getMeta('containersName'), 1),
                                    containersName: this.app.i18n._hidden(this.recordClass.getMeta('containersName')),
                                    appName: this.app.appName,
                                    requiredGrants: this.record.data.id ? ['editGrant'] : ['addGrant'],
                                    disabled: true
                                })]]
                            }]
                        }, {
                            width: 130,
                            xtype: 'fieldset',
                            title: this.app.i18n._('Status'),
                            items: [{
                                xtype: 'checkbox',
                                hideLabel: true,
                                boxLabel: this.app.i18n._('non-blocking'),
                                name: 'transp',
                                requiredGrant: 'editGrant',
                                getValue: function() {
                                    var bool = Ext.form.Checkbox.prototype.getValue.call(this);
                                    return bool ? 'TRANSPARENT' : 'OPAQUE';
                                },
                                setValue: function(value) {
                                    var bool = (value == 'TRANSPARENT' || value === true);
                                    return Ext.form.Checkbox.prototype.setValue.call(this, bool);
                                }
                            }, Ext.apply(this.perspectiveCombo.getAttendeeTranspField(), {
                                hideLabel: true
                            }), {
                                xtype: 'checkbox',
                                hideLabel: true,
                                boxLabel: this.app.i18n._('Tentative'),
                                name: 'status',
                                requiredGrant: 'editGrant',
                                getValue: function() {
                                    var bool = Ext.form.Checkbox.prototype.getValue.call(this);
                                    return bool ? 'TENTATIVE' : 'CONFIRMED';
                                },
                                setValue: function(value) {
                                    var bool = (value == 'TENTATIVE' || value === true);
                                    return Ext.form.Checkbox.prototype.setValue.call(this, bool);
                                }
                            }, {
                                xtype: 'checkbox',
                                hideLabel: true,
                                boxLabel: this.app.i18n._('Private'),
                                name: 'class',
                                requiredGrant: 'editGrant',
                                getValue: function() {
                                    var bool = Ext.form.Checkbox.prototype.getValue.call(this);
                                    return bool ? 'PRIVATE' : 'PUBLIC';
                                },
                                setValue: function(value) {
                                    var bool = (value == 'PRIVATE' || value === true);
                                    return Ext.form.Checkbox.prototype.setValue.call(this, bool);
                                }
                            }, Ext.apply(this.perspectiveCombo.getAttendeeStatusField(), {
                                width: 115,
                                hideLabel: true
                            })]
                        }]
                    }, {
                        xtype: 'tabpanel',
                        deferredRender: false,
                        activeTab: 0,
                        border: false,
                        height: 235,
                        form: true,
                        items: [
                            this.attendeeGridPanel,
                            this.rrulePanel,
                            this.alarmPanel
                        ]
                    }]
                }, {
                    // activities and tags
                    region: 'east',
                    layout: 'accordion',
                    animate: true,
                    width: 200,
                    split: true,
                    collapsible: true,
                    collapseMode: 'mini',
                    header: false,
                    margins: '0 5 0 5',
                    border: true,
                    items: [
                        new Ext.Panel({
                            // @todo generalise!
                            title: this.app.i18n._('Description'),
                            iconCls: 'descriptionIcon',
                            layout: 'form',
                            labelAlign: 'top',
                            border: false,
                            items: [{
                                style: 'margin-top: -4px; border 0px;',
                                labelSeparator: '',
                                xtype:'textarea',
                                name: 'description',
                                hideLabel: true,
                                grow: false,
                                preventScrollbars:false,
                                anchor:'100% 100%',
                                emptyText: this.app.i18n._('Enter description'),
                                requiredGrant: 'editGrant'                           
                            }]
                        }),
                        new Tine.widgets.activities.ActivitiesPanel({
                            app: 'Calendar',
                            showAddNoteForm: false,
                            border: false,
                            bodyStyle: 'border:1px solid #B5B8C8;'
                        }),
                        new Tine.widgets.tags.TagPanel({
                            app: 'Calendar',
                            border: false,
                            bodyStyle: 'border:1px solid #B5B8C8;'
                        })
                    ]
                },{
                    // activities and tags
                    region: 'south',
                    layout: 'form',
                    height: 100,
                    split: true,
                    header: false,
                    //collapsed: (this.record.bodyIsFetched() && (! this.record.get('attachments') || this.record.get('attachments').length == 0)),
                    items: [this.attachmentGrid]
                }]
            }, new Tine.widgets.activities.ActivitiesTabPanel({
                    app: this.appName,
                    record_id: (this.record) ? this.record.id : '',
                    record_model: this.appName + '_Model_' + this.recordClass.getMeta('modelName')
            })]
        };
    },
    
    initComponent: function() {
        var organizerCombo;
        this.attendeeGridPanel = new Tine.Calendar.AttendeeGridPanel({
            bbar: [{
                xtype: 'label',
                html: Tine.Tinebase.appMgr.get('Calendar').i18n._('Organizer') + "&nbsp;"
            }, organizerCombo = Tine.widgets.form.RecordPickerManager.get('Addressbook', 'Contact', {
                width: 300,
                name: 'organizer',
                userOnly: true,
                getValue: function() {
                    var id = Tine.Addressbook.SearchCombo.prototype.getValue.apply(this, arguments),
                        record = this.store.getById(id);
                        
                    return record ? record.data : id;
                }
            })]
        });
        
        // auto location
        this.attendeeGridPanel.on('afteredit', function(o) {
            if (o.field == 'user_id'
                && o.record.get('user_type') == 'resource'
                && o.record.get('user_id')
                && o.record.get('user_id').is_location
            ) {
                this.getForm().findField('location').setValue(
                    this.attendeeGridPanel.renderAttenderResourceName(o.record.get('user_id'))
                );
            }
        }, this);
        
        this.on('render', function() {this.getForm().add(organizerCombo);}, this);
        
        this.rrulePanel = new Tine.Calendar.RrulePanel({});
        this.alarmPanel = new Tine.widgets.dialog.AlarmPanel({});
        this.attendeeStore = this.attendeeGridPanel.getStore();
        
        // a combo with all attendee + origin/organizer
        this.perspectiveCombo = new Tine.Calendar.PerspectiveCombo({
            editDialog: this
        });
        
        Tine.Calendar.EventEditDialog.superclass.initComponent.call(this);
    },

    /**
     * checks if form data is valid
     * 
     * @return {Boolean}
     */
    isValid: function() {
        var isValid = this.validateDtStart() && this.validateDtEnd();
        
        if (! this.rrulePanel.isValid()) {
            isValid = false;
            
            this.rrulePanel.ownerCt.setActiveTab(this.rrulePanel);
        }

        if (this.attachmentGrid.isUploading()) {
            result = false;
            this.validationErrorMessage = this.app.i18n._('Files are still uploading.');
        }
        
        return isValid && Tine.Calendar.EventEditDialog.superclass.isValid.apply(this, arguments);
    },
     
    onAllDayChange: function(checkbox, isChecked) {
        var dtStartField = this.getForm().findField('dtstart');
        var dtEndField = this.getForm().findField('dtend');
        dtStartField.setDisabled(isChecked, 'time');
        dtEndField.setDisabled(isChecked, 'time');
        
        if (isChecked) {
            dtStartField.clearTime();
            var dtend = dtEndField.getValue();
            if (Ext.isDate(dtend) && dtend.format('H:i:s') != '23:59:59') {
                dtEndField.setValue(dtend.clearTime(true).add(Date.HOUR, 24).add(Date.SECOND, -1));
            }
            
        } else {
            dtStartField.undo();
            dtEndField.undo();
        }
    },
    
    onDtEndChange: function(dtEndField, newValue, oldValue) {
        this.validateDtEnd();
    },
    
    onDtStartChange: function(dtStartField, newValue, oldValue) {
        if (Ext.isDate(newValue) && Ext.isDate(oldValue)) {
            var diff = newValue.getTime() - oldValue.getTime();
            var dtEndField = this.getForm().findField('dtend');
            var dtEnd = dtEndField.getValue();
            if (Ext.isDate(dtEnd)) {
                dtEndField.setValue(dtEnd.add(Date.MILLI, diff));
            }
        }
    },
    
    /**
     * copy record
     * 
     * TODO change attender status?
     */
    doCopyRecord: function() {
        Tine.Calendar.EventEditDialog.superclass.doCopyRecord.call(this);
        
        // remove attender ids
        Ext.each(this.record.data.attendee, function(attender) {
            delete attender.id;
        }, this);
        
        // Calendar is the only app with record based grants -> user gets edit grant for all fields when copying
        this.record.set('editGrant', true);
        
        Tine.log.debug('Tine.Calendar.EventEditDialog::doCopyRecord() -> record:');
        Tine.log.debug(this.record);
    },
    
    /**
     * handles attendee
     */
    handleRelations: function() {
        if(this.record.data.hasOwnProperty('relations')) {
            var addAttendee = [],
                addRelationConfig = {};
                
            Ext.each(this.plugins, function(plugin) {
                if(plugin.ptype == 'addrelations_edit_dialog') {
                    addRelationConfig = plugin.relationConfig;
                }
            }, this);

            Ext.each(this.record.data.relations, function(relation) {
                var add = true;
                Ext.each(this.record.data.attendee, function(attender) {
                    if(attender.user_id.id == relation.related_record.id) {
                        add = false;
                        return false;
                    }
                }, this);
                
                if(add) {
                    var att = new Tine.Calendar.Model.Attender(Ext.apply(Tine.Calendar.Model.Attender.getDefaultData(), addRelationConfig), 'new-' + Ext.id());
                    att.set('user_id', relation.related_record);
                    var attIsCurrentUser = (relation.related_record.account_id == Tine.Tinebase.registry.get('currentAccount').accountId);
                    if (!relation.related_record.account_id || attIsCurrentUser) {
                        att.set('status_authkey', 1);
                        if(attIsCurrentUser) {
                            att.set('status', 'ACCEPTED');
                        }
                    }
                    addAttendee.push(att.data);
                }
            }, this);
            var att = this.record.get('id') ? this.record.data.attendee.concat(addAttendee) : addAttendee;
            this.record.set('attendee', att);
            delete this.record.data.relations;
        }
    },
    
    /**
     * is called after all subpanels have been loaded
     */
    onAfterRecordLoad: function() {
        this.handleRelations();
        Tine.Calendar.EventEditDialog.superclass.onAfterRecordLoad.call(this);
        
        this.attendeeGridPanel.onRecordLoad(this.record);
        this.rrulePanel.onRecordLoad(this.record);
        this.alarmPanel.onRecordLoad(this.record);
        
        // apply grants
        if (! this.record.get('editGrant')) {
            this.getForm().items.each(function(f){
                if(f.isFormField && f.requiredGrant !== undefined){
                    f.setDisabled(! this.record.get(f.requiredGrant));
                }
            }, this);
        }
        
        this.perspectiveCombo.loadPerspective();
        // disable container selection combo if user has no right to edit
        this.containerSelect.setDisabled.defer(20, this.containerSelect, [(! this.record.get('editGrant'))]);
    },
    
    onRecordUpdate: function() {
        this.record.data.attachments = [];
        this.attachmentGrid.store.each(function(attachment) {
            this.record.data.attachments.push(Ext.ux.file.Upload.file.getFileData(attachment));
        }, this)
        Tine.Calendar.EventEditDialog.superclass.onRecordUpdate.apply(this, arguments);
        this.attendeeGridPanel.onRecordUpdate(this.record);
        this.rrulePanel.onRecordUpdate(this.record);
        this.alarmPanel.onRecordUpdate(this.record);
        this.perspectiveCombo.updatePerspective();
    },

    setTabHeight: function() {
        var eventTab = this.items.first().items.first();
        var centerPanel = eventTab.items.first();
        var tabPanel = centerPanel.items.last();
        tabPanel.setHeight(centerPanel.getEl().getBottom() - tabPanel.getEl().getTop());
    },
    
    validateDtEnd: function() {
        var dtStart = this.getForm().findField('dtstart').getValue();
        
        var dtEndField = this.getForm().findField('dtend');
        var dtEnd = dtEndField.getValue();
        
        if (! Ext.isDate(dtEnd)) {
            dtEndField.markInvalid(this.app.i18n._('End date is not valid'));
            return false;
        } else if (Ext.isDate(dtStart) && dtEnd.getTime() - dtStart.getTime() <= 0) {
            dtEndField.markInvalid(this.app.i18n._('End date must be after start date'));
            return false;
        } else {
            dtEndField.clearInvalid();
            return true;
        }
    },
    
    validateDtStart: function() {
        var dtStartField = this.getForm().findField('dtstart');
        var dtStart = dtStartField.getValue();
        
        if (! Ext.isDate(dtStart)) {
            dtStartField.markInvalid(this.app.i18n._('Start date is not valid'));
            return false;
        } else {
            dtStartField.clearInvalid();
            return true;
        }
        
    },
    
    /**
     * is called from onApplyChanges
     * @param {Boolean} closeWindow
     */
    doApplyChanges: function(closeWindow) {
        this.onRecordUpdate();
        if(this.isValid()) {
            this.fireEvent('update', Ext.util.JSON.encode(this.record.data));
            this.onAfterApplyChanges(closeWindow);
        } else {
            this.loadMask.hide();
            Ext.MessageBox.alert(_('Errors'), this.getValidationErrorMessage());
        }
    }
});

/**
 * Opens a new event edit dialog window
 * 
 * @return {Ext.ux.Window}
 */
Tine.Calendar.EventEditDialog.openWindow = function (config) {
    // record is JSON encoded here...
    var id = config.recordId ? config.recordId : 0;
    var window = Tine.WindowFactory.getWindow({
        width: 800,
        height: 600,
        name: Tine.Calendar.EventEditDialog.prototype.windowNamePrefix + id,
        contentPanelConstructor: 'Tine.Calendar.EventEditDialog',
        contentPanelConstructorConfig: config
    });
    return window;
};
