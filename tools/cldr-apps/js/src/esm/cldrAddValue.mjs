/*
 * cldrAddValue: enable submitting a new value for a path
 */
import * as cldrAjax from "./cldrAjax.mjs";
import * as cldrLoad from "./cldrLoad.mjs";
import * as cldrNotify from "./cldrNotify.mjs";
import * as cldrStatus from "./cldrStatus.mjs";
import * as cldrVue from "./cldrVue.mjs";

import AddValue from "../views/AddValue.vue";

/**
 * Is the "Add Value" form currently visible?
 */
let formIsVisible = false;

function isFormVisible() {
  return formIsVisible;
}

function setFormIsVisible(visible) {
  formIsVisible = visible;
}

function addButton(containerEl, xpstrid) {
  try {
    const AddValueWrapper = cldrVue.mount(AddValue, containerEl);
    // AddValueWrapper.setXpathStringId(xpstrid); // TODO ???
  } catch (e) {
    console.error(
      "Error loading Add Value Button vue " + e.message + " / " + e.name
    );
    cldrNotify.exception(e, "while loading AddValue");
  }
}

async function sendRequest(newValue, xpstrid, callbackFunction) {
  if (true) {
    console.log(
      "TODO: implement cldrAddValue.sendRequest, newValue = " +
        newValue +
        "; xpstrid = " +
        xpstrid
    );
    return;
  }
  const localeId = cldrStatus.getCurrentLocale();
  if (!localeId) {
    return;
  }
  const url = cldrAjax.makeApiUrl("xpath/value", null); // TODO ???
  const data = {
    newValue: newValue,
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

export { addButton, isFormVisible, reloadPage, sendRequest, setFormIsVisible };
