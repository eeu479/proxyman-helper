export type TemplateValue = {
  id: string;
  key: string;
  value: string;
};

export type Block = {
  id: string;
  name: string;
  method: string;
  path: string;
  description: string;
  responseTemplate: string;
  templateValues: TemplateValue[];
};
