<template>
  <article>
    <a-spin v-if="loading" :delay="500" />
    <div v-if="!hasPermission">
      Please log in as a user with sufficient permissions.
    </div>
    <div v-if="errorsExist()">
      <span class="addUserErrors">Please correct the following error(s):</span>
      <ul>
        <li v-for="error in errors" :key="error">{{ error }}</li>
      </ul>
    </div>
    <div v-if="hasPermission && !loading && !addedNewUser" class="adduser">
      <h2>Add User</h2>
      <table>
        <tr>
          <th><label for="new_org">Organization:</label></th>
          <td v-if="canChooseOrg">
            <a-select
              id="new_org"
              v-model:value="orgValueAndLabel"
              label-in-value
              show-search
              style="width: 100%"
              placeholder="Select an organization"
              :options="orgOptions"
              @change="getOrgLocalesAfterChoosingOrg"
            >
              <template #option="{ label }">
                {{ label }}
              </template>
            </a-select>
          </td>
          <td v-else>
            <input id="new_org" disabled="disabled" v-model="newUserOrg" />
          </td>
        </tr>
        <tr>
          <th><label for="new_name">Name:</label></th>
          <td>
            <a-input
              id="new_name"
              size="40"
              v-model:value="newUserName"
              placeholder="Enter a user name"
            />
          </td>
        </tr>
        <tr>
          <th><label for="new_email">E-mail:</label></th>
          <td>
            <a-input
              id="new_email"
              size="40"
              v-model:value="newUserEmail"
              type="email"
              placeholder="Enter an e-mail address"
              @blur="validateEmail(newUserEmail)"
            />
          </td>
        </tr>
        <tr>
          <th><label for="new_level">User level:</label></th>
          <td>
            <a-select
              id="new_level"
              v-model:value="newUserLevel"
              style="width: 100%"
              placeholder="Select a user level"
            >
              <a-select-option
                v-for="(v, number) in levelList"
                v-bind:value="number"
                :disabled="!v.canCreateOrSetLevelTo"
                :key="number"
              >
                {{ v.string }}
              </a-select-option>
            </a-select>
          </td>
        </tr>
        <template v-if="localesAreRequired()">
          <tr>
            <th><label for="radio_head"> </label></th>
            <td>
              <a-radio-group id="radio_head" v-model:value="allLocales">
                <a-radio :value="true">All locales</a-radio>
                <a-radio :value="false">Specific locales</a-radio>
              </a-radio-group>
            </td>
          </tr>
          <tr v-if="!allLocales">
            <th><label for="new_locales">Locales:</label></th>
            <td>
              <a-select
                id="new_locales"
                v-model:value="chosenLocales"
                mode="multiple"
                show-search
                style="width: 100%"
                placeholder="Select locale(s)"
                :options="localeOptions"
                :max-tag-count="10"
                @change="concatenateAndValidateLocales"
              >
                <!-- This appears in the menu: -->
                <template #option="{ localeDescription }">
                  {{ localeDescription }}
                </template>
                <!-- This appears in the input box after choosing from menu: -->
                <template #tagRender="{ closable, onClose, option }">
                  <a-tag
                    :closable="closable"
                    style="margin-right: 3px"
                    @close="onClose"
                  >
                    <span :title="option.localeDescription">{{
                      option.value
                    }}</span>
                  </a-tag>
                </template>
              </a-select>
              <div v-if="Object.keys(locWarnings).length">
                <span class="locWarnings"
                  >The following locales will not be added due to
                  problems:</span
                >
                <ul>
                  <li v-bind:key="loc" v-for="loc in Object.keys(locWarnings)">
                    <code>{{ loc }}</code>
                    {{ getParenthesizedName(loc) }}
                    — {{ explainWarning(locWarnings[loc]) }}
                  </li>
                </ul>
              </div>
            </td>
          </tr>
        </template>

        <tr class="addButton">
          <td colspan="2">
            <button v-if="readyToAdd()" v-on:click="add()">Add</button>
          </td>
        </tr>
      </table>
    </div>

    <div v-if="addedNewUser">
      <h2>Added User</h2>
      <p>
        ✅ The new user was added. Name: <kbd>{{ newUserName }}</kbd> E-mail:
        <kbd>{{ newUserEmail }}</kbd> ID:
        <kbd>{{ userId }}</kbd>
      </p>
      <p>
        ⚠️ <em>The password is not sent to the user automatically!</em> You must
        click the <em>Manage this user</em> button and choose
        <em>Send password</em> from the menu.
      </p>
      <p>
        <button class="manageButton" v-on:click="manageThisUser()">
          Manage this user
        </button>
      </p>
      <hr />
      <p><button v-on:click="initializeData()">Add another user</button></p>
    </div>
  </article>
