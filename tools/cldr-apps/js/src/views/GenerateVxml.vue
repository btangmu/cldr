<script setup>
import { onMounted, ref } from "vue";

import * as cldrGenerateVxml from "../esm/cldrGenerateVxml.mjs";

let hasPermission = ref(false);
let errMessage = ref("");
let message = ref("");
let output = ref("");
let status = ref("READY");

function created() {
  cldrGenerateVxml.viewCreated(setData);
  // hasPermission = Boolean(cldrGenerateVxml.canGenerateVxml());
  hasPermission.value = Boolean(cldrGenerateVxml.canGenerateVxml());
  console.log(
    "In GenerateVxml created, hasPermission = " +
      hasPermission +
      " and typeof(hasPermission) = " +
      typeof hasPermission
  );
}

// onActivated, onBeforeMount? no such thing as onCreated
onMounted(created);

function start() {
  if (hasPermission) {
    cldrGenerateVxml.start();
    status = "WAITING";
  }
}

function stop() {
  cldrGenerateVxml.stop();
  status = "READY";
}

function canStop() {
  return status === "WAITING" || status === "PROCESSING";
}

function setData(data) {
  message = data.message;
  percent = data.percent;
  if (data.status) {
    status = data.status;
  }
  if (data.output) {
    output = data.output;
    status = "READY";
  }
}

defineExpose({
  setData,
});
</script>

<template>
  <div v-if="!hasPermission">
    Please log in as Admin to use this feature. hasPermission:
    {{ hasPermission }} hasPermission.value: {{ hasPermission.value }}
  </div>
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
  <div v-if="errMessage">
    {{ errMessage }}
  </div>
  <span v-html="output"></span>
</template>

<style scoped>
button,
select {
  margin-top: 1ex;
}
</style>
