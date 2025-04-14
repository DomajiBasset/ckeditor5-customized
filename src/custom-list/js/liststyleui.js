/**
 * @license Copyright (c) 2003-2021, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/**
 * @module list/liststyleui
 */

import { Plugin } from 'ckeditor5/src/core';
import { ButtonView, SplitButtonView, createDropdown, addToolbarToDropdown } from 'ckeditor5/src/ui';

import bulletedListIcon from '../theme/icons/bulletedlist.svg';
import numberedListIcon from '../theme/icons/numberedlist.svg';

import listStyleDiscIcon from '../theme/icons/liststyledisc.svg';
import listStyleCircleIcon from '../theme/icons/liststylecircle.svg';
import listStyleSquareIcon from '../theme/icons/liststylesquare.svg';
import listStyleDecimalIcon from '../theme/icons/liststyledecimal.svg';
import listStyleDecimalWithLeadingZeroIcon from '../theme/icons/liststyledecimalleadingzero.svg';
import listStyleLowerRomanIcon from '../theme/icons/liststylelowerroman.svg';
import listStyleUpperRomanIcon from '../theme/icons/liststyleupperroman.svg';
import listStyleLowerLatinIcon from '../theme/icons/liststylelowerlatin.svg';
import listStyleUpperLatinIcon from '../theme/icons/liststyleupperlatin.svg';

import '../theme/liststyles.css';

import { chinesFormatObj } from './chinesFormatData.js';

/**
 * The list style UI plugin. It introduces the extended `'bulletedList'` and `'numberedList'` toolbar
 * buttons that allow users to change styles of individual lists in the content.
 *
 * **Note**: Buttons introduced by this plugin override implementations from the {@link module:list/listui~ListUI}
 * (because they share the same names).
 *
 * @extends module:core/plugin~Plugin
 */
export default class ListStyleUI extends Plugin {
	/**
	 * @inheritDoc
	 */
	static get pluginName() {
		return 'ListStyleUI';
	}

	init() {
		const editor = this.editor;
		const t = editor.locale.t;		

		editor.ui.componentFactory.add( 'bulletedList', getSplitButtonCreator( {
			editor,
			parentCommandName: 'bulletedList',
			buttonLabel: t( 'Bulleted List' ),
			buttonIcon: bulletedListIcon,
			toolbarAriaLabel: t( 'Bulleted list styles toolbar' ),
			styleDefinitions: [
				{
					label: t( 'Toggle the disc list style' ),
					tooltip: t( 'Disc' ),
					type: 'disc',
					icon: listStyleDiscIcon
				},
				{
					label: t( 'Toggle the circle list style' ),
					tooltip: t( 'Circle' ),
					type: 'circle',
					icon: listStyleCircleIcon
				},
				{
					label: t( 'Toggle the square list style' ),
					tooltip: t( 'Square' ),
					type: 'square',
					icon: listStyleSquareIcon
				}
			]
		} ) );
		//葳橋:塞入客製化中文樣式按鈕
		editor.ui.componentFactory.add(
            'numberedList',
            getSplitButtonCreator({
                editor,
                parentCommandName: 'numberedList',
                buttonLabel: t('Numbered List'),
                buttonIcon: numberedListIcon,
                toolbarAriaLabel: t('Numbered list styles toolbar'),
                styleDefinitions: createMyDropdownData(chinesFormatObj, t),
            })
        );
	}
}
function createMyDropdownData(chinesFormatObj, t) {
    const tmpArr = [];
    for (let key of Object.keys(chinesFormatObj)) {
        const tmpFormatArr = chinesFormatObj[key].attr.map((item, index) => {
			const reqSvgs = require.context(
				`../theme/icons/format-icon/`,
				true,
				/\.svg$/
			);
			const paths = reqSvgs.keys();

			const svgs = paths.filter((path) => {
				if (path.indexOf(`${key}-${index}`)!==-1){
					return path; 
				}
			});
			const targetSvg = reqSvgs(svgs[0]);
            const tmpObj = {
                label: t(chinesFormatObj[key].data[0]),
                tooltip: t(item.replace(/T/, chinesFormatObj[key].data[0])),
                type: `${key}-${index}`, //表示attr陣列中的第0個
                icon: targetSvg.default,
            };
			// const tmpObj = test(key, index, item, svgs);

            return tmpObj;
        });
        tmpArr.push(...tmpFormatArr);
    }
	return tmpArr;
}
// A helper that returns a function that creates a split button with a toolbar in the dropdown,
// which in turn contains buttons allowing users to change list styles in the context of the current selection.
//
// @param {Object} options
// @param {module:core/editor/editor~Editor} options.editor
// @param {'bulletedList'|'numberedList'} options.parentCommandName The name of the higher-order editor command associated with
// the set of particular list styles (e.g. "bulletedList" for "disc", "circle", and "square" styles).
// @param {String} options.buttonLabel Label of the main part of the split button.
// @param {String} options.buttonIcon The SVG string of an icon for the main part of the split button.
// @param {String} options.toolbarAriaLabel The ARIA label for the toolbar in the split button dropdown.
// @param {Object} options.styleDefinitions Definitions of the style buttons.
// @returns {Function} A function that can be passed straight into {@link module:ui/componentfactory~ComponentFactory#add}.
function getSplitButtonCreator( { editor, parentCommandName, buttonLabel, buttonIcon, toolbarAriaLabel, styleDefinitions } ) {
	const parentCommand = editor.commands.get( parentCommandName );
	const listStyleCommand = editor.commands.get( 'listStyle' );

	// @param {module:utils/locale~Locale} locale
	// @returns {module:ui/dropdown/dropdownview~DropdownView}
	return locale => {
		const dropdownView = createDropdown( locale, SplitButtonView );
		const splitButtonView = dropdownView.buttonView;
		const styleButtonCreator = getStyleButtonCreator( { editor, parentCommandName, listStyleCommand } );

		addToolbarToDropdown( dropdownView, styleDefinitions.map( styleButtonCreator ) );

		dropdownView.bind( 'isEnabled' ).to( parentCommand );
		dropdownView.toolbarView.ariaLabel = toolbarAriaLabel;
		dropdownView.class = 'ck-list-styles-dropdown';

		splitButtonView.on( 'execute', () => {
			editor.execute( parentCommandName );
			editor.editing.view.focus();
		} );

		splitButtonView.set( {
			label: buttonLabel,
			icon: buttonIcon,
			tooltip: true,
			isToggleable: true
		} );

		splitButtonView.bind( 'isOn' ).to( parentCommand, 'value', value => !!value );

		return dropdownView;
	};
}

