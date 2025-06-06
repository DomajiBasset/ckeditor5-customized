import { Editor } from '@ckeditor/ckeditor5-core';
import {
    DowncastWriter, Element, Node, ViewElement, Model, DowncastAttributeEvent,
    ModelConsumable, Mapper, ViewDocumentFragment, ViewRange,
    ElementCreatorFunction, AttributeElement
} from '@ckeditor/ckeditor5-engine';
import { DowncastStrategy } from '@ckeditor/ckeditor5-list/src/list/listediting';
import { createListElement, createListItemElement } from '@ckeditor/ckeditor5-list/src/list/utils/view.js';
import { GetCallback } from '@ckeditor/ckeditor5-utils';
import ListWalker from '@ckeditor/ckeditor5-list/src/list/utils/listwalker';
import { getAllListItemBlocks, isListItemBlock, ListElement } from '@ckeditor/ckeditor5-list/src/list/utils/model';
import { defLists, renewFormat } from './config';
import { getDigit, toFullWidthChar } from '../utils/tool';

export function listItemDowncastConverter(
    attributeNames: Array<string>,
    strategies: Array<DowncastStrategy>,
    editor: Editor,
    { dataPipeline }: { dataPipeline?: boolean } = {}
): GetCallback<DowncastAttributeEvent<ListElement>> {
    const consumer = createAttributesConsumer(attributeNames);
    return (evt, data, conversionApi) => {
        const { writer, mapper, consumable } = conversionApi;
        const listItem = data.item;

        if (!attributeNames.includes(data.attributeKey)) {
            return;
        }

        // Test if attributes on the converted items are not consumed.
        if (!consumer(listItem, consumable)) {
            return;
        }

        // Use positions mapping instead of mapper.toViewElement( listItem ) to find outermost view element.
        // This is for cases when mapping is using inner view element like in the code blocks (pre > code).
        const viewElement = findMappedViewElement(listItem, mapper, editor.model)!;

        // Unwrap element from current list wrappers.
        unwrapListItemBlock(viewElement, writer);

        const viewRange = writer.createRangeOn(viewElement);
        // Then wrap them with the new list wrappers (UL, OL, LI).
        wrapListItemBlock(listItem, viewRange, strategies, writer, { dataPipeline: dataPipeline });

        setChineseData(viewElement, writer, editor);
    };
}

function createAttributesConsumer(attributeNames: Array<string>) {
    return (node: Node, consumable: ModelConsumable) => {
        const events = [];
        // Collect all set attributes that are triggering conversion.
        for (const attributeName of attributeNames) {
            if (node.hasAttribute(attributeName)) {
                events.push(`attribute:${attributeName}`);
            }
        }
        if (!events.every(event => consumable.test(node, event) !== false)) {
            return false;
        }
        events.forEach(event => consumable.consume(node, event));
        return true;
    };
}

export function findMappedViewElement(element: Element, mapper: Mapper, model: Model): ViewElement | null {
    const modelRange = model.createRangeOn(element);
    const viewRange = mapper.toViewRange(modelRange).getTrimmed();
    return viewRange.end.nodeBefore as ViewElement | null;
}
// ckeditor5-list/src/list/converter.js: unwrapListItemBlock 也需要調整
function unwrapListItemBlock(viewElement: ViewElement, viewWriter: DowncastWriter) {
    let attributeElement: ViewElement | ViewDocumentFragment = viewElement.parent!;

    while (attributeElement.is('attributeElement') &&
        (
            ['ul', 'ol', 'li'].includes(attributeElement.name) ||
            attributeElement.hasClass('spanClasses')
        )
    ) {
        const parentElement = attributeElement.parent;
        viewWriter.unwrap(viewWriter.createRangeOn(viewElement), attributeElement);
        attributeElement = parentElement!;
    }
}

function wrapListItemBlock(
    listItem: ListElement,
    viewRange: ViewRange,
    strategies: Array<DowncastStrategy>,
    writer: DowncastWriter,
    { dataPipeline }: { dataPipeline?: boolean } = {}
) {
    if (!listItem.hasAttribute('listIndent')) {
        return;
    }

    const listItemIndent = listItem.getAttribute('listIndent');
    let currentListItem: ListElement | null = listItem;
    for (let indent = listItemIndent; indent >= 0; indent--) {
        const listItemViewElement = createListItemElement(writer, indent, currentListItem.getAttribute('listItemId'));//li
        const listViewElement = createListElement(writer, indent, currentListItem.getAttribute('listType'));//ol/ul
        dataPipeline = listViewElement.name === 'ul';

        for (const strategy of strategies) {
            if (
                (strategy.scope == 'list' || strategy.scope == 'item') &&
                currentListItem.hasAttribute(strategy.attributeName)
            ) {
                const aIcon = currentListItem.getAttribute(strategy.attributeName) as string;
                strategy.setAttributeOnDowncast(
                    writer,
                    aIcon,
                    strategy.scope == 'list' ? listViewElement : listItemViewElement
                );
            }
        }

        if (currentListItem.getAttribute('listType') === 'numbered' && !dataPipeline) {
            const aSpan = writer.createAttributeElement('div', {
                class: 'spanClasses'
            });
            viewRange = writer.wrap(viewRange, aSpan);
        }
        viewRange = writer.wrap(viewRange, listItemViewElement);
        viewRange = writer.wrap(viewRange, listViewElement);

        if (indent == 0) {
            break;
        }

        currentListItem = ListWalker.first(currentListItem, { lowerIndent: true });
        // There is no list item with lower indent, this means this is a document fragment containing
        // only a part of nested list (like copy to clipboard) so we don't need to try to wrap it further.
        if (!currentListItem) {
            break;
        }
    }
}

