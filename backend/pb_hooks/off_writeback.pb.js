/// <reference path="../pb_data/types.d.ts" />

// CLAUDE.md: manually-entered products are pushed back to Open Food Facts;
// fallback-API-sourced products never are (licensing). OFF write credentials
// stay server-side only (set OFF_USERNAME/OFF_PASSWORD in the environment
// this PocketBase process runs under — see backend/.env.example).
onRecordAfterCreateSuccess((e) => {
  const record = e.record;

  if (record.get("source") !== "manual") {
    return e.next();
  }

  const username = $os.getenv("OFF_USERNAME");
  const password = $os.getenv("OFF_PASSWORD");
  if (!username || !password) {
    console.log(
      "off_writeback: OFF_USERNAME/OFF_PASSWORD not set, skipping contribution for",
      record.get("barcode"),
    );
    return e.next();
  }

  const quantity = [record.get("pack_size"), record.get("pack_unit")]
    .filter((part) => part !== null && part !== "" && part !== 0)
    .join(" ");

  const params = {
    code: record.get("barcode"),
    user_id: username,
    password: password,
    product_name: record.get("name"),
    brands: record.get("brand"),
    quantity: quantity,
  };

  const body = Object.keys(params)
    .filter((key) => params[key])
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join("&");

  try {
    const res = $http.send({
      method: "POST",
      url: "https://world.openfoodfacts.org/cgi/product_jqm2.php",
      body: body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (res.statusCode === 200 && res.json && res.json.status === 1) {
      record.set("contributed_to_off", true);
      e.app.save(record);
    } else {
      console.log(
        "off_writeback: contribution failed for",
        record.get("barcode"),
        res.statusCode,
        res.body,
      );
    }
  } catch (err) {
    console.log("off_writeback: request error for", record.get("barcode"), err);
  }

  return e.next();
}, "products");
