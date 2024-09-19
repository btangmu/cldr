<script setup>
import { ref } from "vue";

const message = ref("");
const description = ref("");
const formIsVisible = ref(false);

function openWithMessageAndDescription(m, d) {
  message.value = m;
  description.value = d; // possibly HTML
  formIsVisible.value = true;
}

function onClose() {
  formIsVisible.value = false;
  message.value = description.value = "";
}

defineExpose({
  openWithMessageAndDescription,
});
</script>
<template>
  <div>
    <a-modal
      :visible="formIsVisible"
      :footer="null"
      @ok="onClose"
      :title="message"
      style="top: 20px; right: 10px; position: absolute"
    >
      <div v-html="description"></div>
      <div class="button-container">
        <a-button type="primary" @click="onClose">Close</a-button>
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
.button-container {
  display: flex;
  justify-content: right;
}
</style>