export function bogusPCreator(
    attributeNames: Array<string>,
    { dataPipeline }: { dataPipeline?: boolean } = {}
): ElementCreatorFunction {
    return (modelElement, { writer }) => {
        if (!shouldUseBogusParagraph(modelElement, attributeNames)) {
            return null;
        }

        if (!dataPipeline) {
            return writer.createContainerElement('span', { class: 'ck-list-bogus-paragraph' });
        }

        // Using `<p>` in case there are some markers on it and transparentRendering will render it anyway.
        const viewElement = writer.createContainerElement('p');
        writer.setCustomProperty('dataPipeline:transparentRendering', true, viewElement);
        return viewElement;
    };
}

function shouldUseBogusParagraph(
    item: Node,
    attributeNames: Array<string>,
    blocks: Array<Node> = getAllListItemBlocks(item)
) {
    if (!isListItemBlock(item)) {
        return false;
    }

    for (const attributeKey of item.getAttributeKeys()) {
        // Ignore selection attributes stored on block elements.
        if (attributeKey.startsWith('selection:') || attributeKey == 'htmlEmptyBlock') {
            continue;
        }

        // Don't use bogus paragraph if there are attributes from other features.
        if (!attributeNames.includes(attributeKey)) {
            return false;
        }
    }

    return blocks.length < 2;
}

function setChineseData(viewElement: ViewElement, viewWriter: DowncastWriter, editor: Editor) {
    let attributeElement: ViewElement | ViewDocumentFragment = viewElement.parent!;

    while (attributeElement.is('attributeElement') &&
        (
            ['li'].includes(attributeElement.name) ||
            attributeElement.hasClass('spanClasses')
        )
    ) {
        if (attributeElement.name === 'li') {
            break;
        }
        attributeElement = attributeElement.parent!;
    }
    if (attributeElement.name === 'li' && attributeElement.parent?.name === 'ol') {
        const olElement = attributeElement.parent as ViewElement;
        const aIcon = olElement.hasAttribute('list-icon') ? olElement.getAttribute('list-icon') as string : '0';
        const aIndex = Number((attributeElement as AttributeElement).index);

        viewWriter.setAttribute('data-content', getChineseData(aIcon, aIndex, editor), attributeElement as ViewElement);
    }
}

function getChineseData(iIcon: string, iIndex: number, editor: Editor) {
    const defList = editor.config.get('defLists') ? editor.config.get('defLists') as typeof defLists : defLists;
    const newFormat = editor.config.get('renewFormat') ? editor.config.get('renewFormat') as typeof renewFormat : renewFormat;
    const aIcon = (Number(iIcon) % Object.keys(defList).length).toString();
    let aChineseNumeral = '';

    if (defList[aIcon]) {
        const [formatKey, index] = defList[aIcon].split('-');
        const aCount = iIndex + 1;
        const aAttr = newFormat[formatKey].attr[parseInt(index)];//(T)
        const aTargetArr = newFormat[formatKey].data;//[]
        let aChar = '';
        switch (formatKey) {
            case 'format1':
            case 'format5':
                aChar = getChineseNumber(aCount, aTargetArr);
                break;
            case 'format2':
                aChar = aCount.toString();
                break;
            case 'format3':
                aChar = toFullWidthChar(aCount);
                break;
            case 'format4':
            case 'format6':
            case 'format7':
                aChar = getLimitedChar(aCount, aTargetArr);
                break;
        }
        aChineseNumeral = aAttr.replace("T", aChar);
    }
    return aChineseNumeral;
}

function getChineseNumber(iCount: number, iTargetArr: string[]) {
    const tenChar = iTargetArr[9];
    const HUNDRED = '百';
    const ZERO = '零';
    const getChineseDigit = (iNum: number, iPlace: number) => {
        if (iNum === 0) return '';
        return iTargetArr[iNum - 1] + (iPlace === 2 ? tenChar : iPlace === 3 ? HUNDRED : '');
    }

    if (iCount < 10) {
        return iTargetArr[iCount - 1];
    } else if (iCount < 20) {
        const onesNum = getDigit(iCount, 1);
        const onesText = getChineseDigit(onesNum, 0);
        return `${tenChar}${onesText}`;
    } else if (iCount < 100) {
        const tensNum = getDigit(iCount, 2);
        const onesNum = getDigit(iCount, 1);
        const tensText = getChineseDigit(tensNum, 2);
        const onesText = getChineseDigit(onesNum, 0);
        return `${tensText}${onesText}`;
    } else if (iCount < 1000) {
        const hundredsNum = getDigit(iCount, 3);
        const tensNum = getDigit(iCount, 2);
        const onesNum = getDigit(iCount, 1);
        const hundredsText = getChineseDigit(hundredsNum, 3);
        const tensText = getChineseDigit(tensNum, 2);
        const onesText = getChineseDigit(onesNum, 0);
        return `${hundredsText}${tensText}${tensNum > 0 ? onesText : ZERO + onesText}`.replace(new RegExp(`${ZERO}$`), '');
    } else {
        return '';
    }
}

function getLimitedChar(iCount: number, iTargetArr: string[]) {
    return iTargetArr[iCount - 1] === undefined
        ? iTargetArr[iTargetArr.length - 1]
        : iTargetArr[iCount - 1];
}