/*
 * cldrAnnouncement: for Survey Tool announcements.
 * The display logic is in AnnouncementPanel.vue.
 */
import * as cldrAjax from "./cldrAjax.mjs";
import * as cldrStatus from "./cldrStatus.mjs";

const USE_TEST_DATA = false; // testing only, bypass back end
const TEST_DATA = {
  announcements: [
    {
      poster: "front-end@example.com",
      date: "2023-01-17 12:30:03.0",
      subject: "Hello!",
      body: "<p>This is a test including some html.<p>Paragraph.<p><i>Italic.</i> <b>Bold.</b> <a href='https://unicode.org'>Link to unicode.org</a>",
      checked: false,
    },
    {
      poster: "example@unicode.org",
      date: "2022-12-31 12:30:03.0",
      subject: "Greetings!",
      body: "This is a test 👀 and it's generated on the front end",
      checked: true,
    },
  ],
};

async function refresh(viewCallbackSetData) {
  if (!cldrStatus.getSurveyUser()) {
    viewCallbackSetData(null);
    return;
  }
  if (USE_TEST_DATA) {
    window.setTimeout(function () {
      viewCallbackSetData(TEST_DATA);
    }, 2000);
    return;
  }
  const url = cldrAjax.makeApiUrl("announce", null);
  return await cldrAjax
    .doFetch(url)
    .then(cldrAjax.handleFetchErrors)
    .then((r) => r.json())
    .then(viewCallbackSetData)
    .catch((e) => console.error(e));
}

function canAnnounce() {
  return cldrStatus.getPermissions()?.userIsManager || false;
}

function canDoAllOrgs() {
  return cldrStatus.getPermissions()?.userIsTC || false;
}

async function announce(formState, viewCallbackComposeResult) {
  for (let key of Object.keys(formState)) {
    const val = formState[key];
    console.log(key + ": " + val);
  }
  const init = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(formState),
  };
  const url = cldrAjax.makeApiUrl("announce", null);
  return await cldrAjax
    .doFetch(url, init)
    .then(cldrAjax.handleFetchErrors)
    .then((r) => r.json())
    .then(viewCallbackComposeResult)
    .catch((e) => console.error(e));
}

function saveCheckmark(checked, announcement) {
  console.log(
    "TODO: implement saveCheckmark " + checked + " " + announcement.date
  );
}

export { announce, canAnnounce, canDoAllOrgs, refresh, saveCheckmark };
