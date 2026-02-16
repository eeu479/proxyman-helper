export type TemplateValue = {
  id: string;
  key: string;
  value: string;
};

export type TemplateVariant = {
  id: string;
  name: string;
  values: TemplateValue[];
};

export type Block = {
  id: string;
  name: string;
  method: string;
  path: string;
  description: string;
  responseTemplate: string;
  responseHeaders: Record<string, string>;
  templateValues: TemplateValue[];
  templateVariants: TemplateVariant[];
  activeVariantId?: string | null;
};
