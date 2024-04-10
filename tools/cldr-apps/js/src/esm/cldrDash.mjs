/*
 * cldrDash: encapsulate dashboard data.
 */
import * as cldrAjax from "./cldrAjax.mjs";
import * as cldrCoverage from "./cldrCoverage.mjs";
import * as cldrNotify from "./cldrNotify.mjs";
import * as cldrProgress from "./cldrProgress.mjs";
import * as cldrStatus from "./cldrStatus.mjs";
import * as cldrSurvey from "./cldrSurvey.mjs";
import * as XLSX from "xlsx";

class DashEntry {
  /**
   * Construct a new DashEntry object
   *
   * @param {String} code the code like "long-one-nominative"
   * @param {String} xpstrid the xpath hex string id like "710b6e70773e5764"
   * @param {String} english the English value like "{0} metric pint"
   * @param {String} winning the winning value like "{0} pinte métrique"
   *
   * @returns the new DashEntry object
   */
  constructor(code, xpstrid, english, winning) {
    this.code = code;
    this.xpstrid = xpstrid;
    this.english = english;
    this.winning = winning;
    this.previousEnglish = null;
    this.comment = null;
    this.subtype = null;
    this.checked = false;
    this.cats = new Set();
  }

  setSectionPageHeader(section, page, header) {
    this.section = section; // e.g., "Units"
    this.page = page; // e.g., "Volume"
    this.header = header; // e.g., "pint-metric"
  }

  setPreviousEnglish(previousEnglish) {
    this.previousEnglish = previousEnglish; // e.g., "{0} metric pint"
  }

  setComment(comment) {
    this.comment = comment; // e.g., "&lt;missing placeholders&gt; Need at least 1 placeholder(s), but only have 0. Placeholders..."
  }

  setSubtype(subtype) {
    this.subtype = subtype; // e.g., "missingPlaceholders"
  }

  setChecked(checked) {
    this.checked = checked; // boolean; the user added a checkmark for this item
  }

  addCategory(category) {
    this.cats.add(category); // e.g., "Error", "Disputed", "English_Changed
  }
}

/**
 * An object whose keys are xpstrid (xpath hex IDs like "db7b4f2df0427e4"), and whose values are DashEntry objects
 */
let pathIndex = {};

let fetchErr = "";

let viewSetDataCallback = null;

function doFetch(callback) {
  viewSetDataCallback = callback;
  const locale = cldrStatus.getCurrentLocale();
  const level = cldrCoverage.effectiveName(locale);
  if (!locale || !level) {
    fetchErr = "Please choose a locale and a coverage level first.";
    return;
  }
  const url = `api/summary/dashboard/${locale}/${level}`;
  cldrAjax
    .doFetch(url)
    .then(cldrAjax.handleFetchErrors)
    .then((data) => data.json())
    // hide items that TC does not need
    .then((data) => {
      const { userIsTC } = cldrStatus.getPermissions();
      if (userIsTC && false /* TODO! Filter should be on back end, for efficiency */) {
        data.notifications = data.notifications.filter(
          // skip this category for TC users
          ({ category }) => category !== "Abstained"
        );
      }
      return data;
    })
    .then((data) => {
      setData(data);
    })
    .catch((err) => {
      const msg = "Error loading Dashboard data: " + err;
      console.error(msg);
      fetchErr = msg;
    });
}

function getFetchError() {
  return fetchErr;
}

/**
 * Set the data for the Dashboard, add "total" and "checked" fields, and index it.
 *
 * The json data as received from the back end is ordered by category, then by section, page, header, code, ...
 * (but those are not ordered alphabetically).
 *
 * @param data  - an object with these elements:
 *   notifications - an array of objects (locally named "catData" meaning "all the data for one category"),
 *   each having these elements:
 *     category - a string like "Error" or "English_Changed"
 *     groups - an array of objects, each having these elements:
 *       header - a string
 *       page - a string
 *       section - a string
 *       entries - an array of objects, each having these elements:
 *         code - a string
 *         english - a string
 *         old - a string (baseline value; unused?)
 *         previousEnglish - a string
 *         winning  - a string, the winning value
 *         xpstrid - a string, the xpath hex string id
 *         comment - a string
 *         subtype - a string
 *         checked - a boolean, added by makePathIndex, not in json
 *
 *   Dashboard only uses data.notifications. There are additional fields
 *   data.* used by cldrProgress for progress meters.
 *
 * @return the modified/reorganized data
 */
function setData(data) {
  cldrProgress.updateVoterCompletion(data);
  const newData = reorganizeData(data);
  viewSetDataCallback(newData);
  return newData;
}

function reorganizeData(data) {
  const newData = {};
  newData.entries = []; // array of DashEntry objects
  newData.cats = new Set();
  newData.catSize = {}; // number of entries in each category
  newData.catFirst = {}; // first entry.xpstrid in each category
  for (let catData of data.notifications) {
    const cat = catData.category;
    newData.cats.add(cat);
    newData.catSize[cat] = 0;
    for (let group of catData.groups) {
      const entries = group.entries;
      catData.total += entries.length; // TODO -- get rid of catData.total, use newData.catSize instead
      for (let e of entries) {
        createEntry(newData, cat, group, e);
      }
    }
  }
  return newData;
}

