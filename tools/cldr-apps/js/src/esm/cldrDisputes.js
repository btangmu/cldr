/*
 * cldrDisputes: for Survey Tool, report Disputes in the same locale in the same org
 * The display logic is in OrgLocaleDisputes.vue.
 */
import * as cldrAjax from "./cldrAjax.js";
import * as cldrStatus from "./cldrStatus.js";
import * as XLSX from "xlsx";

const DISPUTES_URL = "api/disputes";
const SPREADSHEET_NAME = "disputes.xlsx";
const HEADER_ROW = ["Organization", "Locale", "Path"];

let canSeeDisputes = false;

let callbackToSetData = null;
let callbackWhenSaveFinished = null;

/**
 * Called as special.load
 */
function load() {
  // nothing to do here
}

function viewCreated(setData) {
  callbackToSetData = setData;
  const perm = cldrStatus.getPermissions();
  canSeeDisputes = perm?.userCanSeeDisputes || false;
  if (!canSeeDisputes) {
    return;
  }
  cldrAjax
    .doFetch(DISPUTES_URL)
    .then(cldrAjax.handleFetchErrors)
    .then((r) => r.json())
    .then(callbackToSetData)
    .catch((error) => console.log(error));
}

function saveAsSpreadsheet(disputes, callbackWhenSaveFinished) {
  saveSheet(disputes).then(
    () => {
      callbackWhenSaveFinished();
    },
    (err) => {
      console.error(err);
      callbackWhenSaveFinished();
    }
  );
}

async function saveSheet(disputes) {
  const wb = XLSX.utils.book_new();
  const ws_data = [];
  ws_data.push(HEADER_ROW);
  for (let dispute of disputes) {
    ws_data.push([dispute.org, dispute.locale, dispute.xpath]);
  }
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  XLSX.utils.book_append_sheet(wb, ws);
  XLSX.writeFile(wb, SPREADSHEET_NAME);
}

export { load, saveAsSpreadsheet, viewCreated };
