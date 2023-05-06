import { ArrayField } from '@formily/core';
import { RecursionField, observer, useFieldSchema } from '@formily/react';
import { Button, Card, Divider } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import React, { useContext } from 'react';
import { AssociationFieldContext } from './context';
import { useAssociationFieldContext } from './hooks';
import { useRemoveActionProps } from '../../../block-provider/hooks';

export const Nester = (props) => {
  const { options } = useContext(AssociationFieldContext);
  if (['hasOne', 'belongsTo'].includes(options.type)) {
    return <ToOneNester {...props} />;
  }
  if (['hasMany', 'belongsToMany'].includes(options.type)) {
    return <ToManyNester {...props} />;
  }
  return null;
};

const ToOneNester = (props) => {
  return <Card bordered={true}>{props.children}</Card>;
};

const toArr = (value) => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return [value];
};

const ToManyNester = observer((props) => {
  const fieldSchema = useFieldSchema();
  const { field ,options:collectionField} = useAssociationFieldContext<ArrayField>();
  const values = toArr(field.value);
  const { onClick } = useRemoveActionProps(`${collectionField.collectionName}.${collectionField.target}`);
  return (
    <Card bordered={true}>
      {values.map((value, index) => {
        return (
          <>
              <Button
                icon={<CloseOutlined />}
                type={'text'}
                style={{ float: 'right', zIndex: 1000, fontSize: 12 }}
                onClick={() => {
                  field.value.splice(index, 1);
                  if (field.readPretty) {
                    onClick(value)
                  }
                }}
              />
            <RecursionField onlyRenderProperties basePath={field.address.concat(index)} schema={fieldSchema} />
            <Divider />
          </>
        );
      })}
      {field.editable && (
        <Button
          type={'dashed'}
          block
          onClick={() => {
            field.value.push({});
          }}
        >
          Add new
        </Button>
      )}
    </Card>
  );
});