function createEntry(newData, cat, group, e) {
  newData.catSize[cat]++;
  if (!newData.catFirst[cat]) {
    newData.catFirst[cat] = e.xpstrid;
  }
  if (pathIndex[e.xpstrid]) {
    pathIndex[e.xpstrid].addCategory(cat);
  } else {
    const dashEntry = new DashEntry(e.code, e.xpstrid, e.english, e.winning);
    dashEntry.addCategory(cat);
    dashEntry.setSectionPageHeader(group.section, group.page, group.header);
    dashEntry.setPreviousEnglish(e.previousEnglish);
    dashEntry.setComment(e.comment);
    dashEntry.setSubtype(e.subtype);
    newData.entries.push(dashEntry);
    pathIndex[e.xpstrid] = dashEntry;
  }
}

/**
 * Create the index; also set checked = true/false for all entries
 *
 * @param data
 */
function makePathIndex(data) {
  pathIndex = {};
  for (let catData of data.notifications) {
    for (let group of catData.groups) {
      for (let entry of group.entries) {
        entry.checked = itemIsChecked(data, entry);
        if (!pathIndex[entry.xpstrid]) {
          pathIndex[entry.xpstrid] = {};
        } else if (pathIndex[entry.xpstrid][catData.category]) {
          console.error(
            "Duplicate in makePathIndex: " +
              entry.xpstrid +
              ", " +
              catData.category
          );
        }
        pathIndex[entry.xpstrid][catData.category] = entry;
      }
    }
  }
}

function itemIsChecked(data, entry) {
  if (!data.hidden || !data.hidden[entry.subtype]) {
    return false;
  }
  const pathValueArray = data.hidden[entry.subtype];
  return pathValueArray.some(
    (p) => p.xpstrid === entry.xpstrid && p.value === entry.winning
  );
}

/**
 * A user has voted. Update the Dashboard data and index as needed.
 *
 * Even though the json is only for one path, it may have multiple notifications,
 * with different categories such as "Warning" and "English_Changed",
 * affecting multiple Dashboard rows.
 *
 * Ensure that the data gets updated for (1) each new or modified notification,
 * and (2) each obsolete notification -- if a notification for this path occurs in
 * the (old) data but not in the (new) json, it's obsolete and must be removed.
 *
 * @param data - the Dashboard data for all paths, to be updated
 * @param json - the response to a request by cldrTable.refreshSingleRow,
 *               containing notifications for a single path
 */
function updatePath(data, json) {
  try {
    const updater = newPathUpdater(data, json);
    updater.oldCategories.forEach((category) => {
      if (updater.newCategories.includes(category)) {
        updateEntry(updater, category);
      } else {
        removeEntry(updater, category);
      }
    });
    updater.newCategories.forEach((category) => {
      if (!updater.oldCategories.includes(category)) {
        addEntry(updater, category);
      }
    });
  } catch (e) {
    cldrNotify.exception(e, "updating path for Dashboard");
  }
  return data; // for unit test
}

function newPathUpdater(data, json) {
  if (!json.xpstrid) {
    cldrNotify.error(
      "Invalid server response",
      "Missing path identifier for Dashboard"
    );
    return null;
  }
  const updater = {
    data: data,
    json: json,
    xpstrid: json.xpstrid,
    oldCategories: [],
    newCategories: [],
    group: null,
  };
  for (let catData of json.notifications) {
    updater.newCategories.push(catData.category);
  }
  updater.newCategories = updater.newCategories.sort();
  if (updater.xpstrid in pathIndex) {
    updater.oldCategories = Object.keys(pathIndex[updater.xpstrid]).sort();
  }
  return updater;
}

function updateEntry(updater, category) {
  try {
    const catData = getDataForCategory(updater.data, category);
    for (let group of catData.groups) {
      const entries = group.entries;
      for (let i in entries) {
        if (entries[i].xpstrid === updater.xpstrid) {
          const newEntry = getNewEntry(updater, category);
          pathIndex[updater.xpstrid][category] = entries[i] = newEntry;
          return;
        }
      }
    }
  } catch (e) {
    cldrNotify.exception(e, "updating dashboard entry");
  }
}

function removeEntry(updater, category) {
  try {
    const catData = getDataForCategory(updater.data, category);
    for (let group of catData.groups) {
      const entries = group.entries;
      for (let i in entries) {
        if (entries[i].xpstrid === updater.xpstrid) {
          entries.splice(i, 1);
          --catData.total;
          delete pathIndex[updater.xpstrid][category];
          return;
        }
      }
    }
  } catch (e) {
    cldrNotify.exception(e, "removing dashboard entry");
  }
}

function addEntry(updater, category) {
  try {
    const newEntry = getNewEntry(updater, category); // sets updater.group
    const catData = getDataForCategory(updater.data, category);
    const group = getMatchingGroup(catData, updater.group);
    // TODO: insert in a particular order; see https://unicode-org.atlassian.net/browse/CLDR-15202
    group.entries.push(newEntry);
    catData.total++;
    if (!(updater.xpstrid in pathIndex)) {
      pathIndex[updater.xpstrid] = {};
    }
    pathIndex[updater.xpstrid][category] = newEntry;
  } catch (e) {
    cldrNotify.exception(e, "adding dashboard entry");
  }
}

