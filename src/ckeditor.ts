/**
 * @license Copyright (c) 2003-2024, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

// The editor creator to use.
import { ClassicEditor as ClassicEditorBase } from '@ckeditor/ckeditor5-editor-classic';
// import {
// 	ClassicEditor as ClassicEditorBase,
// 	Bold, Italic, Underline, Indent, AutoLink, Link, List, FontColor, FontFamily, FontSize, FontBackgroundColor,
// 	Paragraph, TextTransformation, PasteFromOffice, Alignment, ListPropertiesUI
// } from 'ckeditor5';

import { Bold, Italic, Underline } from '@ckeditor/ckeditor5-basic-styles';
import { Indent } from '@ckeditor/ckeditor5-indent';
import { AutoLink, Link } from '@ckeditor/ckeditor5-link';
import { List, ListProperties } from '@ckeditor/ckeditor5-list';
import { FontColor, FontFamily, FontSize, FontBackgroundColor } from '@ckeditor/ckeditor5-font';
import { Alignment } from '@ckeditor/ckeditor5-alignment';
import { Clipboard } from '@ckeditor/ckeditor5-clipboard';
import { PasteFromOffice } from '@ckeditor/ckeditor5-paste-from-office';
import { TextTransformation } from '@ckeditor/ckeditor5-typing';
import { Paragraph } from '@ckeditor/ckeditor5-paragraph';
import { Undo } from '@ckeditor/ckeditor5-undo';
import './ckeditor.scss';
import './zh.ts';
import CustomizedChar from './customizedChar/char';
import CustomizedList from './customizedList';

export default class ClassicEditor extends ClassicEditorBase {
	public static override builtinPlugins = [
		Paragraph,
		TextTransformation,
		Clipboard,
		PasteFromOffice,
		Link,
		AutoLink,
		Undo,
		FontBackgroundColor,
		FontColor,
		FontFamily,
		FontSize,
		Bold,
		Italic,
		Underline,
		Alignment,
		Indent,
		List,
		ListProperties,
		CustomizedChar,
		CustomizedList,
	];

	public static override defaultConfig = {
		toolbar: {
			items: [
				'undo', 'redo',
				'|', 'fontFamily', 'fontSize', 'fontColor', 'fontbackgroundcolor',
				'|', 'bold', 'italic', 'underline',
				'|', 'bulletedList', 'CListDropdown',
				'|', 'outdent', 'indent', 'alignment',
				'|', 'link',
				'|', 'comma', 'period', 'colon', 'semicolon', 'question', 'exclamation',
				'dash', 'commaChinese', 'dot', 'parenthesis', 'bracket', 'brace',
				'chevron', 'doubleAngle', 'quote', 'doubleQuote',
			],
			shouldNotGroupWhenFull: true
		},
		fontSize: {
			options: ['12', '13', '14', '15', '16', '17', '18'],
			supportAllValues: false
		},
		fontFamily: {
			options: [
				'Arial, Helvetica, sans-serif',
				'Comic Sans MS, Comic Sans, cursive',
				'Times New Roman, Times, serif',
				"標楷體",
				"新細明體",
				"微軟正黑體"
			],
			supportAllValues: true
		},
		link: {
			// Automatically add target="_blank" and rel="noopener noreferrer" to all external links.
			addTargetToExternalLinks: true,
		},
		// This value must be kept in sync with the language defined in webpack.config.js.
		language: 'zh'
	};
}
