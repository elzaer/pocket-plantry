/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Dev convenience only — gated behind env vars so a fresh pb_data gets a
  // superuser + test household user without a manual Admin UI trip. Unset
  // vars (the default — e.g. in production) mean this is a no-op. See
  // backend/.env.example.
  const suEmail = $os.getenv("PB_DEV_SUPERUSER_EMAIL");
  const suPassword = $os.getenv("PB_DEV_SUPERUSER_PASSWORD");
  if (suEmail && suPassword) {
    const superusers = app.findCollectionByNameOrId("_superusers");
    const record = new Record(superusers);
    record.set("email", suEmail);
    record.set("password", suPassword);
    app.save(record);
  }

  const userEmail = $os.getenv("PB_DEV_TEST_USER_EMAIL");
  const userPassword = $os.getenv("PB_DEV_TEST_USER_PASSWORD");
  if (userEmail && userPassword) {
    const household = app.findFirstRecordByFilter(
      "households",
      "name = {:name}",
      { name: "The Household" },
    );
    const users = app.findCollectionByNameOrId("users");
    const record = new Record(users);
    record.set("email", userEmail);
    record.set("password", userPassword);
    record.set("verified", true);
    record.set("household", household.id);
    app.save(record);
  }
}, (app) => {
  const suEmail = $os.getenv("PB_DEV_SUPERUSER_EMAIL");
  if (suEmail) {
    try {
      app.delete(
        app.findFirstRecordByFilter("_superusers", "email = {:email}", { email: suEmail }),
      );
    } catch (_) {
      // already gone
    }
  }

  const userEmail = $os.getenv("PB_DEV_TEST_USER_EMAIL");
  if (userEmail) {
    try {
      app.delete(
        app.findFirstRecordByFilter("users", "email = {:email}", { email: userEmail }),
      );
    } catch (_) {
      // already gone
    }
  }
});
