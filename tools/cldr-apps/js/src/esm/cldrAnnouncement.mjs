/*
 * cldrAnnouncements: for Survey Tool announcements.
 * The display logic is in AnnouncementPanel.vue.
 */
import * as cldrAjax from "./cldrAjax.mjs";
import * as cldrStatus from "./cldrStatus.mjs";

const bogusData = {
  announcements: [
    {
      poster: "foo@example.com",
      date: "2023-01-17 12:30:03.0",
      subject: "Hello!",
      body: "<p>This is a test including some html.<p>Paragraph.<p><i>Italic.</i> <b>Bold.</b> <a href='https://unicode.org'>Link to unicode.org</a>",
      checked: false,
    },
    {
      poster: "example@unicode.org",
      date: "2022-12-31 12:30:03.0",
      subject: "Greetings!",
      body: "This is a test 👀",
      checked: true,
    },
  ],
};

async function refresh(viewCallbackSetData) {
  if (!cldrStatus.getSurveyUser()) {
    viewCallbackSetData(null);
    return;
  }
  if (true) {
    window.setTimeout(function () {
      viewCallbackSetData(bogusData);
    }, 2000);
    return;
  }
  let localeId = cldrStatus.getCurrentLocale();
  if (!localeId) {
    localeId = "*";
  }
  // in general, we'll specify a SET of locale ids (possibly empty or "*", both meaning "all locales" == "not locale-specific")
  const url = cldrAjax.makeApiUrl("announcements/" + localeId + "/", null);
  return await cldrAjax
    .doFetch(url)
    .then(cldrAjax.handleFetchErrors)
    .then((r) => r.json())
    .then(viewCallbackSetData)
    .catch((e) => console.error(e));
}

function saveEntryCheckmark(checked, announcement) {
  console.log(
    "TODO: implement saveEntryCheckmark " + checked + " " + announcement.date
  );
}

export { refresh, saveEntryCheckmark };
