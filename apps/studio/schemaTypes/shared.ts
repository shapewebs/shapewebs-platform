import { defineArrayMember, defineField } from "sanity";
import { isSafeInternalHref } from "@shapewebs/content-schema";

function isSafePublicHref(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim();

  if (isSafeInternalHref(normalized)) {
    return true;
  }

  try {
    const parsed = new URL(normalized);

    return (
      parsed.protocol === "https:" &&
      !parsed.username &&
      !parsed.password &&
      !parsed.port
    );
  } catch {
    return false;
  }
}

export const accessibleImageFields = [
  defineField({
    description:
      "Describe the image's meaning. Leave empty only when it is decorative.",
    name: "alt",
    title: "Alternative text",
    type: "string",
    validation: (rule) =>
      rule.max(240).custom((value, context) => {
        const parent = context.parent as { decorative?: unknown } | undefined;

        return parent?.decorative === true ||
          (typeof value === "string" && value.trim().length > 0)
          ? true
          : "Alternative text is required unless the image is decorative.";
      }),
  }),
  defineField({
    initialValue: false,
    name: "decorative",
    title: "Decorative image",
    type: "boolean",
  }),
  defineField({
    name: "caption",
    rows: 3,
    title: "Caption",
    type: "text",
    validation: (rule) => rule.max(400),
  }),
];

export const portableTextMembers = [
  defineArrayMember({
    lists: [
      { title: "Bullet", value: "bullet" },
      { title: "Numbered", value: "number" },
    ],
    marks: {
      annotations: [
        {
          fields: [
            {
              description:
                "Use a normalized internal path or a complete HTTPS URL.",
              name: "href",
              title: "Destination",
              type: "string",
              validation: (rule) =>
                rule
                  .required()
                  .max(512)
                  .custom((value) =>
                    isSafePublicHref(value)
                      ? true
                      : "Use a normalized internal path or HTTPS URL without credentials or a custom port.",
                  ),
            },
          ],
          name: "link",
          title: "Link",
          type: "object",
        },
      ],
      decorators: [
        { title: "Strong", value: "strong" },
        { title: "Emphasis", value: "em" },
        { title: "Underline", value: "underline" },
        { title: "Strike-through", value: "strike-through" },
        { title: "Inline code", value: "code" },
      ],
    },
    of: [],
    styles: [
      { title: "Normal", value: "normal" },
      { title: "Heading 2", value: "h2" },
      { title: "Heading 3", value: "h3" },
      { title: "Heading 4", value: "h4" },
      { title: "Quote", value: "blockquote" },
    ],
    type: "block",
  }),
  defineArrayMember({
    fields: [
      ...accessibleImageFields,
      defineField({
        initialValue: "contained",
        name: "layout",
        options: {
          list: [
            { title: "Contained", value: "contained" },
            { title: "Wide", value: "wide" },
            { title: "Full width", value: "full" },
          ],
        },
        title: "Layout",
        type: "string",
        validation: (rule) => rule.required(),
      }),
    ],
    name: "image",
    options: {
      hotspot: true,
    },
    title: "Image",
    type: "image",
  }),
  defineArrayMember({
    fields: [
      defineField({
        name: "heading",
        title: "Heading",
        type: "string",
        validation: (rule) => rule.max(120),
      }),
      defineField({
        name: "body",
        rows: 4,
        title: "Body",
        type: "text",
        validation: (rule) => rule.required().max(1500),
      }),
      defineField({
        initialValue: "info",
        name: "tone",
        options: {
          list: [
            { title: "Information", value: "info" },
            { title: "Success", value: "success" },
            { title: "Warning", value: "warning" },
          ],
        },
        title: "Tone",
        type: "string",
        validation: (rule) => rule.required(),
      }),
    ],
    name: "callout",
    title: "Callout",
    type: "object",
  }),
  defineArrayMember({
    fields: [
      defineField({
        name: "heading",
        title: "Heading",
        type: "string",
        validation: (rule) => rule.max(120),
      }),
      defineField({
        name: "label",
        title: "Label",
        type: "string",
        validation: (rule) => rule.required().max(60),
      }),
      defineField({
        name: "href",
        title: "Destination",
        type: "string",
        validation: (rule) =>
          rule
            .required()
            .max(512)
            .custom((value) =>
              isSafePublicHref(value)
                ? true
                : "Use a normalized internal path or HTTPS URL without credentials or a custom port.",
            ),
      }),
    ],
    name: "cta",
    title: "Call to action",
    type: "object",
  }),
  defineArrayMember({
    fields: [
      defineField({
        name: "filename",
        title: "Filename",
        type: "string",
        validation: (rule) => rule.max(180),
      }),
      defineField({
        initialValue: "text",
        name: "language",
        options: {
          list: [
            "bash",
            "css",
            "html",
            "javascript",
            "json",
            "text",
            "tsx",
            "typescript",
          ],
        },
        title: "Language",
        type: "string",
        validation: (rule) => rule.required(),
      }),
      defineField({
        name: "code",
        rows: 18,
        title: "Code",
        type: "text",
        validation: (rule) => rule.required().max(40_000),
      }),
    ],
    name: "codeBlock",
    title: "Code",
    type: "object",
  }),
];
