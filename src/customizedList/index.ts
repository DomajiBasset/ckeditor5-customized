import { Plugin } from '@ckeditor/ckeditor5-core';
import CustomizedListEditing from './listediting';
import CustomizedListUI from './listui';

//UTS100422004
export default class CustomizedList extends Plugin {
    /**
     * @inheritDoc
     */
    static get requires() {
        return [CustomizedListEditing, CustomizedListUI];
    }
    /**
   * @inheritDoc
   */
    static get pluginName() {
        return 'CustomizedList';
    }
}
