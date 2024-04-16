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

class DashData {
  /**
   * Construct a new DashData object
   *
   * @returns the new DashData object
   */
  constructor() {
    this.entries = []; // array of DashEntry objects
    this.cats = new Set();
    this.catSize = {}; // number of entries in each category
    this.catFirst = {}; // first entry.xpstrid in each category
    // An object whose keys are xpstrid (xpath hex IDs like "db7b4f2df0427e4"), and whose values are DashEntry objects
    this.pathIndex = {};
    this.hiddenArray = null;
  }

  addCategory(cat) {
    if (!this.cats.has(cat)) {
      this.cats.add(cat);
      this.catSize[cat] = 0;
    }
  }

  /**
   * Create a new DashEntry in this DashData, or update the existing entry if already present based on e.xpstrid
   *
   * @param {String} cat the category such as "Error"
   * @param {Object} group (from json)
   * @param {Object} e (entry in old format, from json)
   */
  createEntry(cat, group, e) {
    this.catSize[cat]++;
    if (!this.catFirst[cat]) {
      this.catFirst[cat] = e.xpstrid;
    }
    if (this.pathIndex[e.xpstrid]) {
      this.pathIndex[e.xpstrid].addCategory(cat);
    } else {
      const dashEntry = new DashEntry(e.code, e.xpstrid, e.english, e.winning);
      dashEntry.addCategory(cat);
      dashEntry.setSectionPageHeader(group.section, group.page, group.header);
      dashEntry.setPreviousEnglish(e.previousEnglish);
      dashEntry.setComment(e.comment);
      dashEntry.setSubtype(e.subtype);
      dashEntry.setChecked(this.itemIsChecked(e));
      this.entries.push(dashEntry);
      this.pathIndex[e.xpstrid] = dashEntry;
    }
  }

  setHidden(hiddenArray) {
    this.hiddenArray = hiddenArray;
  }

  itemIsChecked(e) {
    if (!this.hiddenArray[e.subtype]) {
      return false;
    }
    const pathValueArray = this.hiddenArray[e.subtype];
    return pathValueArray.some(
      (p) => p.xpstrid === e.xpstrid && p.value === e.winning
    );
  }
}

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

let fetchErr = "";

let viewSetDataCallback = null;

function doFetch(callback) {
  viewSetDataCallback = callback;
  fetchErr = "";
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
 * Set the data for the Dashboard, converting from json to a DashData object
 *
 * The json data as received from the back end is ordered by category, then by section, page, header, code, ...
 * (but those are not ordered alphabetically).
 *
 * @param jsonData  - an object with these elements:
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
 * @return the modified/reorganized data as a DashData object
 */
function setData(jsonData) {
  cldrProgress.updateVoterCompletion(jsonData);
  const newData = convertData(jsonData);
  viewSetDataCallback(newData);
  return newData;
}

function convertData(jsonData) {
  const newData = new DashData();
  newData.setHidden(jsonData.hidden);
  for (let catData of jsonData.notifications) {
    const cat = catData.category;
    newData.addCategory(cat);
    for (let group of catData.groups) {
      const entries = group.entries;
      for (let e of entries) {
        newData.createEntry(cat, group, e);
      }
    }
  }
  return newData;
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
 * @param dashData - the DashData (new format) for all paths, to be updated
 * @param json - the response to a request by cldrTable.refreshSingleRow,
 *               containing notifications for a single path (old format)
 */
function updatePath(dashData, json) {
  try {
    const updater = newPathUpdater(dashData, json);
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

function newPathUpdater(dashData, json) {
  if (!json.xpstrid) {
    cldrNotify.error(
      "Invalid server response",
      "Missing path identifier for Dashboard"
    );
    return null;
  }
  const updater = {
    data: dashData,
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
  if (updater.xpstrid in dashData.pathIndex) {
    updater.oldCategories = Object.keys(
      dashData.pathIndex[updater.xpstrid]
    ).sort();
  }
  return updater;
}

function updateEntry(updater, category) {
  const dashData = updater.data;
  try {
    const dashEntry = dashData.pathIndex[updater.xpstrid];
    if (dashEntry) {
      dashEntry.addCategory(category);
      // TODO: update other attributes of dashEntry, such as error messages...?
    }
  } catch (e) {
    cldrNotify.exception(e, "updating dashboard entry");
  }
}

function removeEntry(updater, category) {
  const dashData = updater.data;
  try {
    const dashEntry = dashData.pathIndex[updater.xpstrid];
    if (dashEntry?.cats.delete(category)) {
      if (!dashEntry.cats.size) {
        const index = dashData.entries.indexOf(dashEntry);
        dashData.splice(index, 1);
        delete dashData.pathIndex[updater.xpstrid];
      }
      dashData.catSize[category]--;
    }
  } catch (e) {
    cldrNotify.exception(e, "removing dashboard entry");
  }
}

function addEntry(updater, category) {
  const dashData = updater.data;
  try {
    const dashEntry = dashData.pathIndex[updater.xpstrid];
    if (dashEntry) {
      updateEntry(updater, category);
    } else {
      const e = getNewEntry(updater, category);
      // TODO: insert in a particular order; see https://unicode-org.atlassian.net/browse/CLDR-15202
      dashData.createEntry(category, updater.group, e);
    }
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
            // entry.checked = itemIsChecked(updater.data, entry);
            return entry;
          }
        }
      }
    }
  }
  throw new Error("New entry not found");
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
 * Download as XLSX spreadsheet
 *
 * @param {Object} data processed data to download
 * @param {String} locale locale id
 * @param {Function} cb takes one argument 'status': if falsy, done. otherwise, string value
 */
async function downloadXlsx(data, locale, cb) {
  const xpathMap = cldrSurvey.getXpathMap();
  const { coverageLevel, entries } = data;

  // Fetch all XPaths in parallel since it'll take a while
  cb(`Loading…`);
  const allXpaths = [];
  for (let dashEntry of entries) {
    if (dashEntry.section === "Reports") {
      continue; // skip this
    }
    allXpaths.push(dashEntry.xpstrid);
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

  for (let dashEntry of entries) {
    const xpath =
      section === "Reports" ? "-" : (await xpathMap.get(xpstrid)).path;
    ws_data.push([
      dashEntry.cat,
      dashEntry.header,
      dashEntry.page,
      dashEntry.section,
      dashEntry.code,
      dashEntry.english,
      dashEntry.old,
      dashEntry.subtype,
      dashEntry.winning,
      dashEntry.xpstrid,
      dashEntry.xpath,
      `https://st.unicode.org/cldr-apps/v#/${dashEntry.locale}/${dashEntry.page}/${dashEntry.xpstrid}`,
    ]);
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
