<script setup>
import { onMounted, ref } from "vue";

import * as cldrGenerateVxml from "../esm/cldrGenerateVxml.mjs";

// These must match the back end (VxmlQueue.Status)
const STATUS_WAITING = "WAITING";
const STATUS_READY = "READY";
const STATUS_PROCESSING = "PROCESSING";
const STATUS_STOPPED = "STOPPED";

let hasPermission = ref(false);
let message = ref("");
let output = ref("");
let status = ref(STATUS_READY);
let percent = ref(0);

function mounted() {
  cldrGenerateVxml.viewMounted(setData);
  hasPermission.value = Boolean(cldrGenerateVxml.canGenerateVxml());
}

onMounted(mounted);

function start() {
  if (hasPermission) {
    cldrGenerateVxml.start();
    status.value = STATUS_WAITING;
  }
}

function stop() {
  cldrGenerateVxml.stop();
  status.value = STATUS_STOPPED;
}

function canStop() {
  return status.value === STATUS_WAITING || status.value === STATUS_PROCESSING;
}

function setData(data) {
  message.value = data.message;
  percent.value = data.percent;
  status.value = data.status;
  output.value = data.output;
}

defineExpose({
  setData,
});
</script>

<template>
  <div v-if="!hasPermission">Please log in as Admin to use this feature.</div>
  <div v-else>
    <p v-if="status">Current Status: {{ status }}</p>
    <p v-if="message">
      <span v-html="message"></span>
    </p>
    <hr />
    <p>
      <button v-if="canStop()" @click="stop()">Stop</button>
      <button v-else @click="start()">Generate VXML Now</button>
    </p>
  </div>
  <div v-if="percent" class="progressPercent">
    <a-progress :percent="percent" />
  </div>
  <span v-html="output"></span>
</template>

<style scoped>
.progressPercent div {
  width: 80%;
}
</style>