</template>

<script setup>
import * as cldrAccount from "../esm/cldrAccount.mjs";
import * as cldrAjax from "../esm/cldrAjax.mjs";
import * as cldrLoad from "../esm/cldrLoad.mjs";
import * as cldrOrganizations from "../esm/cldrOrganizations.mjs";
import * as cldrStatus from "../esm/cldrStatus.mjs";
import * as cldrText from "../esm/cldrText.mjs";
import * as cldrUserLevels from "../esm/cldrUserLevels.mjs";

import { onMounted, ref, reactive } from "vue";

const DEBUG = false;

const VETTER_LEVEL_NUMBER = 5;

const ALL_LOCALES = "*";

// Numbers
let userId = ref(0);

// Booleans
let loading = ref(false);
let hasPermission = ref(false);
let addedNewUser = ref(false);
let canChooseOrg = ref(false);
let allLocales = ref(false);

// Strings
let newUserEmail = ref("");
let newUserLevel = ref("");
let newUserLocales = ref("");
let newUserName = ref("");
let newUserOrg = ref("");
let orgLocales = ref("");

// Arrays

// Often for arrays, reactive() seems to work better than ref(),
// but for a-select menus, ref() sometimes seems to be required.
// For documentation of a-select, see https://www.antdv.com/components/select/
let orgValueAndLabel = ref([]);
let orgOptions = ref([]);
let chosenLocales = ref([]);
let localeOptions = ref([]);

// Variables assigned with reactive() must be handled differently
// from those assigned with ref().
// For example, they are not referenced using .value
let errors = reactive([]);
let locWarnings = reactive([]);
let levelList = reactive([]);

onMounted(initializeData);

function initializeData() {
  // Numbers
  userId.value = 0;

  // Booleans
  loading.value = false;
  addedNewUser.value = false;
  canChooseOrg.value = false;
  allLocales.value = false;

  // Strings
  newUserEmail.value = "";
  newUserLevel.value = "";
  newUserLocales.value = "";
  newUserName.value = "";
  newUserOrg.value = "";
  orgLocales.value = "";

  // Arrays (see comment above about ref()/.value vs reactive())

  orgValueAndLabel.value = [];
  orgOptions.value = [];
  chosenLocales.value = [];
  localeOptions.value = [];

  errors = reactive([]);
  locWarnings = reactive([]);
  levelList = reactive([]);

  const perm = cldrStatus.getPermissions();
  hasPermission.value = !!perm?.userCanListUsers;
  if (hasPermission.value) {
    getLevelList();
    if (perm?.userIsAdmin) {
      canChooseOrg.value = true;
      newUserOrg.value = "";
      setupOrgOptions();
    } else {
      newUserOrg.value = cldrStatus.getOrganizationName();
      getOrgLocales();
    }
  }
}

function getOrgLocalesAfterChoosingOrg() {
  if (DEBUG) {
    console.log(
      "In getOrgLocalesAfterChoosingOrg, orgValueAndLabel.value = " +
        orgValueAndLabel.value
    );
    console.log(
      "In getOrgLocalesAfterChoosingOrg, typeof orgValueAndLabel = " +
        typeof orgValueAndLabel
    );
    const keys = Object.keys(orgValueAndLabel);
    console.log("orgValueAndLabel contains " + keys.length + " keys: " + keys);
  }
  // label-in-value causes the selected org to be an object { value: ..., label: ... },
  // so we need to extract the value (short name).
  // The "value" in newUserOrg.value is for Vue ref().
  // The first "value" in orgValueAndLabel.value.value is for Vue ref().
  // The second "value" in orgValueAndLabel.value.value is a key in { value: ..., label: ... }.
  newUserOrg.value = orgValueAndLabel.value.value;
  getOrgLocales();
}

async function getOrgLocales() {
  if (!newUserOrg.value) {
    console.error("No newUserOrg in getOrgLocales!");
    return;
  }
  const resource = "./api/locales/org/" + newUserOrg.value;
  await cldrAjax
    .doFetch(resource)
    .then(cldrAjax.handleFetchErrors)
    .then((r) => r.json())
    .then(setOrgLocales)
    .catch((e) => addError(`Error: ${e} getting org locales`));
}

