import { defineField, defineType } from "sanity";
import { isSafeSanitySlug } from "@shapewebs/content-schema";

export const categoryType = defineType({
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required().max(80),
    }),
    defineField({
      name: "slug",
      options: {
        maxLength: 120,
        source: "title",
      },
      title: "Slug",
      type: "slug",
      validation: (rule) =>
        rule
          .required()
          .custom((value) =>
            typeof value?.current === "string" &&
            isSafeSanitySlug(value.current)
              ? true
              : "Use lowercase letters, numbers and single hyphens.",
          ),
    }),
    defineField({
      name: "description",
      rows: 3,
      title: "Description",
      type: "text",
      validation: (rule) => rule.max(320),
    }),
  ],
  name: "category",
  title: "Category",
  type: "document",
});
