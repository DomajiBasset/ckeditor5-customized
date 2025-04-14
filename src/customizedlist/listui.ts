import { Command, Editor, icons, Plugin } from '@ckeditor/ckeditor5-core';
import { ButtonView, createDropdown, focusChildOnDropdownOpen, SplitButtonView } from '@ckeditor/ckeditor5-ui';
import { ListCommand, ListPropertiesConfig } from '@ckeditor/ckeditor5-list';
import { getNormalizedConfig } from '@ckeditor/ckeditor5-list/src/listproperties/utils/config';
import ListPropertiesView from '@ckeditor/ckeditor5-list/src/listproperties//ui/listpropertiesview.js';
import { iconMap, IconMapKey } from './icon';
import { defLists, renewFormat } from './config';

interface IstyleDefinitions {
    label: string,
    tooltip: boolean,
    type: number,
    icon: string
};
interface IStyleButton {
    editor: Editor,
    listStyleCommand: Command
};

export default class CustomizedListUI extends Plugin {
    /**
   * @inheritDoc
   */
    static get pluginName() {
        return 'CustomizedListUI';
    }

    init() {
        const editor = this.editor;
        const propertiesConfig = editor.config.get('list.properties');
        const normalizedConfig = getNormalizedConfig(propertiesConfig as ListPropertiesConfig);
        const listStyleCommand = editor.commands.get('customlistStyle') as Command;
        const parentCommandName = "numberedList";
        const parentCommand = editor.commands.get(parentCommandName);
        const t = editor.locale.t;
        const styleGridAriaLabel = t('Numbered list styles toolbar');
        const styleDefinitions: IstyleDefinitions[] = [];
        const defList = editor.config.get('defLists') ? editor.config.get('defLists') as typeof defLists : defLists;
        const newFormat = editor.config.get('renewFormat') ? editor.config.get('renewFormat') as typeof renewFormat : renewFormat;

        Object.entries(defList).forEach(([key, value]) => {
            const [formatKey, index] = value.split('-');
            const format = newFormat[formatKey];
            const char = format.data[0];
            const attr = format.attr[parseInt(index)];
            let chineseNumeral = attr.replace("T", char);

            styleDefinitions.push({
                label: t(chineseNumeral),
                tooltip: true,
                type: parseInt(key),
                icon: iconMap[value as IconMapKey]
            });
        });
        editor.ui.componentFactory.add("CListDropdown", locale => {
            const dropdownView = createDropdown(locale, SplitButtonView);
            const mainButtonView = dropdownView.buttonView;
            dropdownView.class = 'ck-list-styles-dropdown';
            // Main button was clicked.
            mainButtonView.on('execute', () => {
                editor.execute(parentCommandName);
                editor.editing.view.focus();
            });
            //check title
            mainButtonView.set({
                label: "有序清單",
                icon: icons.numberedList,
                tooltip: true,
                isToggleable: true
            });
            if (parentCommand != undefined) {
                mainButtonView.bind('isOn').to(parentCommand, 'value', value => !!value);
            }
            const enabledProperties = {
                ...normalizedConfig,
                ...(parentCommandName != 'numberedList' ? {
                    startIndex: false,
                    reversed: false
                } : null)
            };
            let styleButtonViews: ButtonView[] = [];
            const styleButtonCreator = getStyleButtonCreator({
                editor,
                listStyleCommand
            });
            styleButtonViews = styleDefinitions.map(styleButtonCreator);
            dropdownView.once('change:isOpen', () => {
                const listPropertiesView = new ListPropertiesView(locale, {
                    styleGridAriaLabel,
                    enabledProperties,
                    styleButtonViews
                });
                listPropertiesView.stylesView?.children.forEach(viewChild => {
                    const svg = viewChild.element?.querySelector('svg > title');
                    if (svg) {
                        svg.remove();
                    }
                });

                focusChildOnDropdownOpen(dropdownView, () => {
                    return listPropertiesView.stylesView?.children.find((child: any) => child.isOn);
                });

                // Make sure applying styles closes the dropdown.
                listPropertiesView.delegate('execute').to(dropdownView);

                dropdownView.panelView.children.add(listPropertiesView);
            });
            // Focus the editable after executing the command.
            // Overrides a default behaviour where the focus is moved to the dropdown button (#12125).
            dropdownView.on('execute', () => {
                editor.editing.view.focus();
            });

            return dropdownView;
        });
    }
}

/**
 * A helper that returns a function (factory) that creates individual buttons used by users to change styles
 * of lists.
 *
 * @param options.editor
 * @param options.listStyleCommand The instance of the `ListStylesCommand` class.
 * particular list style (e.g. "bulletedList" is associated with "square" and "numberedList" is associated with "roman").
 * @returns A function that can be passed straight into {@link module:ui/componentfactory~ComponentFactory#add}.
 */
function getStyleButtonCreator({ editor, listStyleCommand }: IStyleButton) {
    const locale = editor.locale;
    const parentCommand = editor.commands.get('numberedList') as ListCommand;
    return ({ label, type, icon, tooltip }: IstyleDefinitions) => {
        const button = new ButtonView(locale);
        button.set({ label, icon, tooltip });

        const level = `${type}`;

        listStyleCommand.on('change:value', () => {
            button.isOn = listStyleCommand.value === level;
        });
        parentCommand.on('change:value', () => {
            button.isOn = false;
        });

        button.on('execute', (eventInfo, data) => {
            if (parentCommand.value) {
                if (listStyleCommand.value === type) {
                    editor.execute('numberedList');
                } else {
                    editor.execute('customlistStyle', { type: level });
                }
            } else {
                editor.model.change((writer) => {
                    editor.execute('customlistStyle', { type: level });
                });
            }
        });
        return button;
    };
}
