<script setup>
import { nextTick, onMounted, ref } from "vue";

import * as cldrAddValue from "../esm/cldrAddValue.mjs";

const formIsVisible = ref(false);
const newValue = ref("");
const theButton = ref(null);
const theModal = ref(null);
const inputToFocus = ref(null);
const formLeft = ref(0);
const formTop = ref(0);
let buttonRect = null;

onMounted(() => {
  nextTick(getButtonRect);
});

function showModal(event) {
  console.log("showModal: x, y = " + event.clientX + ", " + event.clientY);
  formIsVisible.value = true;
  cldrAddValue.setFormIsVisible(true);
  setModalPosition(event.clientX, event.clientY);
  nextTick(focusInput);
}

function getButtonRect() {
  if (theButton.value?.getBoundingClientRect) {
    buttonRect = theButton.value?.getBoundingClientRect();
    console.log(
      "getButtonRect: left = " + buttonRect.left + " top = " + buttonRect.top
    );
  } else {
    console.log("getButtonRect: no getBoundingClientRect");
  }
}

function setModalPosition(x, y) {
  if (!buttonRect) {
    console.log("setModalPosition: no buttonRect");
    return;
  }
  console.log(
    "setModalPosition: left = " + buttonRect.left + " top = " + buttonRect.top
  );
  console.log("setModalPosition: x = " + x + " y = " + y);
  // ideally should use the buttonRect to determine the dialog coordinates,
  // but that fails when scrollbar is used; mouse x, y works better
  formLeft.value = x;
  formTop.value = y;
  // formLeft.value = buttonRect.left;
  // formTop.value = buttonRect.top;
  console.log(
    "setModalPosition: formLeft = " +
      formLeft.value +
      " formTop = " +
      formTop.value
  );
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
    cldrAddValue.sendRequest(newValue.value);
  }
}
</script>

<template>
  <div>
    <!-- If use a-button instead of button, positioning fails -->
    <button ref="theButton" class="plus" type="primary" @click="showModal">
      ✚
    </button>
    <a-modal
      ref="theModal"
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
      <a-form-item class="formItems" name="body" has-feedback>
        <a-input
          v-model:value="newValue"
          placeholder="Add a translation"
          ref="inputToFocus"
        />
      </a-form-item>

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
  color: #fff;
  background-color: #428bca;
  background-image: none;
  font-size: 115%;
  border: 1px solid #345578;
  border-radius: 4px;
  padding: 6px 12px;
  vertical-align: middle;
  text-align: center;
}
</style>
