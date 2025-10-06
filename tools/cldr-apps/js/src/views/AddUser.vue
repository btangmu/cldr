<template>
  <article>
    <a-spin v-if="loading" :delay="500" />
    <div v-if="errors.length">
      <span class="addUserErrors">Please correct the following error(s):</span>
      <ul>
        <li v-for="error in errors" :key="error">{{ error }}</li>
      </ul>
    </div>
    <div v-if="!loading && !addedNewUser" class="adduser">
      <h2>Add User</h2>
      <table>
        <tr>
          <th><label for="new_name">Name:</label></th>
          <td>
            <input
              size="40"
              id="new_name"
              name="new_name"
              v-model="newUserName"
            />
          </td>
        </tr>
        <tr>
          <th><label for="new_email">E-mail:</label></th>
          <td>
            <input
              size="40"
              id="new_email"
              name="new_email"
              v-model="newUserEmail"
              type="email"
            />
          </td>
        </tr>
        <tr>
          <th><label for="new_org">Organization:</label></th>
          <td v-if="canChooseOrg">
            <select id="new_org" name="new_org" v-model="newUserOrg">
              <option disabled value="">Please select one</option>
              <option
                v-for="displayName of orgs.sortedDisplayNames"
                v-bind:value="orgs.displayToShort[displayName]"
                :key="displayName"
              >
                {{ displayName }}
              </option>
            </select>
          </td>
          <td v-else>
            <input id="new_org" disabled="disabled" v-model="newUserOrg" />
          </td>
        </tr>
        <tr>
          <th><label for="new_level">User level:</label></th>
          <td>
            <select id="new_level" name="new_level" v-model="newUserLevel">
              <option disabled value="">Please select one</option>
              <option
                v-for="(v, number) in levelList"
                v-bind:value="number"
                :disabled="!v.canCreateOrSetLevelTo"
                :key="number"
              >
                {{ v.string }}
              </option>
            </select>
          </td>
        </tr>
        <tr v-if="newUserLevel && newUserLevel >= 5">
          <th><label for="new_locales">Languages responsible:</label></th>
          <td>
            <a-select
              v-model:value="value"
              mode="multiple"
              style="width: 100%"
              placeholder="select locale(s)"
              :options="localeOptions"
            >
              <!-- this appears in the menu -->
              <template #option="{ value: val, label, icon }">
                <span role="img" :aria-label="val">X {{ icon }}</span>
                &nbsp;&nbsp;A {{ label }}
              </template>
              <!-- this appears in the input box (after choosing from menu) -->
              <template
                #tagRender="{ value: val, label, closable, onClose, option }"
              >
                <a-tag
                  :closable="closable"
                  style="margin-right: 3px"
                  @close="onClose"
                >
                  B {{ label }}&nbsp;&nbsp;
                  <span role="img" :aria-label="val">Y {{ option.icon }}</span>
                </a-tag>
              </template>
            </a-select>
            <input
              id="new_locales"
              name="new_locales"
              v-model="newUserLocales"
              @change="validateLocales"
              placeholder="en de de_CH fr zh_Hant"
            />
            &nbsp;
            <button v-on:click="setAllLocales()">All Locales</button><br />
            (Space separated. Use the All Locales button to grant access to all
            locales. )<br />

            <div v-if="locWarnings">
              <span class="locWarnings"
                >The following locales will not be added due to problems:</span
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
        <tr v-else>
          newUserLevel not yet
        </tr>
        <tr class="addButton">
          <td colspan="2">
            <button
              v-if="newUserName && newUserEmail && newUserOrg && newUserLevel"
              v-on:click="add()"
            >
              Add
            </button>
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
  <p>orgLocales = {{ orgLocales }}</p>
</template>

<script setup>
import * as cldrAccount from "../esm/cldrAccount.mjs";
import * as cldrAjax from "../esm/cldrAjax.mjs";
import * as cldrLoad from "../esm/cldrLoad.mjs";
import * as cldrOrganizations from "../esm/cldrOrganizations.mjs";
import * as cldrStatus from "../esm/cldrStatus.mjs";
import * as cldrText from "../esm/cldrText.mjs";
import * as cldrUserLevels from "../esm/cldrUserLevels.mjs";

import { onMounted, ref, reactive, watch } from "vue";

const value = ref([]);
const options = ref([
  {
    value: "china",
    label: "China (中国)",
    icon: "🇨🇳",
  },
  {
    value: "usa",
    label: "USA (美国)",
    icon: "🇺🇸",
  },
  {
    value: "japan",
    label: "Japan (日本)",
    icon: "🇯🇵",
  },
  {
    value: "korea",
    label: "Korea (韩国)",
    icon: "🇨🇰",
  },
]);
watch(value, (val) => {
  console.log(`selected:`, val);
});

let addedNewUser = ref(false);
let canChooseOrg = ref(false);
let errors = [];

let locWarnings = null;
let levelList = null;
let loading = ref(false);
let newUserEmail = ref("");
let newUserLevel = ref("");
let newUserLocales = ref("");
let newUserName = ref("");
let newUserOrg = ref("");
let orgLocales = ref("");
let orgs = null;
let userId = null;
let localeOptions = ref([]);

function mounted() {
  initializeData();
}

onMounted(mounted);

