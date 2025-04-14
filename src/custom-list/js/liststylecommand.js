/**
 * @license Copyright (c) 2003-2021, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/**
 * @module list/liststylecommand
 */

import { Command } from 'ckeditor5/src/core';
import { getSiblingNodes } from './utils';

/**
 * The list style command. It is used by the {@link module:list/liststyle~ListStyle list style feature}.
 *
 * @extends module:core/command~Command
 */
export default class ListStyleCommand extends Command {
	/**
	 * Creates an instance of the command.
	 *
	 * @param {module:core/editor/editor~Editor} editor The editor instance.
	 * @param {String} defaultType The list type that will be used by default if the value was not specified during
	 * the command execution.
	 */
	constructor( editor, defaultType ) {
		super( editor );

		/**
		 * The default type of the list style.
		 *
		 * @protected
		 * @member {String}
		 */
		this._defaultType = defaultType;
	}

	/**
	 * @inheritDoc
	 */
	refresh() {
		this.value = this._getValue();
		this.isEnabled = this._checkEnabled();
	}

	/**
	 * Executes the command.
	 *
	 * @param {Object} options
	 * @param {String|null} options.type The type of the list style, e.g. `'disc'` or `'square'`. If `null` is specified, the default
	 * style will be applied.
	 * @protected
	 */
	execute( options = {} ) {
		const model = this.editor.model;
		const document = model.document;

		// For all selected blocks find all list items that are being selected
		// and update the `listStyle` attribute in those lists.
		let listItems = [ ...document.selection.getSelectedBlocks() ]
			.filter( element => element.is( 'element', 'listItem' ) )
			.map( element => {
				const position = model.change( writer => writer.createPositionAt( element, 0 ) );
				return [
					...getSiblingNodes( position, 'backward' ),
					...getSiblingNodes( position, 'forward' )
				];
			} )
			.flat();
        //葳橋 處理各階層連動一起變換項次符號
        const allListArr = listItems[0].parent._children._nodes;
        const currIndent = listItems[0]._attrs.get('listIndent');//目前階層
		const currGroup = listItems[0]._attrs.get('data-group');//目前流水號
		const currListType = listItems[0]._attrs.get('listType');//目前的type
        const filterArr = allListArr.filter((item) => {
			//回傳階層、群組流水號一樣的List
            return (
                item._attrs.get('listIndent') === currIndent &&
                item._attrs.get('data-group') === currGroup
            );
        });

		// Since `getSelectedBlocks()` can return items that belong to the same list, and
		// `getSiblingNodes()` returns the entire list, we need to remove duplicated items.
		listItems = [...new Set(filterArr)];
		if ( !listItems.length ) {
			return;
		}
        
		model.change( writer => {
			for ( const item of listItems ) {
				writer.setAttribute( 'listStyle', options.type || this._defaultType, item );
				//要考慮會點bullet然後又設定數字會壞掉，所以須設定此屬性
				writer.setAttribute('listType', currListType,item);
			}
		} );
	}

	/**
	 * Checks the command's {@link #value}.
	 *
	 * @private
	 * @returns {String|null} The current value.
	 */
	_getValue() {
		const listItem = this.editor.model.document.selection.getFirstPosition().parent;

		if ( listItem && listItem.is( 'element', 'listItem' ) ) {
			return listItem.getAttribute( 'listStyle' );
		}

		return null;
	}

	/**
	 * Checks whether the command can be enabled in the current context.
	 *
	 * @private
	 * @returns {Boolean} Whether the command should be enabled.
	 */
	_checkEnabled() {
		const editor = this.editor;

		const numberedList = editor.commands.get( 'numberedList' );
		const bulletedList = editor.commands.get( 'bulletedList' );

		return numberedList.isEnabled || bulletedList.isEnabled;
	}
}