function setOrgLocales(json) {
  if (json.err) {
    cldrRetry.handleDisconnect(json.err, json, "", "Loading org locales");
    return;
  }
  const locmap = cldrLoad.getTheLocaleMap();
  if (json.locales == ALL_LOCALES) {
    orgLocales.value = locmap.locmap.locales.join(" ");
  } else {
    orgLocales.value = json.locales;
  }
  const array = [];
  for (let localeId of orgLocales.value.split(" ")) {
    const localeName = locmap.getLocaleName(localeId);
    const item = {
      // A key other than "value" here, such as "localeIdValue", would be more descriptive,
      // but does not appear to work.
      value: localeId,
      localeDescription: localeName + " = " + localeId,
    };
    array.push(item);
  }
  localeOptions.value = array;
}

async function concatenateAndValidateLocales() {
  if (allLocales.value) {
    newUserLocales.value = ALL_LOCALES;
    return;
  }
  newUserLocales.value = chosenLocales.value.join(" ");
  const skipOrg = cldrUserLevels.canVoteInNonOrgLocales(
    newUserLevel,
    levelList
  );
  const orgForValidation = skipOrg ? "" : newUserOrg.value;
  const resource =
    "./api/locales/normalize?" +
    new URLSearchParams({
      locs: newUserLocales.value,
      org: orgForValidation,
    });
  await cldrAjax
    .doFetch(resource)
    .then(cldrAjax.handleFetchErrors)
    .then((r) => r.json())
    .then(({ messages, normalized }) => {
      if (newUserLocales != normalized) {
        // only update the warnings if the normalized value changes
        newUserLocales.value = normalized;
        if (messages) {
          if (typeof messages != "object") {
            console.log("typeof messages = " + typeof messages);
          }
          locWarnings = reactive(messages);
        }
      }
    })
    .catch((e) => addError(`Error: ${e} validating locale`));
}

function getLevelList() {
  loading.value = true;
  cldrUserLevels.getLevelList().then(loadLevelList);
}

function loadLevelList(list) {
  if (!list) {
    addError("User-level list not received from server");
    loading.value = false;
  } else {
    levelList = reactive(list);
    if (DEBUG) {
      console.log(
        "loadLevelList just got levelList; levelList[0] = " + levelList[0]
      );
    }
    areWeLoading();
  }
}

function getLocaleName(loc) {
  if (!loc) {
    return null;
  }
  return cldrLoad.getTheLocaleMap()?.getLocaleName(loc);
}

function getParenthesizedName(loc) {
  const name = getLocaleName(loc);
  if (name && name !== loc) {
    return `(${name})`;
  }
  return "";
}

function explainWarning(reason) {
  return cldrText.get(`locale_rejection_${reason}`, reason);
}

/**
 * Set up the organization menu, for Admin only (canChooseOrg)
 */
async function setupOrgOptions() {
  loading.value = true;
  const o = await cldrOrganizations.get();
  if (!o) {
    addError("Organization names not received from server");
    loading.value = false;
    return;
  }
  // o = { displayToShort, shortToDisplay, sortedDisplayNames };
  // Two maps and one array
  const array = [];
  for (let orgDisplayName of o.sortedDisplayNames) {
    const orgShortName = o.displayToShort[orgDisplayName];
    const item = {
      // The key must be "value" for the menu to work right.
      value: orgShortName,
      // The key must be "label" (not, e.g., "orgDescription") in order to use label-in-value,
      // which enables the displayed chosen value to include the display name.
      label: orgDisplayName + " = " + orgShortName,
    };
    array.push(item);
  }
  orgOptions.value = array;
  areWeLoading();
}

function areWeLoading() {
  // Note: given levelList = reactive([..., ...]), Vue does not support getting
  // levelList.length directly. Use Object.keys(levelList).length instead.

  loading.value = !(
    Object.keys(levelList).length &&
    (Object.keys(orgOptions).length || newUserOrg.value)
  );
  if (DEBUG) {
    console.log(
      "areWeLoading: loading.value = " +
        loading.value +
        "; Object.keys(levelList).length = " +
        Object.keys(levelList).length +
        "; orgOptions.length = " +
        Object.keys(orgOptions).length +
        "; newUserOrg.value = " +
        newUserOrg.value
    );
  }
}

function readyToAdd() {
  return (
    // It could make sense to require errorsExist() == false here; however, currently this
    // is not done, since some errors are detected on the back end, and the only way to
    // determine whether they are fixed is to submit with the Add button.
    newUserOrg.value &&
    newUserName.value &&
    newUserEmail.value &&
    newUserLevel.value &&
    (newUserLocales.value || allLocales.value === true)
  );
}

