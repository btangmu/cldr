/*
 * cldrOrganizations: handle Organization names
 */
import * as cldrAjax from "./cldrAjax.js";

let orgs = null;

/**
 * Get a complete list of organizations, in the form of two map, from short name to display name, and vice-versa
 *
 * Short and display names are like "wikimedia" and ""Wikimedia Foundation", respectively
 *
 * @returns the object with two maps, displayToShort and shortToDisplay
 */
async function getOrgs() {
  if (orgs) {
    return orgs;
  }
  const url = cldrAjax.makeApiUrl("organizations", null);
  return await cldrAjax
    .doFetch(url)
    .then(cldrAjax.handleFetchErrors)
    .then((r) => r.json())
    .then(loadOrgs)
    .catch((e) => console.error(`Error: ${e} ...`));
}

function loadOrgs(json) {
  if (json.map) {
    const displayToShort = json.map;
    const shortToDisplay = {};
    for (let displayName in displayToShort) {
      shortToDisplay[displayToShort[displayName]] = displayName;
    }
    orgs = { displayToShort, shortToDisplay };
    return orgs;
  } else {
    console.err("Organization list not received from server");
    return null;
  }
}

export { getOrgs };
