Ext.ns("Ext.ux.plugins");

Ext.ux.plugins.HtmlEditorResizer = function(config) {
	Ext.apply(this, config);
};

/**
 * Ugly hack to get the iframe to show up in the right spot
 * by resizing the toolbar div on the editor.
 * @param {Object} editor
 */
Ext.ux.plugins.HtmlEditorResizer.fixHeightGarbage = function(editor) {
	if (Ext.isIE) return;
	h = Ext.get(editor.id);
	h.prev('.x-html-editor-tb').setHeight(editor.tb.getHeight());	
};

/**
 * @author Mitchel Humpherys
 * @class Ext.ux.plugins.HtmlEditorResizer <b>This is a plugin</b> for the htmleditor to
 * add a resizing handle.<br/><br/>
 * Example usage: <br/>
 * <pre>
 * new Ext.form.HtmlEditor({
 * &nbsp;&nbsp;renderTo: Ext.getBody()
 * &nbsp;&nbsp;,width: 420
 * &nbsp;&nbsp;,height: 200
 * &nbsp;&nbsp;,plugins: [new Ext.ux.HtmlEditorResizer()] //provides resizing on htmleditor
 * });
 * </pre>
 * You can also pass in an object with a resizeCfg property which will be applied
 * to the Ext.Resizable created on the htmleditor:
 * <pre>
 * new Ext.ux.plugins.HtmlEditorResizer({resizeCfg: {pinned: false}})
 * </pre>
 * @extends Ext.util.Observable
 * @stable
 */
Ext.extend(Ext.ux.plugins.HtmlEditorResizer, Ext.util.Observable, {
	init: function(cmp) {
		this.resizeCfg = this.resizeCfg || {};
		Ext.applyIf(this.resizeCfg, {
 			resizeChild: true
 			,minHeight: 100
 			,minWidth: 100
 			,pinned: true
 			,handles: 'se'
 		});
 		Ext.apply(this.resizeCfg, {
 			listeners: {
 				'resize': {
 					fn: function(resz, width, height, evt) {
 						this.setSize(width, height);
 						Ext.ux.plugins.HtmlEditorResizer.fixHeightGarbage(this);
 					}
 					,scope: cmp //the htmleditor
 				}
 			}
 			,wrap: Ext.isIE
 		});

 		this.activateHandler = function(editor, cfg) {
 			var applyToMe = (Ext.isIE) ? editor.iframe : Ext.get(editor.id).up('.x-html-editor-wrap');
 			var resizer = new Ext.Resizable(applyToMe, cfg); //end resizer
 			Ext.ux.plugins.HtmlEditorResizer.fixHeightGarbage(editor);
 		};

 		cmp.on('activate', this.activateHandler.createDelegate(this, [cmp, this.resizeCfg]), this, {single: true});
	} //end init
}); //end extend
