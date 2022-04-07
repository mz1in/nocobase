import { Field } from '@formily/core';
import { useField, useFieldSchema } from '@formily/react';
import flat from 'flat';
import { useTranslation } from 'react-i18next';
import { useBlockRequestContext } from '../../../block-provider';
import { useCollection, useCollectionManager } from '../../../collection-manager';

export const useFilterOptions = (collectionName: string) => {
  const fieldSchema = useFieldSchema();
  const fieldNames = fieldSchema?.['x-component-props']?.fieldNames || [];
  const { getCollectionFields, getInterface } = useCollectionManager();
  const fields = getCollectionFields(collectionName);
  const field2option = (field, nochildren) => {
    if (fieldNames.length && !nochildren && !fieldNames.includes(field.name)) {
      return;
    }
    if (!field.interface) {
      return;
    }
    const fieldInterface = getInterface(field.interface);
    if (!fieldInterface.filterable) {
      return;
    }
    const { nested, children, operators } = fieldInterface.filterable;
    const option = {
      name: field.name,
      title: field?.uiSchema?.title || field.name,
      schema: field?.uiSchema,
      operators: operators || [],
    };
    if (nochildren) {
      return option;
    }
    if (children?.length) {
      option['children'] = children;
    }
    if (nested) {
      const targetFields = getCollectionFields(field.target);
      const options = getOptions(targetFields, true);
      option['children'] = option['children'] || [];
      option['children'].push(...options);
    }
    return option;
  };
  const getOptions = (fields, nochildren = false) => {
    const options = [];
    fields.forEach((field) => {
      const option = field2option(field, nochildren);
      if (option) {
        options.push(option);
      }
    });
    return options;
  };
  return getOptions(fields);
};

const isEmpty = (obj) => {
  return obj && Object.keys(obj).length === 0 && Object.getPrototypeOf(obj) === Object.prototype;
};

const removeNullCondition = (filter) => {
  const items = flat(filter);
  console.log('filter', items);
  const values = {};
  for (const key in items) {
    const value = items[key];
    if (value !== null && !isEmpty(value)) {
      values[key] = value;
    }
  }
  return flat.unflatten(values);
};

export const mergeFilter = (filter1, filter2) => {
  if (filter1 && filter2) {
    return { $and: [filter1, filter2] };
  }
  if (!filter1 && filter2) {
    return filter2;
  }
  if (filter1 && !filter2) {
    return filter1;
  }
  return {};
};

export const useFilterActionProps = () => {
  const { name } = useCollection();
  const options = useFilterOptions(name);
  const { service } = useBlockRequestContext();
  const field = useField<Field>();
  const { t } = useTranslation();
  return {
    options,
    onSubmit(values) {
      const filter = removeNullCondition(values?.filter);
      const f1 = service.params?.[0]?.filter;
      service.run({ ...service.params?.[0], filter: mergeFilter(f1, filter) });
      const items = filter?.$and || filter?.$or;
      if (items?.length) {
        field.title = t('{{count}} filter items', { count: items?.length || 0 });
      } else {
        field.title = t('Filter');
      }
    },
    onReset(values) {
      const filter = removeNullCondition(values?.filter);
      const f1 = service.params?.[0]?.filter;
      service.run({ ...service.params?.[0], filter: mergeFilter(f1, filter) });
      field.title = t('Filter');
    },
  };
};
