import { Editor, Plugin } from '@ckeditor/ckeditor5-core';
import { DowncastWriter, Item, Element, ViewElement, Model, Writer, UpcastDispatcher, UpcastElementEvent, DowncastConversionApi, Text, DowncastAttributeEvent } from '@ckeditor/ckeditor5-engine';
import { ListEditing, ListIndentCommand } from '@ckeditor/ckeditor5-list';
import { listItemDowncastRemoveConverter, reconvertItemsOnDataChange } from '@ckeditor/ckeditor5-list/src/list/converters';
import { DowncastStrategy, ListEditingPostFixerEvent, ListItemAttributesMap } from '@ckeditor/ckeditor5-list/src/list/listediting';
import { AttributeStrategy } from '@ckeditor/ckeditor5-list/src/listproperties/listpropertiesediting';
import { listPropertiesUpcastConverter } from '@ckeditor/ckeditor5-list/src/listproperties/converters';
import { ListBlocksIterable } from '@ckeditor/ckeditor5-list/src/list/utils/listwalker';
import { ListElement, isListItemBlock } from '@ckeditor/ckeditor5-list/src/list/utils/model';
import { findAndAddListHeadToMap, fixListIndents, fixListItemIds } from '@ckeditor/ckeditor5-list/src/list/utils/postfixers.js';
import { listItemDowncastConverter, bogusPCreator } from './converter';
import CustomizedListStyle from './command';
import { GetCallback } from '@ckeditor/ckeditor5-utils';

const LIST_BASE_ATTRIBUTES = ['listType', 'listIndent', 'listItemId', 'listStyle'];

export default class CustomizedListEditing extends Plugin {
    /**
    * @inheritDoc
    */
    static get requires() {
        return [ListEditing];
    }
    /**
    * @inheritDoc
    */
    static get pluginName() {
        return 'CustomizedListEditing';
    }

    init() {
        const editor = this.editor;
        const model = editor.model;
        const listEditing = editor.plugins.get(ListEditing);
        const strategy = createAttributeStrategies() as AttributeStrategy;
        strategy.addCommand(editor);

        const attr = [strategy.attributeName, 'data-content'];
        model.schema.extend('$listItem', { allowAttributes: attr });
        for (const attribute of attr) {
            model.schema.setAttributeProperties(attribute, {
                copyOnReplace: true
            });
        }
        model.schema.extend('$text', { allowAttributes: ['spanClasses'] });

        const downcastStrategy = {
            scope: 'list',
            attributeName: strategy.attributeName,
            setAttributeOnDowncast(writer, attributeValue, viewElement) {
                strategy.setAttributeOnDowncast(writer, attributeValue, viewElement);
            }
        } as DowncastStrategy;

        //default true;
        // const multiBlock = editor.config.get('list.multiBlock');
        const elementName = 'paragraph';
        editor.conversion.for('editingDowncast')
            .elementToElement({
                model: elementName,
                view: bogusPCreator([...LIST_BASE_ATTRIBUTES, strategy.attributeName]),
                converterPriority: 'high'
            })
            .add(dispatcher => {
                dispatcher.on('attribute', listItemDowncastConverter([strategy.attributeName], [downcastStrategy], editor));
                dispatcher.on('remove', listItemDowncastRemoveConverter(model.schema));
                dispatcher.on('attribute:alignment', (evt, data, conversionApi) => {
                    const viewWriter = conversionApi.writer;
                    const viewElement = conversionApi.mapper.toViewElement(data.item);
                    const viewItem = findParentWithTag(viewElement, 'li');
                    if (viewItem) {
                        if (data.attributeNewValue) {
                            viewWriter.setStyle('text-align', data.attributeNewValue, viewItem);
                        } else {
                            viewWriter.removeStyle('text-align', viewItem);
                        }
                    }
                });
            });
        editor.conversion.for('dataDowncast')
            .elementToElement({
                model: elementName,
                view: bogusPCreator([...LIST_BASE_ATTRIBUTES, strategy.attributeName], { dataPipeline: true }),
                converterPriority: 'high'
            })
            .add(dispatcher => {
                dispatcher.on('attribute', listItemDowncastConverter([strategy.attributeName], [downcastStrategy], editor, { dataPipeline: true }));
            });

        // Set up conversion.
        editor.conversion.for('upcast')
            .add(dispatcher => {
                dispatcher.on('element:ol', listPropertiesUpcastConverter(strategy));
            });

        // Reset list properties after indenting list items.
        this.listenTo(editor.commands.get('indentList') as ListIndentCommand, 'afterExecute', (evt, changedBlocks: Array<Element>) => {
            model.change(writer => {
                for (const node of changedBlocks) {
                    if (strategy.appliesToListItem(node)) {
                        const currentIcon = node.getAttribute('listIcon') as string || '0';
                        writer.setAttribute(strategy.attributeName, parseInt(currentIcon) + 1, node);

                        const viewElement: ViewElement | undefined = editor.editing.mapper.toViewElement(node);
                        // if (viewElement) {
                        //     console.log(viewElement);
                        //     const viewItem = findParentWithTag(viewElement, 'ul');
                        //     if (!viewItem) {
                        //     }
                        // }
                    }
                }
            });
        });
        this.listenTo(editor.commands.get('outdentList') as ListIndentCommand, 'afterExecute', (evt, changedBlocks: Array<Element>) => {
            model.change(writer => {
                for (const node of changedBlocks) {
                    if (strategy.appliesToListItem(node) && node.getAttribute('listIcon')) {
                        const currentIcon = node.getAttribute('listIcon') as string;
                        writer.setAttribute(strategy.attributeName, parseInt(currentIcon) - 1, node);
                    }
                }
            });
        });

        // Verify if the list view element (ul or ol) requires refreshing.
        listEditing.on('checkAttributes:list', (evt, { viewElement, modelAttributes }) => {
            if (strategy.getAttributeOnUpcast(viewElement) != modelAttributes[strategy.attributeName]) {
                evt.return = true;
                evt.stop();
            }
        });

        this.listenTo(model.document, 'change:data', reconvertItemsOnDataChange(model, editor.editing, [strategy.attributeName], listEditing), { priority: 'high' });
        this._setupModelPostFixing(listEditing, strategy);

        //https://github.com/ckeditor/ckeditor5/issues/5752
        this._setupCustomAttribureConversion('li', elementName, 'style', editor);

        editor.commands.get('fontFamily').on('change:value', (evt, propertyName, newValue, oldValue) => {
            updateListParents(editor);
        });
        editor.model.document.on('change:data', () => {
            updateListParents(editor);
        });
    }

