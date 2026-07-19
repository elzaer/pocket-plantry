/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    name: "households",
    type: "base",
    fields: [
      {
        name: "name",
        type: "text",
        required: true,
        max: 100,
      },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    // Household membership is set up by an admin (there's only ever one
    // household today) — no client create/update/delete rule.
    listRule: "@request.auth.household = id",
    viewRule: "@request.auth.household = id",
  });
  app.save(collection);

  // Seed the single household this app is built for — CLAUDE.md: two users,
  // one household, no multi-tenant UI needed yet.
  const household = new Record(collection, { name: "The Household" });
  app.save(household);
}, (app) => {
  const collection = app.findCollectionByNameOrId("households");
  app.delete(collection);
});