async function add() {
  validate();
  await concatenateAndValidateLocales();
  if (!readyToAdd()) {
    if (DEBUG) {
      console.log("Early return from add() since readyToAdd() returned false");
    }
    return;
  }
  if (errorsExist()) {
    // Errors are cleared at the start of validate(), so if errorsExist() here, they
    // were detected on the front end, not the back end.
    if (DEBUG) {
      console.log("Early return from add() since errorsExist() returned true");
    }
    return;
  }
  const postData = {
    email: newUserEmail.value,
    level: newUserLevel.value,
    locales: newUserLocales.value,
    name: newUserName.value,
    org: newUserOrg.value,
  };
  const xhrArgs = {
    url: cldrAjax.makeApiUrl("adduser", null),
    postData: postData,
    handleAs: "json",
    load: loadHandler,
    error: (err) => addError(err),
  };
  cldrAjax.sendXhr(xhrArgs);
}

function validate() {
  clearErrors();
  if (!newUserOrg.value) {
    addError("Organization required.");
  }
  if (!newUserName.value) {
    addError("Name required.");
  }
  if (!newUserEmail.value) {
    addError("E-mail required.");
  } else {
    validateEmail(newUserEmail.value);
  }
  if (!newUserLevel.value) {
    addError("Level required.");
  } else if (
    localesAreRequired() &&
    !allLocales.value &&
    !newUserLocales.value
  ) {
    addError("Locales is required for this userlevel.");
  }
}

function localesAreRequired() {
  return newUserLevel.value >= VETTER_LEVEL_NUMBER;
}

/**
 * Let the browser validate the e-mail address
 *
 * @emailAddress string value
 * @return true if the given e-mail address is valid
 *
 * Note: the Survey Tool back end may have different criteria.
 * For example (as of 2021-03), the back end requires a period, while
 * the browser may not. Also, the back end (Java) may normalize the e-mail
 * by Java trim() and toLowerCase().
 */
function validateEmail(emailAddress) {
  const message = "Valid e-mail required.";
  const el = document.createElement("input");
  el.type = "email";
  el.value = emailAddress;
  if (el.checkValidity()) {
    removeError(message);
  } else {
    addError(message);
  }
}

function loadHandler(json) {
  if (json.err) {
    addError("Error from the server: " + translateErr(json.err));
  } else if (!json.userId) {
    addError("The server did not return a user id.");
  } else {
    const n = Math.floor(Number(json.userId));
    if (String(n) !== String(json.userId) || n <= 0 || !Number.isInteger(n)) {
      addError("The server returned an invalid id: " + json.userId);
    } else {
      addedNewUser.value = true;
      userId.value = Number(json.userId);
      if (json.email) {
        newUserEmail.value = json.email; // normalized, e.g., to lower case by server
      }
    }
  }
}

function addError(message) {
  const index = errors.indexOf(message);
  if (index < 0) {
    errors.push(message);
  }
}

function removeError(message) {
  const index = errors.indexOf(message);
  if (index > -1) {
    errors.splice(index, 1);
  }
}

function clearErrors() {
  errors.length = 0;
  if (errorsExist()) {
    console.error("clearErrors failure");
  }
}

function errorsExist() {
  if (Object.keys(errors).length) {
    return true;
  }
  return false;
}

function translateErr(err) {
  const map = {
    BAD_NAME: "Missing or invalid name",
    BAD_EMAIL: "Missing or invalid e-mail",
    BAD_ORG: "Missing or invalid organization",
    BAD_LEVEL: "Missing, invalid, or forbidden user level",
    DUP_EMAIL: "A user with that e-mail already exists",
    UNKNOWN: "An unspecified error occurred",
  };
  if (!map[err]) {
    return err;
  }
  return map[err] + " [" + err + "]";
}

function manageThisUser() {
  cldrAccount.zoomUser(newUserEmail.value);
}
</script>

<style scoped>
.addUserErrors,
.locWarnings {
  font-weight: bold;
  font-size: large;
  color: red;
}

table {
  border: 1em solid #cdd;
  border-collapse: collapse;
  background-color: #cdd;
}

.adduser th {
  text-align: right;
  vertical-align: top;
  padding-bottom: 0.5em;
  padding-top: 0.5em;
}

.adduser td {
  vertical-align: top;
}

.adduser label {
  white-space: nowrap;
  vertical-align: top;
}

.adduser select {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}

.addButton {
  font-size: x-large;
  text-align: right;
}

.manageButton {
  font-size: x-large;
}
</style>