    /**
     * Registers model post-fixers.
     */
    private _setupModelPostFixing(listEditing: ListEditing, strategy: AttributeStrategy) {
        const model = this.editor.model;

        // Register list fixing.
        // First the low level handler.
        model.document.registerPostFixer(writer => modelChangePostFixer(model, writer, ['listIcon'], this));

        // Then the callbacks for the specific lists.
        // The indentation fixing must be the first one...
        this.on<ListEditingPostFixerEvent>('postFixer', (evt, { listNodes, writer }) => {
            evt.return = fixListIndents(listNodes, writer) || evt.return;
        }, { priority: 'high' });

        // ...then the item ids... and after that other fixers that rely on the correct indentation and ids.
        this.on<ListEditingPostFixerEvent>('postFixer', (evt, { listNodes, writer, seenIds }) => {
            evt.return = fixListItemIds(listNodes, seenIds, writer) || evt.return;
        }, { priority: 'high' });

        //trigger by listEditing:modelChangePostFixer
        // Add or remove list properties attributes depending on the list type.
        listEditing.on('postFixer', (evt, { listHead, listNodes, writer }: { listHead: Element, listNodes: ListBlocksIterable, writer: Writer }) => {
            for (const { node } of listNodes) {
                if (strategy.hasValidAttribute(node)) {
                    continue;
                }
                if (strategy.appliesToListItem(node)) {
                    writer.setAttribute(strategy.attributeName, strategy.defaultValue, node);
                } else {
                    writer.removeAttribute(strategy.attributeName, node);
                }
                evt.return = true;
            }
        });

        // Make sure that all items in a single list (items at the same level & listType) have the same properties.
        listEditing.on('postFixer', (evt, { listNodes, writer }) => {
            for (const { node, previousNodeInList } of listNodes) {
                // This is a first item of a nested list.
                if (!previousNodeInList) {
                    continue;
                }
                // This is a first block of a list of a different type.
                if (previousNodeInList.getAttribute('listType') != node.getAttribute('listType')) {
                    continue;
                }
                // Copy properties from the previous one.
                const { attributeName } = strategy;
                if (!strategy.appliesToListItem(node)) {
                    continue;
                }
                const value = previousNodeInList.getAttribute(attributeName);
                if (node.getAttribute(attributeName) != value) {
                    writer.setAttribute(attributeName, value, node);
                    evt.return = true;
                }
            }
        });
    }