// A helper that returns a function (factory) that creates individual buttons used by users to change styles
// of lists.
//
// @param {Object} options
// @param {module:core/editor/editor~Editor} options.editor
// @param {module:list/liststylecommand~ListStylesCommand} options.listStyleCommand The instance of the `ListStylesCommand` class.
// @param {'bulletedList'|'numberedList'} options.parentCommandName The name of the higher-order command associated with a
// particular list style (e.g. "bulletedList" is associated with "square" and "numberedList" is associated with "roman").
// @returns {Function} A function that can be passed straight into {@link module:ui/componentfactory~ComponentFactory#add}.
function getStyleButtonCreator( { editor, listStyleCommand, parentCommandName } ) {
	const locale = editor.locale;
	const parentCommand = editor.commands.get( parentCommandName );

	// @param {String} label The label of the style button.
	// @param {String} type The type of the style button (e.g. "roman" or "circle").
	// @param {String} icon The SVG string of an icon of the style button.
	// @param {String} tooltip The tooltip text of the button (shorter than verbose label).
	// @returns {module:ui/button/buttonview~ButtonView}
	return ( { label, type, icon, tooltip } ) => {
		const button = new ButtonView( locale );

		button.set({ label, icon, tooltip });

		listStyleCommand.on( 'change:value', () => {
			button.isOn = listStyleCommand.value === type;
		} );

		button.on( 'execute', () => {
			// If the content the selection is anchored to is a list, let's change its style.

			if ( parentCommand.value ) {
				// If the current list style is not set in the model or the style is different than the
				// one to be applied, simply apply the new style.
				if ( listStyleCommand.value !== type ) {
					editor.execute( 'listStyle', { type } );
				}
				// If the style was the same, remove it (the button works as an off toggle).
				else {
					editor.execute( 'listStyle', { type: listStyleCommand._defaultType } );
				}
			}
			// If the content the selection is anchored to is not a list, let's create a list of a desired style.
			else {
				editor.model.change( () => {
					editor.execute( parentCommandName );
					editor.execute( 'listStyle', { type } );
				} );
			}

			editor.editing.view.focus();
		} );

		return button;
	};
}
