/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const households = app.findCollectionByNameOrId("households");
  const users = app.findCollectionByNameOrId("users");

  users.fields.add(new Field({
    name: "household",
    type: "relation",
    required: true,
    collectionId: households.id,
    maxSelect: 1,
    cascadeDelete: false,
  }));

  app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  users.fields.removeByName("household");
  app.save(users);
});