    private _setupCustomAttribureConversion(viewElementName: string, modelElementName: string, viewAttribute: string, editor: Editor) {
        const modelAttribute = viewAttribute;

        // Extend the existing model schema
        editor.model.schema.extend(modelElementName, { allowAttributes: [modelAttribute] });

        // Add custom upcast conversion
        editor.conversion
            .for('upcast')
            .add(this.upcastAttribute(modelElementName, viewElementName, viewAttribute, modelAttribute));

        // Add custom downcast conversion
        editor.conversion.for('downcast').add(dispatcher => {
            dispatcher.on(`attribute:${modelAttribute}:${modelElementName}`, this.downcastAttribute(viewAttribute))
        })
    }

    upcastAttribute(
        modelElementName: string,
        viewElementName: string,
        viewAttribute: string,
        modelAttribute: string
    ): (dispatch: UpcastDispatcher) => void {
        return (dispatcher: UpcastDispatcher): void =>
            dispatcher.on<UpcastElementEvent>(`element:${viewElementName}`, (evt, data, conversionApi) => {
                const { viewItem, modelRange, modelCursor } = data

                if (!viewItem.hasAttribute(viewAttribute)) {
                    return
                }

                // Get the attribute value
                const attributeValue = viewItem.getAttribute(viewAttribute)

                if (!modelRange) {
                    console.error('Model range not found!')
                    return
                }
                let modelElement = modelRange.start.nodeAfter
                if (!modelElement || !modelElement.is('element', modelElementName)) {
                    if (modelRange.start.parent.is('element', modelElementName)) {
                        modelElement = modelRange.start.parent
                    } else if (modelCursor.parent.is('element', modelElementName)) {
                        modelElement = modelCursor.parent
                    } else {
                        const walker = modelRange.getWalker()
                        for (const { item } of walker) {
                            if (item.is('element', modelElementName)) {
                                modelElement = item
                                break
                            }
                        }
                    }
                }

                if (!modelElement) {
                    console.error('Model element not found')
                    return
                }

                conversionApi.writer.setAttribute(modelAttribute, attributeValue, modelElement)
            })
    }

    downcastAttribute(
        viewAttribute: string
    ): GetCallback<DowncastAttributeEvent<Element>> {
        return (evt, data, conversionApi: DowncastConversionApi) => {
            const modelElement = data.item;
            let viewElement: ViewElement = null;

            if (modelElement.is('selection')) {
                const selectElement = modelElement.getFirstPosition()?.parent;
                if (selectElement.is('element')) {
                    viewElement = conversionApi.mapper.toViewElement(selectElement);
                }
            } else {
                // Get view element that corresponds to the model element
                viewElement = conversionApi.mapper.toViewElement(modelElement)
            }
            if (!viewElement) {
                console.warn('View element not found for model element', modelElement)
                return
            }
            const li = findParentWithTag(viewElement, 'li');
            if (!li) {
                return;
            }

            if (data.attributeNewValue === null) {
                conversionApi.writer.removeAttribute(viewAttribute, li)
            } else {
                conversionApi.writer.setAttribute(viewAttribute, data.attributeNewValue, li)
            }
        }
    }
}

function createAttributeStrategies(): AttributeStrategy {
    const strategies = {
        attributeName: 'listIcon' as keyof ListItemAttributesMap,
        defaultValue: '0',
        viewConsumables: { attributes: 'list-icon' },
        addCommand(editor: Editor) {
            editor.commands.add('customlistStyle', new CustomizedListStyle(editor, '0'));
        },
        appliesToListItem(item: Item): boolean {
            return item.getAttribute('listType') === 'numbered';
        },
        hasValidAttribute(item: Element) {
            if (!this.appliesToListItem(item)) {
                return !item.hasAttribute('listIcon');
            }
            if (item.hasAttribute('listIcon')) {
                return true;
            } else {
                return false;
            }
        },
        setAttributeOnDowncast(writer: DowncastWriter, attributeValue: unknown, viewElement: ViewElement) {
            if (attributeValue) {
                writer.setAttribute('list-icon', attributeValue, viewElement);
            } else {
                writer.removeAttribute('list-icon', viewElement);
            }
        },
        getAttributeOnUpcast(listParent: ViewElement) {
            const icon = listParent.getAttribute('list-icon');
            if (icon) {
                return icon;
            } else {
                return '0';
            }
        }
    }
    return strategies;
}

