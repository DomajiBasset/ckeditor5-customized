/**
 * @license Copyright (c) 2003-2024, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */
import { first } from 'ckeditor5/src/utils.js';
import { ListCommand } from '@ckeditor/ckeditor5-list';
import { Command, type Editor } from 'ckeditor5/src/core.js';
import { expandListBlocksToCompleteItems, expandListBlocksToCompleteList, getListItems, getSelectedBlockObject, isListItemBlock, ListItemUid } from '@ckeditor/ckeditor5-list/src/list/utils/model';

export default class CustomizedListStyle extends Command {
    defaultType: string;
    /**
     * Creates an instance of the command.
     *
     * @param editor The editor instance.
     * @param defaultType The list type that will be used by default if the value was not specified during
     * the command execution.
     */
    constructor(editor: Editor, defaultType: string) {
        super(editor);
        this.defaultType = defaultType;
    }
    /**
     * @inheritDoc
     */
    override refresh() {
        this.value = this._getIconValue();
        this.isEnabled = this._checkEnabled();
    }
    /**
     * Executes the command.
     *
     * @fires execute
     * @param options.type The type of the list style, e.g. `'disc'` or `'square'`. If `null` is specified, the default
     * style will be applied.
     */
    override execute(options: any = {}) {
        const model = this.editor.model;
        const document = model.document;

        model.change(writer => {
            const selectedBlockObject = getSelectedBlockObject(model);
            let blocks = Array.from(document.selection.getSelectedBlocks())
                .filter(block => block.hasAttribute('listType'));

            if ((selectedBlockObject || document.selection.isCollapsed) && isListItemBlock(blocks[0])) {
                const changedBlocks = getListItems(selectedBlockObject || blocks[0]);
                for (const block of changedBlocks) {
                    writer.setAttributes({
                        listType: 'customNumbered'
                    }, block);
                }
            } else if (blocks.length > 0) {
                for (const block of blocks) {
                    if (!block.hasAttribute('listType')) {
                        writer.setAttributes({
                            listIndent: 0,
                            listItemId: ListItemUid.next(),
                            listType: 'customNumbered'
                        }, block);
                    } else {
                        for (const node of expandListBlocksToCompleteItems(block, { withNested: false })) {
                            if (node.getAttribute('listType') != 'customNumbered') {
                                writer.setAttributes({
                                    listType: 'customNumbered'
                                }, node);
                            }
                        }
                    }
                }
            } else {
                this.tryToConvertItemsToList(options);
            }

            if (!blocks.length) {
                return;
            }
            blocks = expandListBlocksToCompleteList(blocks);
            for (const block of blocks) {
                let type = options.type || this.defaultType
                writer.setAttribute('listIcon', type, block);
            }
        });
    }
    /**
     * Checks the command's {@link #value}.
     *
     * @returns The current value.
     */
    _getIconValue(): string | null {
        const listItem = first(this.editor.model.document.selection.getSelectedBlocks());
        if (isListItemBlock(listItem)) {
            return listItem.getAttribute('listIcon') as string;
        }
        return null;
    }
    /**
     * Checks whether the command can be enabled in the current context.
     *
     * @returns Whether the command should be enabled.
     */
    _checkEnabled() {
        const editor = this.editor;
        const numberedList = editor.commands.get('customNumberedList') as ListCommand;
        return numberedList.isEnabled;
    }
    /**
     * Check if the provided list style is valid. Also change the selection to a list if it's not set yet.
     *
     * @param options.type The type of the list style. If `null` is specified, the function does nothing.
    */
    tryToConvertItemsToList(options: any) {
        if (!options.type) {
            return;
        }

        const editor = this.editor;
        const commandName = `customNumberedList`;
        const command = editor.commands.get(commandName) as ListCommand;
        if (!command.value) {
            editor.execute(commandName);
        }
    }
}