function getNewEntry(updater, category) {
  for (let catData of updater.json.notifications) {
    if (catData.category === category) {
      for (let group of catData.groups) {
        for (let entry of group.entries) {
          if (entry.xpstrid === updater.xpstrid) {
            updater.group = group;
            entry.checked = itemIsChecked(updater.data, entry);
            return entry;
          }
        }
      }
    }
  }
  throw new Error("New entry not found");
}

function getMatchingGroup(catData, groupToMatch) {
  if (!groupToMatch) {
    throw new Error("Matching dashboard group not found");
  }
  for (let group of catData.groups) {
    if (groupsMatch(group, groupToMatch)) {
      return group;
    }
  }
  const newGroup = cloneGroup(groupToMatch);
  // TODO: insert in a particular order; see https://unicode-org.atlassian.net/browse/CLDR-15202
  catData.groups.push(newGroup);
  return newGroup;
}

function groupsMatch(groupA, groupB) {
  return (
    groupA.header === groupB.header &&
    groupA.page === groupB.page &&
    groupA.section === groupB.section
  );
}

function cloneGroup(group) {
  const newGroup = {
    header: group.header,
    page: group.page,
    section: group.section,
    entries: [],
  };
  return newGroup;
}

function getDataForCategory(data, category) {
  for (let catData of data.notifications) {
    if (catData.category === category) {
      return catData;
    }
  }
  const newCatData = {
    category: category,
    total: 0,
    groups: [],
  };
  // TODO: insert in a particular order; see https://unicode-org.atlassian.net/browse/CLDR-15202
  data.notifications.push(newCatData);
  return newCatData;
}

/**
 * Save the checkbox setting to the back end database for locale+xpstrid+value+subtype,
 * as a preference of the currrent user
 *
 * @param checked - boolean, currently unused since back end toggles existing preference
 * @param entry - the entry
 * @param locale - the locale string such as "am" for Amharic
 */
function saveEntryCheckmark(checked, entry, locale) {
  const url = getCheckmarkUrl(entry, locale);
  cldrAjax.doFetch(url).catch((err) => {
    console.error("Error setting dashboard checkmark preference: " + err);
  });
}

function getCheckmarkUrl(entry, locale) {
  const p = new URLSearchParams();
  p.append("what", "dash_hide"); // cf. WHAT_DASH_HIDE in SurveyAjax.java
  p.append("xpstrid", entry.xpstrid);
  p.append("value", entry.winning);
  p.append("subtype", entry.subtype);
  p.append("locale", locale);
  p.append("s", cldrStatus.getSessionId());
  p.append("cacheKill", cldrSurvey.cacheBuster());
  return cldrAjax.makeUrl(p);
}

/**
 *
 * @param {Object} data processed data to download
 * @param {String} locale locale id
 * @param {Function} cb takes one argument 'status': if falsy, done. otherwise, string value
 */
async function downloadXlsx(data, locale, cb) {
  const xpathMap = cldrSurvey.getXpathMap();
  const { coverageLevel, notifications } = data;

  // Fetch all XPaths in parallel since it'll take a while
  cb(`Loading…`);
  const allXpaths = [];
  for (const { groups } of notifications) {
    for (const { section, entries } of groups) {
      if (section === "Reports") {
        continue; // skip this
      }
      for (const { xpstrid } of entries) {
        allXpaths.push(xpstrid);
      }
    }
  }
  await Promise.all(allXpaths.map((x) => xpathMap.get(x)));
  cb(`Calculating…`);

  // Now we can expect that xpathMap can return immediately.

  const ws_data = [
    [
      "Category",
      "Header",
      "Page",
      "Section",
      "Code",
      "English",
      "Old",
      "Subtype",
      "Winning",
      "Xpstr", // hex - to hide
      "XPath", // fetched
      "URL", // formula
    ],
  ];

  for (const { category, groups } of notifications) {
    for (const { header, page, section, entries } of groups) {
      for (const { code, english, old, subtype, winning, xpstrid } of entries) {
        const xpath =
          section === "Reports" ? "-" : (await xpathMap.get(xpstrid)).path;
        ws_data.push([
          category,
          header,
          page,
          section,
          code,
          english,
          old,
          subtype,
          winning,
          xpstrid,
          xpath,
          `https://st.unicode.org/cldr-apps/v#/${locale}/${page}/${xpstrid}`,
        ]);
      }
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  // cldrXlsx.pushComment(ws, "C1", `As of ${new Date().toISOString()}`);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    ws,
    `${locale}.${coverageLevel.toLowerCase()}`
  );
  cb(`Writing…`);
  XLSX.writeFile(wb, `Dash_${locale}_${coverageLevel.toLowerCase()}.xlsx`);
  cb(null);
}

export {
  DashEntry,
  doFetch,
  getFetchError,
  saveEntryCheckmark,
  setData,
  updatePath,
  downloadXlsx,
};