function modelChangePostFixer(
    model: Model,
    writer: Writer,
    attributeNames: Array<string>,
    listEditing: CustomizedListEditing
) {
    const changes = model.document.differ.getChanges();
    const itemToListHead: Map<ListElement, ListElement> = new Map();

    let applied = false;

    for (const entry of changes) {
        if (entry.type == 'insert' && entry.name != '$text') {
            const item = entry.position.nodeAfter!;

            // Remove attributes in case of renamed element.
            if (!model.schema.checkAttribute(item, 'listItemId')) {
                for (const attributeName of Array.from(item.getAttributeKeys())) {
                    if (attributeNames.includes(attributeName)) {
                        writer.removeAttribute(attributeName, item);

                        applied = true;
                    }
                }
            }

            findAndAddListHeadToMap(entry.position, itemToListHead);

            // Insert of a non-list item - check if there is a list after it.
            if (!entry.attributes.has('listItemId')) {
                findAndAddListHeadToMap(entry.position.getShiftedBy(entry.length), itemToListHead);
            }

            // Check if there is no nested list.
            for (const { item: innerItem, previousPosition } of model.createRangeIn(item as Element)) {
                if (isListItemBlock(innerItem)) {
                    findAndAddListHeadToMap(previousPosition, itemToListHead);
                }
            }
        }
        // Removed list item or block adjacent to a list.
        else if (entry.type == 'remove') {
            findAndAddListHeadToMap(entry.position, itemToListHead);
        }
        // Changed list item indent or type.
        else if (entry.type == 'attribute' && attributeNames.includes(entry.attributeKey)) {
            findAndAddListHeadToMap(entry.range.start, itemToListHead);

            if (entry.attributeNewValue === null) {
                findAndAddListHeadToMap(entry.range.start.getShiftedBy(1), itemToListHead);
            }
        }
    }

    // Make sure that IDs are not shared by split list.
    const seenIds = new Set<string>();

    for (const listHead of itemToListHead.values()) {
        applied = listEditing.fire<ListEditingPostFixerEvent>('postFixer', {
            listNodes: new ListBlocksIterable(listHead),
            listHead,
            writer,
            seenIds
        }) || applied;
    }

    return applied;
}

function findParentWithTag(viewElement: ViewElement, tagName: string): ViewElement | null {
    let current: ViewElement | null = viewElement;
    tagName = tagName.toLowerCase();
    while (current) {
        if (current.is('element') && current.name.toLowerCase() === tagName) {
            return current;
        }
        current = current.parent && current.parent.is('element') ? current.parent : null;
    }
    return null;
}

function updateListParents(editor: Editor) {
    const root = editor.model.document.getRoot()
    if (!root) return

    const range = editor.model.createRangeIn(root)
    const listItemTextNodes: Text[] = []
    const processedParents: string[] = []
    for (const value of range.getWalker()) {
        const { item } = value

        if (item.is('$textProxy')) {
            const parent = item.parent as Element;
            if (parent?.hasAttribute('listIndent')) {
                // Prevents the same parent listItem from being modified by subsequent text nodes
                if (!processedParents.includes(parent.getAttribute('listItemId') as string)) {
                    listItemTextNodes.push(item.textNode)
                    processedParents.push(parent.getAttribute('listItemId') as string)
                }
            }
        } else if (item.is('node')) {
            const node = item as Element;
            if (item.hasAttribute('listIndent') && node.childCount === 0) {
                // Prevents the same parent listItem from being modified by subsequent text nodes
                if (!processedParents.includes(node.getAttribute('listItemId') as string)) {
                    listItemTextNodes.push(item as Text);
                    processedParents.push(node.getAttribute('listItemId') as string);
                }
            }
        }
    }
    editor.model.change(writer => {
        listItemTextNodes.forEach(textNode => {
            let parent: Item = null;
            if (textNode.hasAttribute('listIndent')) {
                parent = textNode;
            } else {
                parent = textNode.parent as Element;
            }

            // Add your [modelAttributeKey]: StyleSelector entries for each style you want to listenFor/apply
            const textAttrToStyleMap: Record<string, string> = {
                fontColor: 'color',
                fontFamily: 'font-family',
                'selection:fontFamily': 'font-family'
            }
            const styleArr: string[] = []
            for (const [attr, style] of Object.entries(textAttrToStyleMap)) {
                const value = textNode.getAttribute(attr);
                if (value) styleArr.push(`${style}: ${value}`);
            }
            if (styleArr.length > 0) {
                const style = styleArr.join('; ');
                writer.setAttribute('style', style, parent);
            }
        })
    })
}