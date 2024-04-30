import { SchemaSettings } from '@nocobase/client';
import { getAppComponent } from '@nocobase/test/web';

const myActionSettings = new SchemaSettings({
  name: 'myActionSettings',
  items: [
    {
      name: 'delete',
      type: 'remove',
    },
  ],
});

const App = getAppComponent({
  schema: {
    type: 'void',
    name: 'root',
    properties: {
      test: {
        type: 'void',
        'x-component': 'ActionBar',
        'x-component-props': {
          layout: 'two-columns',
        },
        properties: {
          a1: {
            title: 'Action 1',
            'x-component': 'Action',
            'x-action': 'a1',
            'x-align': 'right',
            'x-settings': 'myActionSettings',
          },
          a2: {
            title: 'Action 2',
            'x-component': 'Action',
            'x-action': 'a2',
            'x-align': 'right',
            'x-settings': 'myActionSettings',
          },
          a3: {
            title: 'Action 3',
            'x-component': 'Action',
            'x-action': 'a1',
            'x-align': 'left',
            'x-settings': 'myActionSettings',
          },
          a4: {
            title: 'Action 4',
            'x-component': 'Action',
            'x-action': 'a2',
            'x-align': 'left',
            'x-settings': 'myActionSettings',
          },
        },
      },
    },
  },
  appOptions: {
    schemaSettings: [myActionSettings],
  },
  designable: true,
});

export default App;
