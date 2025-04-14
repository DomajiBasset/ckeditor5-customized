import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
export default class ListStartAttribute extends Plugin {
    init() {
        const editor = this.editor;

        // 1.extend schema
        editor.model.schema.extend('listItem', {
            allowAttributes: 'data-content',
        });

        // 2.set conversion up/down
        editor.conversion.for('downcast').add((dispatcher) => {
            dispatcher.on(
                'attribute:data-content',
                (evt, data, conversionApi) => {
                    if (data.item.name != 'listItem') {
                        return;
                    }
                    const viewWriter = conversionApi.writer;
                    const viewElement = conversionApi.mapper.toViewElement(
                        data.item
                    );
                    if (true) {
                        viewWriter.setAttribute(
                            data.attributeKey,
                            data.attributeNewValue,
                            viewElement
                        );
                    }
                }
            );
        });
    }
}
