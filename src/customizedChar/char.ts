import { Plugin } from '@ckeditor/ckeditor5-core';
import { ButtonView } from '@ckeditor/ckeditor5-ui';

export default class CustomizedChar extends Plugin {
    /**
   * @inheritDoc
   */
    static get pluginName() {
        return 'CustomizedChar';
    }

    init() {
        const editor = this.editor;
        const symbols = {
            'Comma': '，',
            'Period': '。',
            'Colon': '：',
            'Semicolon': '；',
            'Question': '？',
            'Exclamation': '！',
            'Dash': '－',
            'CommaChinese': '、',
            'Dot': '．',
            'Parenthesis': '（）',
            'Bracket': '〔〕',
            'Brace': '｛｝',
            'Chevron': '＜＞',
            'DoubleAngle': '《》',
            'Quote': '「」',
            'DoubleQuote': '『』',
        }
        Object.entries(symbols).forEach(([key, value]) => {
            const aChar = value;
            // ckeditor5-ui/src/componentfactory.js: Names are returned in lower case.
            editor.ui.componentFactory.add(key, () => {
                const button = new ButtonView();
                button.set({
                    label: aChar,
                    withText: true,
                    labelStyle: `
                        font-family: "標楷體", "KaiTi", "DFKai-SB";
                        font-size: 14px;
                    `,
                    tooltip: true
                });

                button.on('execute', () => {
                    editor.model.change(writer => {
                        // const currentAttributes = editor.model.document.selection.getAttributes();
                        // editor.model.insertContent( writer.createText( aChar, currentAttributes ) );
                        const selection = editor.model.document.selection;
                        const currentAttributes = selection.getAttributes();
                        const insertPosition = selection.focus;
                        if (insertPosition != null) {
                            writer.insertText(aChar, currentAttributes, insertPosition);
                            editor.editing.view.focus();
                        }
                    });
                });

                return button;
            });
        })
    }
}