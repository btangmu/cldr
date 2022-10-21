/*
 * cldrOrganizations: handle Organization names
 */
import * as cldrAjax from "./cldrAjax.js";

let map = null;

/**
 * Get a complete list of organizations, as a map from short name to display name
 *
 * Short and display names are like "wikimedia" and ""Wikimedia Foundation", respectively
 *
 * @returns the map
 */
async function get() {
  const url = cldrAjax.makeApiUrl("organizations", null);
  map = await cldrAjax
    .doFetch(url)
    .then(cldrAjax.handleFetchErrors)
    .then((r) => r.json())
    .then(loadOrgs)
    .catch((e) => console.error(`Error: ${e} ...`));
  return map;
}

function loadOrgs(json) {
  if (json.map) {
    map = json.map;
  } else {
    console.err("Organization list not received from server");
  }
  return map;
}

export { get };
