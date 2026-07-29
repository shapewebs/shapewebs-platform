import { defineArrayMember, defineField, defineType } from "sanity";
import { isSafeSanitySlug } from "@shapewebs/content-schema";

import { accessibleImageFields, portableTextMembers } from "./shared";

export const blogPostType = defineType({
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required().max(140),
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
      initialValue: "en",
      name: "locale",
      options: {
        list: [
          { title: "English", value: "en" },
          { title: "Danish", value: "da-DK" },
        ],
      },
      title: "Locale",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "excerpt",
      rows: 3,
      title: "Excerpt",
      type: "text",
      validation: (rule) => rule.required().max(320),
    }),
    defineField({
      name: "author",
      title: "Author",
      to: [{ type: "author" }],
      type: "reference",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "categories",
      of: [
        defineArrayMember({
          to: [{ type: "category" }],
          type: "reference",
        }),
      ],
      title: "Categories",
      type: "array",
      validation: (rule) => rule.max(12).unique(),
    }),
    defineField({
      fields: accessibleImageFields,
      name: "coverImage",
      options: {
        hotspot: true,
      },
      title: "Cover image",
      type: "image",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "body",
      of: [...portableTextMembers],
      title: "Body",
      type: "array",
      validation: (rule) => rule.required().min(1).max(1_000),
    }),
    defineField({
      fields: [
        defineField({
          name: "title",
          title: "Search title",
          type: "string",
          validation: (rule) => rule.max(70),
        }),
        defineField({
          name: "description",
          rows: 3,
          title: "Search description",
          type: "text",
          validation: (rule) => rule.max(320),
        }),
        defineField({
          initialValue: false,
          name: "noIndex",
          title: "Prevent indexing",
          type: "boolean",
        }),
        defineField({
          fields: accessibleImageFields,
          name: "image",
          options: {
            hotspot: true,
          },
          title: "Social image",
          type: "image",
        }),
      ],
      name: "seo",
      title: "Search and sharing",
      type: "object",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "publishedAt",
      title: "Original publication time",
      type: "datetime",
    }),
  ],
  name: "blogPost",
  orderings: [
    {
      by: [{ direction: "desc", field: "publishedAt" }],
      name: "publishedAtDesc",
      title: "Publication time, newest",
    },
  ],
  preview: {
    prepare({ media, subtitle, title }) {
      return {
        media,
        subtitle,
        title,
      };
    },
    select: {
      media: "coverImage",
      subtitle: "locale",
      title: "title",
    },
  },
  title: "Blog post",
  type: "document",
});
