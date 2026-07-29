import { defineField, defineType } from "sanity";
import { isSafeSanitySlug } from "@shapewebs/content-schema";

import { accessibleImageFields } from "./shared";

export const authorType = defineType({
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (rule) => rule.required().max(100),
    }),
    defineField({
      name: "slug",
      options: {
        maxLength: 120,
        source: "name",
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
      fields: accessibleImageFields,
      name: "portrait",
      options: {
        hotspot: true,
      },
      title: "Portrait",
      type: "image",
    }),
    defineField({
      name: "bio",
      rows: 5,
      title: "Biography",
      type: "text",
      validation: (rule) => rule.max(600),
    }),
  ],
  name: "author",
  title: "Author",
  type: "document",
});
