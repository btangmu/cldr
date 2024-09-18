<script setup>
import { nextTick, ref } from "vue";

import * as cldrAddValue from "../esm/cldrAddValue.mjs";

const xpstrid = ref("");
const formIsVisible = ref(false);
const newValue = ref("");
const inputToFocus = ref(null);
const formLeft = ref(0);
const formTop = ref(0);

function setXpathStringId(id) {
  xpstrid.value = id;
}

function showModal(event) {
  // Get the coordinates of the button's top-left corner
  formLeft.value = event.clientX - event.offsetX;
  formTop.value = event.clientY - event.offsetY;
  newValue.value = "";
  formIsVisible.value = true;
  cldrAddValue.setFormIsVisible(true);
  nextTick(focusInput);
}

function focusInput() {
  if (inputToFocus.value) {
    inputToFocus.value.focus();
  }
}

function onEnglish() {
  console.log("TODO: implement onEnglish");
}

function onWinning() {
  console.log("TODO: implement onWinning");
}

function onCancel() {
  formIsVisible.value = false;
  cldrAddValue.setFormIsVisible(false);
}

function onSubmit() {
  formIsVisible.value = false;
  cldrAddValue.setFormIsVisible(false);
  if (newValue.value) {
    cldrAddValue.sendRequest(xpstrid.value, newValue.value);
  }
}

defineExpose({
  setXpathStringId,
});
</script>

<template>
  <div>
    <!-- If use a-button instead of button, positioning fails -->
    <button class="plus" type="button" @click="showModal">
      ✚
      <!-- U+271A HEAVY GREEK CROSS -->
    </button>
    <a-modal
      v-model:visible="formIsVisible"
      :footer="null"
      :style="{
        position: 'sticky',
        left: formLeft + 'px',
        top: formTop + 'px',
      }"
      @ok="onSubmit"
    >
      <header>Add a translation</header>
      <a-input
        v-model:value="newValue"
        placeholder="Add a translation"
        ref="inputToFocus"
      />
      <div class="button-container">
        <a-button @click="onEnglish">→English</a-button>
        &nbsp;
        <a-button @click="onWinning">→Winning</a-button>
        &nbsp;
        <a-button type="cancel" @click="onCancel">Cancel</a-button>
        &nbsp;
        <a-button type="primary" @click="onSubmit">Submit</a-button>
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
body {
  overflow-x: hidden;
}

.button-container {
  display: flex;
  justify-content: space-between;
  padding-top: 1em;
}

.plus {
  font-size: 118%;
  border-radius: 4px;
  padding: 6px 12px;
  color: #fff;
  background-color: #428bca;
  border: 1px solid #345578;
}
</style>
