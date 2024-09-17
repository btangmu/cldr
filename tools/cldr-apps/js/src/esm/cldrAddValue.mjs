/*
 * cldrAddValue: enable submitting a new value for a path
 */
import * as cldrAjax from "./cldrAjax.mjs";
import * as cldrLoad from "./cldrLoad.mjs";
import * as cldrNotify from "./cldrNotify.mjs";
import * as cldrStatus from "./cldrStatus.mjs";
import * as cldrVue from "./cldrVue.mjs";

import AddValue from "../views/AddValue.vue";

function addButton(containerEl, xpstrid) {
  try {
    const AddValueWrapper = cldrVue.mount(AddValue, containerEl);
    AddValueWrapper.setXpathStringId(xpstrid);
  } catch (e) {
    console.error("Error loading Add Value vue " + e.message + " / " + e.name);
    cldrNotify.exception(e, "while loading AddValue");
  }
}

async function getAlts(xpstrid, callbackFunction) { // TODO ???
  const localeId = cldrStatus.getCurrentLocale();
  if (!localeId) {
    return;
  }
  const url = cldrAjax.makeApiUrl( // TODO ???
    "xpath/value/" + localeId + "/" + xpstrid,
    null
  );
  return await cldrAjax
    .doFetch(url)
    .then(cldrAjax.handleFetchErrors)
    .then((r) => r.json())
    .then(callbackFunction)
    .catch((e) => console.error(e));
}

async function addChosenValue(xpstrid, alt, callbackFunction) {
  const localeId = cldrStatus.getCurrentLocale();
  if (!localeId) {
    return;
  }
  const url = cldrAjax.makeApiUrl("xpath/value", null); // ???
  const data = {
    alt: alt,
    localeId: localeId,
    hexId: xpstrid,
  };
  const init = cldrAjax.makePostData(data);
  try {
    const response = await cldrAjax.doFetch(url, init);
    if (response.ok) {
      callbackFunction(null);
    } else {
      const json = await response.json();
      const message = json.message || "Unknown server response";
      throw new Error(message);
    }
  } catch (e) {
    console.error(e);
    window.alert("Error while adding value: \n\n" + e);
    callbackFunction(e);
  }
}

/**
 * Reload the page table so it will include the new row
 */
function reloadPage() {
  cldrLoad.reloadV(); // crude
}

export { addButton, getAlts, addChosenValue, reloadPage };