function initializeData() {
  addedNewUser.value = false;
  errors = [];
  locWarnings = null;
  newUserEmail.value = "";
  newUserLevel.value = "";
  newUserLocales.value = "";
  newUserName.value = "";
  userId = null;
  getLevelList();
  if (cldrStatus.getPermissions()?.userIsAdmin) {
    canChooseOrg.value = true;
    newUserOrg.value = "";
    getOrgs();
  } else {
    canChooseOrg.value = false;
    newUserOrg.value = cldrStatus.getOrganizationName();
    orgs = null;
  }
  getOrgLocales();
}

async function getOrgLocales() {
  await cldrAjax
    .doFetch("./api/locales/org/" + newUserOrg.value)
    .then(cldrAjax.handleFetchErrors)
    .then((r) => r.json())
    .then(setOrgLocales)
    .catch((e) => errors.push(`Error: ${e} getting org locales`));
}

function setOrgLocales(json) {
  if (json.err) {
    cldrRetry.handleDisconnect(json.err, json, "", "Loading org locales");
  } else {
    if ("*" == json.locales) {
      orgLocales.value = "aa fr zh"; // TODO
    } else {
      orgLocales.value = json.locales;
    }
    setupLocaleOptions();
  }
}

function setupLocaleOptions() {
  const locmap = cldrLoad.getTheLocaleMap();
  let array = [];
  for (let localeId of orgLocales.value.split(" ")) {
    const localeName = locmap.getRegionAndOrVariantName(localeId);
    const item = {
      value: localeId,
      label: localeName + " (" + localeId + ")",
      icon: "😈",
    };
    array.push(item);
  }
  localeOptions = ref(array);
}

async function validateLocales() {
  const skipOrg = cldrUserLevels.canVoteInNonOrgLocales(
    newUserLevel,
    levelList
  );
  const orgForValidation = skipOrg ? "" : newUserOrg;
  await cldrAjax
    .doFetch(
      "./api/locales/normalize?" +
        new URLSearchParams({
          locs: newUserLocales,
          org: orgForValidation,
        })
    )
    .then(cldrAjax.handleFetchErrors)
    .then((r) => r.json())
    .then(({ messages, normalized }) => {
      if (newUserLocales != normalized) {
        // only update the warnings if the normalized value changes
        newUserLocales.value = normalized;
        locWarnings = messages;
      }
    })
    .catch((e) => errors.push(`Error: ${e} validating locale`));
}

function getLevelList() {
  loading.value = true;
  cldrUserLevels.getLevelList().then(loadLevelList);
}

function loadLevelList(list) {
  if (!list) {
    errors.push("User-level list not received from server");
    loading.value = false;
  } else {
    levelList = reactive(list);
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

function getOrgs() {
  loading.value = true;
  cldrOrganizations.get().then(loadOrgs);
}

function loadOrgs(o) {
  if (o) {
    orgs.value = o;
    areWeLoading();
  } else {
    errors.push("Organization names not received from server");
    loading.value = false;
  }
}

function areWeLoading() {
  loading.value = !(levelList && (orgs || newUserOrg));
}

async function add() {
  validate();
  await validateLocales();
  if (errors.length) {
    return;
  }
  const postData = {
    email: newUserEmail,
    level: newUserLevel,
    locales: newUserLocales,
    name: newUserName,
    org: newUserOrg,
  };
  const xhrArgs = {
    url: cldrAjax.makeApiUrl("adduser", null),
    postData: postData,
    handleAs: "json",
    load: loadHandler,
    error: (err) => errors.push(err),
  };
  cldrAjax.sendXhr(xhrArgs);
}

function validate() {
  errors = [];
  if (!newUserName) {
    errors.push("Name required.");
  }
  if (!newUserEmail) {
    errors.push("E-mail required.");
  } else if (!validateEmail(newUserEmail)) {
    errors.push("Valid e-mail required.");
  }
  if (!newUserOrg) {
    errors.push("Organization required.");
  }
  if (!newUserLevel) {
    errors.push("Level required.");
  } else if (newUserLevel >= 5 && !newUserLocales) {
    errors.push("Languages responsible is required for this userlevel.");
  }
}

/**
 * Let the browser validate the e-mail address
 *
 * @return true if the given e-mail address is valid
 *
 * Note: the Survey Tool back end may have different criteria.
 * For example (as of 2021-03), the back end requires a period, while
 * the browser may not. Also, the back end (Java) may normalize the e-mail
 * by Java trim() and toLowerCase().
 */
function validateEmail(emailAddress) {
  const el = document.createElement("input");
  el.type = "email";
  el.value = emailAddress;
  return el.checkValidity();
}

function loadHandler(json) {
  if (json.err) {
    errors.push("Error from the server: " + translateErr(json.err));
  } else if (!json.userId) {
    errors.push("The server did not return a user id.");
  } else {
    const n = Math.floor(Number(json.userId));
    if (String(n) !== String(json.userId) || n <= 0 || !Number.isInteger(n)) {
      errors.push("The server returned an invalid id: " + json.userId);
    } else {
      addedNewUser = true;
      userId = Number(json.userId);
      if (json.email) {
        newUserEmail.value = json.email; // normalized, e.g., to lower case by server
      }
    }
  }
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

function setAllLocales() {
  newUserLocales = "*";
  return false;
}

function manageThisUser() {
  cldrAccount.zoomUser(newUserEmail);
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
