<script setup>
import { onMounted, ref } from "vue";

import * as cldrGenerateVxml from "../esm/cldrGenerateVxml.mjs";

let hasPermission = ref(false);
let message = ref("");
let output = ref("");
let status = ref("READY");
let percent = ref(0);

function mounted() {
  cldrGenerateVxml.viewMounted(setData);
  hasPermission.value = Boolean(cldrGenerateVxml.canGenerateVxml());
}

onMounted(mounted);

function start() {
  if (hasPermission) {
    cldrGenerateVxml.start();
    status.value = "WAITING";
  }
}

function stop() {
  cldrGenerateVxml.stop();
  status.value = "READY";
}

function canStop() {
  return status.value === "WAITING" || status.value === "PROCESSING";
}

function setData(data) {
  message.value = data.message;
  percent.value = data.percent;
  if (data.status) {
    status.value = data.status;
  }
  if (data.output) {
    output.value = data.output;
    status.value = "READY";
  }
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
      <button v-else title="Really Generate VXML" @click="start()">
        Generate VXML Now
      </button>
    </p>
  </div>
  <div v-if="percent" class="progressPercent">
    <a-progress :percent="percent" />
  </div>
  <span v-html="output"></span>
</template>

<style scoped>
/* button,
select {
  margin-top: 1ex;
} */

.progressPercent div {
  /* margin: 3ex; */
  width: 90%;
}
</style>
