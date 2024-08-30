/*
 * cldrGenerateVxml: for Survey Tool feature "Generate VXML". The display logic is in GenerateVxml.vue.
 */
import * as cldrAjax from "./cldrAjax.mjs";
import * as cldrStatus from "./cldrStatus.mjs";

const SECONDS_IN_MS = 1000;

const NORMAL_RETRY = 10 * SECONDS_IN_MS; // "Normal" retry: starting or about to start

const VXML_URL = "api/vxml";

// These must match the back end
class LoadingPolicy {
  static START = "START"; // start generating vxml
  static NOSTART = "NOSTART"; // continue generating vxml
  static FORCESTOP = "FORCESTOP"; // stop generating vxml
}

// These must match the back end
class Status {
  static INIT = "INIT"; // before making a request (back end does not have INIT)
  static WAITING = "WAITING"; // waiting on other users/tasks
  static PROCESSING = "PROCESSING"; // in progress
  static READY = "READY"; // finished successfully
  static STOPPED = "STOPPED"; // due to error or cancellation (LoadingPolicy.FORCESTOP)
}

class VxmlArgs {
  /**
   * Construct a new VxmlArgs object
   *
   * @param {VxmlArgs} defaultArgs -- default (latest) args, or null/undefined
   * @param {String} loadingPolicy -- START, NOSTART or FORCESTOP
   * @returns a new VxmlArgs
   */
  constructor(defaultArgs, loadingPolicy) {
    this.loadingPolicy =
      loadingPolicy || defaultArgs?.loadingPolicy || LoadingPolicy.NOSTART;
  }
}

let latestArgs = new VxmlArgs();

let canGenerate = false;

let callbackToSetData = null;

function canGenerateVxml() {
  return canGenerate;
}

function viewMounted(setData) {
  callbackToSetData = setData;
  const perm = cldrStatus.getPermissions();
  if (perm?.userIsAdmin) {
    canGenerate = true;
  }
}

function fetchStatus() {
  if (!canGenerate || "generate_vxml" !== cldrStatus.getCurrentSpecial()) {
    canGenerate = false;
  } else if (canGenerate) {
    requestVxml(new VxmlArgs(latestArgs, LoadingPolicy.NOSTART));
  }
}

function start() {
  const vxmlArgs = new VxmlArgs(null, LoadingPolicy.START);
  requestVxml(vxmlArgs);
}

function stop() {
  const vxmlArgs = new VxmlArgs(latestArgs, LoadingPolicy.FORCESTOP);
  requestVxml(vxmlArgs);
}

function requestVxml(vxmlArgs) {
  latestArgs = vxmlArgs;
  const init = cldrAjax.makePostData(vxmlArgs);
  cldrAjax
    .doFetch(VXML_URL, init)
    .then(cldrAjax.handleFetchErrors)
    .then((r) => r.json())
    .then(setVxmlData)
    .catch((error) => console.log(error));
}

function setVxmlData(data) {
  if (!callbackToSetData) {
    return;
  }
  callbackToSetData(data);
  if (data.status === Status.WAITING || data.status === Status.PROCESSING) {
    window.setTimeout(fetchStatus.bind(this), NORMAL_RETRY);
  }
}

export { Status, canGenerateVxml, start, stop, viewMounted };
