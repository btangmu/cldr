/*
 * cldrAddValue: enable submitting a new value for a path
 */
import * as cldrNotify from "./cldrNotify.mjs";
import * as cldrSurvey from "./cldrSurvey.mjs";
import * as cldrTable from "./cldrTable.mjs";
import * as cldrVote from "./cldrVote.mjs";
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
    AddValueWrapper.setXpathStringId(xpstrid);
  } catch (e) {
    console.error(
      "Error loading Add Value Button vue " + e.message + " / " + e.name
    );
    cldrNotify.exception(e, "while loading AddValue");
  }
}

function sendRequest(xpstrid, newValue) {
  const rowId = cldrTable.makeRowId(xpstrid);
  const tr = document.getElementById(rowId);
  if (!tr) {
    return;
  }
  tr.inputTd = tr.querySelector(".othercell");
  const protoButton = document.getElementById("proto-button");
  cldrVote.handleWiredClick(
    tr,
    tr.theRow,
    "",
    newValue,
    cldrSurvey.cloneAnon(protoButton)
  );
}

export { addButton, isFormVisible, sendRequest, setFormIsVisible };
